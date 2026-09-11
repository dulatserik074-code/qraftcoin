import { existsSync } from "node:fs";
import { PrismaClient } from "@prisma/client";
if (existsSync(".env")) process.loadEnvFile(".env");
const db = new PrismaClient();
try {
  const now = new Date();
  const [sessions, rateLimits, resets] = await db.$transaction([db.session.deleteMany({ where: { expiresAt: { lt: now } } }), db.rateLimit.deleteMany({ where: { expiresAt: { lt: now } } }), db.passwordReset.deleteMany({ where: { expiresAt: { lt: now } } })]);
  console.log(`Expired sessions removed: ${sessions.count}; expired rate-limit buckets: ${rateLimits.count}. Expired reset tokens: ${resets.count}. Loyalty records are untouched.`);
} finally { await db.$disconnect(); }
