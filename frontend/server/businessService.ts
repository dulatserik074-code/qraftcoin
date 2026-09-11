import { Prisma } from "@prisma/client";
import { db } from "./db";
import { AppError, onboardingInput, settingsInput, uuid } from "./input";
import type { Actor } from "./authService";
export type Store = Prisma.TransactionClient;
export async function requireBusiness(actor: Actor, id: string, store: Store = db) {
  uuid.parse(id);
  if (actor.role === "CUSTOMER") throw new AppError(404, "Business not found");
  const business = await store.business.findFirst({ where: { id, OR: [{ ownerId: actor.id }, { staff: { some: { userId: actor.id, active: true } } }] } });
  if (!business) throw new AppError(404, "Business not found");
  return business;
}
export async function listBusinesses(actor: Actor) {
  if (actor.role === "CUSTOMER") return [];
  return db.business.findMany({ where: { OR: [{ ownerId: actor.id }, { staff: { some: { userId: actor.id, active: true } } }] }, orderBy: { createdAt: "asc" } });
}
export async function createBusiness(actor: Actor, input: unknown) {
  if (actor.role !== "BUSINESS_OWNER") throw new AppError(403, "Only owners can create a business");
  const data = onboardingInput.parse(input);
  try {
    return await db.$transaction(async tx => {
      const business = await tx.business.create({ data: { ...data.business, ownerId: actor.id } });
      const customer = await tx.customer.create({ data: { name: data.customer.name, phone: data.customer.phone || null, email: data.customer.email || null } });
      await tx.businessCustomer.create({ data: { businessId: business.id, customerId: customer.id } });
      return business;
    });
  } catch (e) { if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") throw new AppError(409, "Your business already exists"); throw e; }
}
export async function updateBusiness(actor: Actor, businessId: string, input: unknown) {
  const business = await requireBusiness(actor, businessId);
  if (business.ownerId !== actor.id) throw new AppError(403, "Only the owner can change settings");
  const data = settingsInput.parse(input);
  return db.business.update({ where: { id: business.id }, data });
}

