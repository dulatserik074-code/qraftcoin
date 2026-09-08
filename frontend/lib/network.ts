export type WalletData = { balance: bigint; supply: bigint | null; allowance: bigint };

export const EMPTY_WALLET_DATA: WalletData = { balance: 0n, supply: null, allowance: 0n };

export function chainIdToHex(chainId: number) {
  if (!Number.isSafeInteger(chainId) || chainId <= 0) throw new Error("Chain ID must be a positive safe integer");
  return `0x${chainId.toString(16)}`;
}

export function walletDataForChain(chainId: number, supportedChainId: number, data: WalletData): WalletData {
  return chainId === supportedChainId ? data : EMPTY_WALLET_DATA;
}

export function walletDataForAccount(account: string | undefined, data: WalletData): WalletData {
  return account ? data : EMPTY_WALLET_DATA;
}
