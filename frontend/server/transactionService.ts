import { db } from "./db";
import { listInput } from "./input";
import { requireBusiness } from "./businessService";
import { requireCustomer } from "./customerService";
import type { Actor } from "./authService";
export async function transactionHistory(actor: Actor, businessId: string, pageInput: unknown, customerId?: string) {
  await requireBusiness(actor, businessId);
  if (customerId) await requireCustomer(actor, businessId, customerId);
  const { page } = listInput.parse(pageInput);
  const where = { businessId, ...(customerId ? { customerId } : {}) };
  const [items, total] = await db.$transaction([db.loyaltyTransaction.findMany({ where, include: { membership: { select: { customer: { select: { name: true } } } }, employee: { select: { email: true } } }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip: (page - 1) * 20, take: 20 }), db.loyaltyTransaction.count({ where })]);
  return { items: items.map(item => ({ ...item, status: "COMPLETED" })), total, page, pageSize: 20 };
}
