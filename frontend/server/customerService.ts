import { db } from "./db";
import { AppError, customerInput, listInput, uuid } from "./input";
import { requireBusiness, type Store } from "./businessService";
import type { Actor } from "./authService";
export async function requireCustomer(actor: Actor, businessId: string, customerId: string, store: Store = db) {
  await requireBusiness(actor, businessId, store);
  uuid.parse(customerId);
  const membership = await store.businessCustomer.findUnique({ where: { businessId_customerId: { businessId, customerId } }, include: { customer: true } });
  if (!membership) throw new AppError(404, "Customer not found");
  return membership;
}
export async function createCustomer(actor: Actor, businessId: string, input: unknown) {
  await requireBusiness(actor, businessId);
  const data = customerInput.parse(input);
  return db.businessCustomer.create({ data: { business: { connect: { id: businessId } }, customer: { create: { name: data.name, phone: data.phone || null, email: data.email || null } } }, include: { customer: true } });
}
export async function listCustomers(actor: Actor, businessId: string, input: unknown) {
  await requireBusiness(actor, businessId);
  const { page, query } = listInput.parse(input);
  const where = { businessId, customer: { OR: [{ name: { contains: query, mode: "insensitive" as const } }, { phone: { contains: query } }, { email: { contains: query, mode: "insensitive" as const } }] } };
  const [items, total] = await db.$transaction([db.businessCustomer.findMany({ where, include: { customer: true }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip: (page - 1) * 20, take: 20 }), db.businessCustomer.count({ where })]);
  return { items, total, page, pageSize: 20 };
}
export async function findByPublicId(actor: Actor, businessId: string, publicId: string) {
  await requireBusiness(actor, businessId);
  uuid.parse(publicId);
  const membership = await db.businessCustomer.findFirst({ where: { businessId, publicId }, include: { customer: true } });
  if (!membership) throw new AppError(404, "Customer not found");
  return membership;
}
