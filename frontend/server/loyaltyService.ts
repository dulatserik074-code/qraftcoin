import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";
import { db } from "./db";
import { AppError, calculatePoints, minorUnits, rewardInput } from "./input";
import { requireBusiness } from "./businessService";
import { requireCustomer } from "./customerService";
import type { Actor } from "./authService";

export async function transactReward(actor: Actor, businessId: string, input: unknown) {
  const data = rewardInput.parse(input);
  const requestHash = createHash("sha256").update(JSON.stringify({ customerId: data.customerId, type: data.type, amount: data.type === "EARN" ? minorUnits(data.purchaseAmount).toString() : data.points, description: data.description || "" })).digest("hex");
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      return await db.$transaction(async tx => {
        const business = await requireBusiness(actor, businessId, tx);
        const member = await requireCustomer(actor, businessId, data.customerId, tx);
        const existing = await tx.loyaltyTransaction.findUnique({ where: { businessId_idempotencyKey: { businessId, idempotencyKey: data.idempotencyKey } } });
        if (existing) {
          if (existing.requestHash !== requestHash) throw new AppError(409, "Idempotency key was used for a different request");
          return { transaction: existing, replayed: true, message: "Previously completed transaction" };
        }
        const purchaseAmount = data.type === "EARN" ? minorUnits(data.purchaseAmount) : null;
        if (purchaseAmount === 0n) throw new AppError(400, "Purchase must be greater than zero");
        const points = data.type === "EARN" ? calculatePoints(purchaseAmount!, business.rewardRateBps) : BigInt(data.points);
        if (points === 0n) return { transaction: null, replayed: false, message: "This purchase earns 0 QL Points. No transaction was created." };
        if (data.type === "REDEEM" && member.pointsBalance < points) throw new AppError(409, "Insufficient points");
        const transaction = await tx.loyaltyTransaction.create({ data: { businessId, customerId: data.customerId, employeeId: actor.id, type: data.type, points, purchaseAmount, description: data.description || null, idempotencyKey: data.idempotencyKey, requestHash } });
        await tx.businessCustomer.update({ where: { id: member.id }, data: {
          pointsBalance: { increment: data.type === "EARN" ? points : -points },
          ...(data.type === "EARN" ? { lifetimePoints: { increment: points }, totalSpent: { increment: purchaseAmount! }, totalPurchases: { increment: 1 }, lastPurchaseAt: transaction.createdAt } : {}),
        } });
        return { transaction, replayed: false, message: data.type === "EARN" ? "Points issued" : "Points redeemed" };
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, maxWait: 10000, timeout: 15000 });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && ["P2034", "P2002"].includes(error.code)) {
        if (attempt === 4) throw new AppError(503, "Concurrent update could not be completed. Retry with the same idempotency key.");
        await new Promise(resolve => setTimeout(resolve, 20 * (attempt + 1)));
        continue;
      }
      throw error;
    }
  }
  throw new AppError(503, "Please retry the operation");
}
