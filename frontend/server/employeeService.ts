import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "./db";
import { AppError, credentials, uuid } from "./input";
import { requireBusiness, type Store } from "./businessService";
import { limitAuth, type Actor } from "./authService";
import { actionLink, emailService, type EmailService } from "./emailService";
import { emailInput, newToken, opaqueToken, tokenHash } from "./tokens";
import { logEvent } from "./logger";
export async function requireOwner(actor: Actor, businessId: string, store: Store = db) {
  const business = await requireBusiness(actor, businessId, store);
  if (business.ownerId !== actor.id) throw new AppError(403, "Only the owner can manage employees");
  return business;
}
const invitationFields = { id: true, email: true, role: true, expiresAt: true, acceptedAt: true, revokedAt: true, createdAt: true } as const;
export async function listEmployees(actor: Actor, businessId: string) {
  await requireOwner(actor, businessId);
  return {
    employees: await db.businessStaff.findMany({ where: { businessId }, select: { userId: true, active: true, user: { select: { email: true } } }, orderBy: { createdAt: "asc" } }),
    invitations: await db.invitation.findMany({ where: { businessId, acceptedAt: null, revokedAt: null, expiresAt: { gt: new Date() } }, select: invitationFields, orderBy: { createdAt: "desc" } }),
  };
}
export async function inviteEmployee(actor: Actor, businessId: string, input: unknown, mail: EmailService = emailService) {
  await requireOwner(actor, businessId);
  const { email } = emailInput.parse(input);
  if (email === actor.email) throw new AppError(400, "The owner already has access");
  await limitAuth(`invite:${businessId}`, 30);
  const token = newToken();
  const invitation = await db.$transaction(async tx => {
    await tx.$queryRaw`SELECT "id" FROM "Business" WHERE "id" = ${businessId}::uuid FOR UPDATE`;
    await requireOwner(actor, businessId, tx);
    const user = await tx.user.findUnique({ where: { email }, include: { business: true, staff: { where: { businessId } } } });
    if (user?.business || user?.role === "CUSTOMER") throw new AppError(400, "Use a separate employee account email");
    if (user?.staff.length) throw new AppError(409, "Employee already exists; use their access control");
    await tx.invitation.updateMany({ where: { businessId, email, acceptedAt: null, revokedAt: null }, data: { revokedAt: new Date() } });
    return tx.invitation.create({ data: { businessId, email, role: "EMPLOYEE", tokenHash: tokenHash(token), expiresAt: new Date(Date.now() + 48 * 3600000) }, select: invitationFields });
  });
  try { await mail.send({ to: email, subject: "Join your QazLoyal team", text: `Accept your employee invitation within 48 hours: ${actionLink("/accept-invitation", token)}\nUse your existing account password, or choose a new password for a new employee account.` }); }
  catch { await db.invitation.updateMany({ where: { id: invitation.id, acceptedAt: null }, data: { revokedAt: new Date() } }); logEvent("email_failed", { businessId, category: "invitation" }); throw new AppError(503, "Invitation email could not be sent. Please try again."); }
  logEvent("invitation_created", { actorId: actor.id, businessId });
  return invitation;
}
export async function revokeInvitation(actor: Actor, businessId: string, id: string) {
  await requireOwner(actor, businessId); uuid.parse(id);
  const result = await db.invitation.updateMany({ where: { id, businessId, acceptedAt: null, revokedAt: null }, data: { revokedAt: new Date() } });
  if (!result.count) throw new AppError(404, "Invitation not found");
  logEvent("security_rejected", { actorId: actor.id, businessId, category: "invitation_revoked" });
  return { ok: true };
}
export async function setEmployeeAccess(actor: Actor, businessId: string, userId: string, input: unknown) {
  await requireOwner(actor, businessId); uuid.parse(userId);
  const { active } = z.object({ active: z.boolean() }).strict().parse(input);
  const result = await db.businessStaff.updateMany({ where: { businessId, userId }, data: { active } });
  if (!result.count) throw new AppError(404, "Employee not found");
  logEvent("employee_access_changed", { actorId: actor.id, businessId, category: active ? "restored" : "disabled" });
  return { ok: true };
}
export async function acceptInvitation(input: unknown, actor?: Actor | null) {
  const data = z.object({ token: opaqueToken, password: credentials.shape.password }).strict().parse(input);
  const hash = tokenHash(data.token);
  await limitAuth(`accept:${hash}`, 5);
  const passwordHash = await bcrypt.hash(data.password, 12);
  const result = await db.$transaction(async tx => {
    await tx.$queryRaw`SELECT "id" FROM "Invitation" WHERE "tokenHash" = ${hash} FOR UPDATE`;
    const invitation = await tx.invitation.findUnique({ where: { tokenHash: hash } });
    if (!invitation || invitation.acceptedAt || invitation.revokedAt || invitation.expiresAt <= new Date()) throw new AppError(400, "Invalid or expired invitation");
    if (actor && actor.email !== invitation.email) throw new AppError(404, "Invitation not found");
    let user = await tx.user.findUnique({ where: { email: invitation.email }, include: { business: true } });
    if (user) {
      await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${user.id}::uuid FOR UPDATE`;
      user = await tx.user.findUniqueOrThrow({ where: { id: user.id }, include: { business: true } });
      if (user.business || user.role === "CUSTOMER") throw new AppError(403, "Use a separate employee account");
      if (!await bcrypt.compare(data.password, user.passwordHash)) throw new AppError(401, "Unable to accept invitation. Check your account password.");
      if (await tx.businessStaff.findUnique({ where: { businessId_userId: { businessId: invitation.businessId, userId: user.id } } })) throw new AppError(409, "Membership already exists; contact the owner");
      user = await tx.user.update({ where: { id: user.id }, data: { role: "EMPLOYEE" }, include: { business: true } });
    } else user = await tx.user.create({ data: { email: invitation.email, passwordHash, role: "EMPLOYEE" }, include: { business: true } });
    await tx.businessStaff.create({ data: { businessId: invitation.businessId, userId: user.id } });
    await tx.invitation.update({ where: { id: invitation.id }, data: { acceptedAt: new Date() } });
    return { userId: user.id, businessId: invitation.businessId };
  }, { timeout: 15000 });
  logEvent("invitation_accepted", { actorId: result.userId, businessId: result.businessId });
  return { message: "Invitation accepted. Sign in with the invited email and your password." };
}
