import bcrypt from "bcryptjs";
import { createHmac, randomBytes } from "node:crypto";
import { Prisma } from "@prisma/client";
import { db } from "./db";
import { AppError, credentials } from "./input";
import { logEvent } from "./logger";
import { getServerEnv } from "./env";
import { limitAuth, authLimits } from "./rateLimit";
export { limitAuth } from "./rateLimit";
export const SESSION_COOKIE = "qazloyal_session";
const lifetime = 7 * 24 * 60 * 60 * 1000;
function digest(value: string) {
  const secret = getServerEnv().authSecret;
  if (!secret || secret.length < 32) throw new Error("AUTH_SECRET must contain at least 32 characters");
  return createHmac("sha256", secret).update(value).digest("hex");
}
export async function register(input: unknown) {
  const data = credentials.parse(input);
  const passwordHash = await bcrypt.hash(data.password, 12);
  try { return await db.user.create({ data: { email: data.email, passwordHash, role: "BUSINESS_OWNER" }, select: { id: true, email: true, role: true, authVersion: true } }); }
  catch (error) { if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") throw new AppError(409, "Unable to register this email"); throw error; }
}
const dummyHash = bcrypt.hash("not-a-real-account-password", 12);
export async function login(input: unknown) {
  const data = credentials.parse(input);
  await limitAuth(`login:${data.email}`, authLimits.login.account, authLimits.login.windowMs);
  const user = await db.user.findUnique({ where: { email: data.email } });
  const valid = await bcrypt.compare(data.password, user?.passwordHash ?? await dummyHash);
  if (!user || !valid) { logEvent("login_failed", { category: "invalid_credentials" }); throw new AppError(401, "Invalid email or password"); }
  return { id: user.id, email: user.email, role: user.role, authVersion: user.authVersion };
}
export async function createSession(userId: string, expectedVersion?: number) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + lifetime);
  await db.$transaction(async tx => {
    await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${userId}::uuid FOR UPDATE`;
    const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });
    if (expectedVersion !== undefined && user.authVersion !== expectedVersion) throw new AppError(401, "Please sign in again");
    await tx.session.create({ data: { id: digest(token), userId, expiresAt } });
  });
  return { token, expiresAt };
}
export async function getUser(token?: string) {
  if (!token || !/^[\w-]{43}$/.test(token)) return null;
  const session = await db.session.findUnique({ where: { id: digest(token) }, include: { user: { select: { id: true, email: true, role: true, authVersion: true } } } });
  if (!session || session.expiresAt <= new Date()) return null;
  return session.user;
}
export async function logout(token?: string) {
  if (token) await db.session.deleteMany({ where: { id: digest(token) } });
}
export type Actor = NonNullable<Awaited<ReturnType<typeof getUser>>>;
