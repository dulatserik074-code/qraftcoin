import { z } from "zod";
export class AppError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export const uuid = z.string().uuid();
const name = z.string().trim().min(1).max(120);
export const credentials = z.object({ email: z.string().trim().email().max(254).transform(s => s.toLowerCase()), password: z.string().min(12).max(72).refine(s => Buffer.byteLength(s, "utf8") <= 72, "Password exceeds 72 bytes") }).strict();
export const customerInput = z.object({ name, phone: z.string().trim().max(30).regex(/^[+\d\s()-]*$/).optional(), email: z.union([z.literal(""), z.string().trim().email().max(254)]).optional() }).strict();
export const businessInput = z.object({ name, description: z.string().trim().max(500).optional(), currency: z.enum(["KZT", "USD", "EUR"]).default("KZT"), rewardRateBps: z.number().int().min(0).max(10000) }).strict();
export const settingsInput = z.object({ name, description: z.string().trim().max(500).optional(), rewardRateBps: z.number().int().min(0).max(10000) }).strict();
export const onboardingInput = z.object({ business: businessInput, customer: customerInput }).strict();
export const moneyInput = z.string().regex(/^\d{1,12}(\.\d{1,2})?$/, "Use a positive amount with at most two decimals");
export const pointsInput = z.string().regex(/^[1-9]\d{0,11}$/, "Enter positive whole QL Points");
export const rewardInput = z.discriminatedUnion("type", [
  z.object({ type: z.literal("EARN"), customerId: uuid, purchaseAmount: moneyInput, idempotencyKey: uuid, description: z.string().trim().max(300).optional() }).strict(),
  z.object({ type: z.literal("REDEEM"), customerId: uuid, points: pointsInput, idempotencyKey: uuid, description: z.string().trim().max(300).optional() }).strict(),
]);
export const listInput = z.object({ page: z.coerce.number().int().min(1).max(10000).default(1), query: z.string().trim().max(120).default("") });
export function minorUnits(value: string): bigint {
  moneyInput.parse(value);
  const [whole, fraction = ""] = value.split(".");
  return BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"));
}
export function calculatePoints(amount: bigint, rateBps: number) {
  if (amount < 0n || !Number.isInteger(rateBps) || rateBps < 0 || rateBps > 10000) throw new AppError(400, "Invalid reward parameters");
  return amount * BigInt(rateBps) / 1000000n;
}
