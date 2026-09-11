export type Business = { id: string; ownerId: string; name: string; description: string; currency: string; rewardRateBps: number };
export type User = { id: string; email: string; role: string };
export type Transaction = { id: string; createdAt: string; type: string; points: string; purchaseAmount: string | null; membership: { customer: { name: string } }; employee: { email: string } | null; status: string };
export type History = { items: Transaction[]; total: number; page: number; pageSize: number };
export type Member = { customerId: string; publicId: string; pointsBalance: string; lifetimePoints: string; totalPurchases: number; customer: { name: string; phone: string | null; email: string | null }; qrImage?: string; history?: History };
export type Stats = { totalCustomers: number; activeCustomers: number; returningCustomers: number; pointsIssued: string; pointsRedeemed: string; totalPurchases: number; revenueTracked: string; repeatPurchaseRateBps: number };
export async function api<T>(path: string, body?: unknown, method = "POST"): Promise<T> {
  const response = await fetch(`/api/${path}`, body === undefined ? { cache: "no-store" } : { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await response.json();
  if (response.status === 401) { window.location.assign("/login"); throw new Error("Please sign in"); }
  if (!response.ok) throw new Error(data.error || "Request failed");
  return data;
}
export function money(minor: string | null, currency: string) {
  if (minor === null) return "—";
  const value = BigInt(minor); return `${value / 100n}.${(value % 100n).toString().padStart(2, "0")} ${currency}`;
}
export function rateBps(value: string) {
  if (!/^\d{1,3}(\.\d{1,2})?$/.test(value)) throw new Error("Enter a percentage from 0 to 100, with up to 2 decimals");
  const [whole, fraction = ""] = value.split("."); const result = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  if (result > 10000) throw new Error("Reward rate must not exceed 100%"); return result;
}
