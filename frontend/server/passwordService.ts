import { performance } from "node:perf_hooks";
import { setTimeout as delay } from "node:timers/promises";
import { randomInt } from "node:crypto";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "./db";
import { AppError, credentials } from "./input";
import { limitAuth } from "./authService";
import { actionLink, emailService, type EmailService } from "./emailService";
import { emailInput, newToken, opaqueToken, tokenHash } from "./tokens";
import { logEvent } from "./logger";
export const resetMessage = "If an account exists for this email, password reset instructions have been sent.";
export async function requestPasswordReset(input: unknown, mail: EmailService = emailService, defer?: (work: () => Promise<void>) => void) {
  const started = performance.now();
  const { email } = emailInput.parse(input);
  await limitAuth(`reset:${email}`, 5);
  const user = await db.user.findUnique({ where: { email }, select: { id: true } });
  const token = newToken();
  const hash = tokenHash(token);
  if (user) {
    await db.$transaction(async tx => {
      await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${user.id}::uuid FOR UPDATE`;
      await tx.passwordReset.deleteMany({ where: { userId: user.id } });
      await tx.passwordReset.create({ data: { tokenHash: hash, userId: user.id, expiresAt: new Date(Date.now() + 30 * 60000) } });
    });
    const deliver = async () => { try { await mail.send({ to: email, subject: "Reset your QazLoyal password", text: `Reset your password within 30 minutes: ${actionLink("/reset-password", token)}\nIf you did not request this, ignore this email.` }); }
    catch { logEvent("email_failed", { category: "password_reset" }); } };
    if (defer) defer(deliver); else await deliver();
  } else {
    // Perform a DB transaction and token lookup too; never create a fake account.
    await db.$transaction(async tx => { await tx.passwordReset.findUnique({ where: { tokenHash: hash } }); });
  }
  // Cover ordinary DB-path variance. Email delivery is deferred by the HTTP route.
  await delay(Math.max(0, 350 + randomInt(100) - (performance.now() - started)));
  logEvent("password_reset_requested");
  return { message: resetMessage };
}
export async function resetPassword(input: unknown) {
  const data = z.object({ token: opaqueToken, password: credentials.shape.password }).strict().parse(input);
  await limitAuth(`reset-token:${tokenHash(data.token)}`, 5);
  const passwordHash = await bcrypt.hash(data.password, 12);
  const record = await db.passwordReset.findUnique({ where: { tokenHash: tokenHash(data.token) } });
  if (!record) throw new AppError(400, "Invalid or expired link");
  await db.$transaction(async tx => {
    await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${record.userId}::uuid FOR UPDATE`;
    const current = await tx.passwordReset.findUnique({ where: { tokenHash: record.tokenHash } });
    if (!current || current.expiresAt <= new Date()) throw new AppError(400, "Invalid or expired link");
    await tx.user.update({ where: { id: current.userId }, data: { passwordHash, authVersion: { increment: 1 } } });
    await tx.passwordReset.deleteMany({ where: { userId: current.userId } });
    await tx.session.deleteMany({ where: { userId: current.userId } });
  });
  logEvent("password_reset_completed", { actorId: record.userId });
  return { message: "Password updated. Sign in again on each device." };
}
