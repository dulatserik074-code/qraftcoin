import "server-only";
import { createHmac } from "node:crypto";
import { db } from "./db";
import { getServerEnv } from "./env";
import { AppError } from "./input";
import { getTrustedClientIp } from "./clientIp";
export const authLimits = {
  login: { ip: 60, account: 10, windowMs: 5 * 60000 },
  register: { ip: 20, windowMs: 15 * 60000 },
  "forgot-password": { ip: 30, account: 5, windowMs: 15 * 60000 },
  "reset-password": { ip: 30, windowMs: 15 * 60000 },
  "invitation-accept": { ip: 30, windowMs: 15 * 60000 },
} as const;
export class RateLimitError extends AppError {
  constructor(public retryAfter: number) { super(429, "Too many attempts. Please try again later."); }
}
export async function limitAuth(key: string, limit = 10, windowMs = 15 * 60000) {
  const now = Date.now(), bucket = Math.floor(now / windowMs), end = (bucket + 1) * windowMs;
  const hash = createHmac("sha256", getServerEnv().rateLimitSecret).update(key + ":" + windowMs + ":" + bucket).digest("hex");
  // PostgreSQL atomic upsert coordinates all serverless instances. Only HMAC persists.
  const record = await db.rateLimit.upsert({ where: { key: hash }, create: { key: hash, count: 1, expiresAt: new Date(end) }, update: { count: { increment: 1 } } });
  if (record.count > limit) throw new RateLimitError(Math.max(1, Math.ceil((end - now) / 1000)));
}
export async function limitAuthIp(request: Pick<Request, "headers">, action: keyof typeof authLimits) {
  const policy = authLimits[action];
  await limitAuth("ip:" + action + ":" + getTrustedClientIp(request), policy.ip, policy.windowMs);
}
