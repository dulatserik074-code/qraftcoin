import { Prisma } from "@prisma/client";
import { db } from "./db";
import { requireBusiness } from "./businessService";
import type { Actor } from "./authService";
export async function analytics(actor: Actor, businessId: string) {
  return db.$transaction(async tx => {
    await requireBusiness(actor, businessId, tx);
    const cutoff = new Date(Date.now() - 30 * 86400000);
    const [totalCustomers, activeCustomers, returningCustomers, totals, issued, redeemed] = await Promise.all([
      tx.businessCustomer.count({ where: { businessId } }),
      tx.businessCustomer.count({ where: { businessId, lastPurchaseAt: { gte: cutoff } } }),
      tx.businessCustomer.count({ where: { businessId, totalPurchases: { gte: 2 } } }),
      tx.businessCustomer.aggregate({ where: { businessId }, _sum: { totalPurchases: true, totalSpent: true } }),
      tx.loyaltyTransaction.aggregate({ where: { businessId, type: { in: ["EARN", "BONUS"] } }, _sum: { points: true } }),
      tx.loyaltyTransaction.aggregate({ where: { businessId, type: "REDEEM" }, _sum: { points: true } }),
    ]);
    const purchasers = await tx.businessCustomer.count({ where: { businessId, totalPurchases: { gt: 0 } } });
    return { totalCustomers, activeCustomers, returningCustomers, pointsIssued: issued._sum.points ?? 0n, pointsRedeemed: redeemed._sum.points ?? 0n, totalPurchases: totals._sum.totalPurchases ?? 0, revenueTracked: totals._sum.totalSpent ?? 0n, repeatPurchaseRateBps: purchasers ? Math.floor(returningCustomers * 10000 / purchasers) : 0 };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
}
