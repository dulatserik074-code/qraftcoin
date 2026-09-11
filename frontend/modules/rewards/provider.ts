/** Reward amounts are integer units of a specific asset, never implicit ERC-20 amounts. */
export type RewardScope = Readonly<{ businessId: string; customerId: string; assetId: string }>;
export type RewardCommand = RewardScope & Readonly<{ idempotencyKey: string; points: number; kind: "EARN" | "REDEEM"; reason: string }>;
export type RewardTransaction = RewardCommand & Readonly<{ id: string; createdAt: string }>;
export interface RewardProvider {
  balance(scope: RewardScope): Promise<number>;
  history(scope: RewardScope): Promise<readonly RewardTransaction[]>;
  transact(command: RewardCommand): Promise<RewardTransaction>;
}
export const POINTS_ASSET = { id: "qazloyal-points-v1", name: "QazLoyal Points", symbol: "QL Points", decimals: 0 } as const;
export function purchaseReward(amountMinor: number, currencyDecimals: number, rateBps: number): number {
  if (!Number.isSafeInteger(amountMinor) || amountMinor < 0 || !Number.isInteger(currencyDecimals) || currencyDecimals < 0 || currencyDecimals > 6 || !Number.isInteger(rateBps) || rateBps < 0 || rateBps > 10000) throw new Error("Invalid reward calculation inputs");
  return Number(BigInt(amountMinor) * BigInt(rateBps) / (10000n * 10n ** BigInt(currencyDecimals)));
}

/** Ephemeral demonstration only. Production requires an authenticated atomic database ledger. */
export class DemoRewardProvider implements RewardProvider {
  private entries: RewardTransaction[] = [];
  private matches(a: RewardScope, b: RewardScope) {return a.businessId === b.businessId && a.customerId === b.customerId && a.assetId === b.assetId;}
  async history(scope: RewardScope) { return this.entries.filter(e => this.matches(e, scope)).map(e => ({...e})); }
  async balance(scope: RewardScope) {return this.entries.filter(e => this.matches(e, scope)).reduce((n,e) => n + (e.kind === "EARN" ? e.points : -e.points),0);}
  async transact(command: RewardCommand) {
    if (![command.businessId, command.customerId, command.assetId, command.idempotencyKey, command.reason].every(v => typeof v === "string" && v.trim().length > 0) || !Number.isSafeInteger(command.points) || command.points <= 0 || !["EARN", "REDEEM"].includes(command.kind)) throw new Error("Invalid reward transaction");
    const previous=this.entries.find(e => e.businessId === command.businessId && e.idempotencyKey === command.idempotencyKey);
    if (previous) {
      if (!this.matches(previous,command) || previous.points !== command.points || previous.kind !== command.kind || previous.reason !== command.reason) throw new Error("Idempotency conflict");
      return {...previous};
    }
    // No await between balance validation and append: atomic within this single-process demo.
    const balance=this.entries.filter(e => this.matches(e,command)).reduce((n,e) => n+(e.kind === "EARN" ? e.points : -e.points),0);
    if (command.kind === "REDEEM" && command.points > balance) throw new Error("Insufficient points");
    if (command.kind === "EARN" && !Number.isSafeInteger(balance + command.points)) throw new Error("Balance exceeds supported range");
    const entry={...command,id:String(this.entries.length+1),createdAt:new Date().toISOString()};
    this.entries.push(entry);return {...entry};
  }
}
