export const QFT_TOKEN_ADDRESS = process.env.NEXT_PUBLIC_QFT_ADDRESS || "";
export const QRAFT_PAYMENT_ADDRESS = process.env.NEXT_PUBLIC_QRAFT_PAYMENT_ADDRESS || "";
export const SUPPORTED_CHAIN_ID = Number(process.env.NEXT_PUBLIC_REQUIRED_CHAIN_ID || "11155111");
export const NETWORK_NAME = process.env.NEXT_PUBLIC_NETWORK_NAME || "Sepolia";
export const BLOCK_EXPLORER_URL = process.env.NEXT_PUBLIC_BLOCK_EXPLORER_URL || "https://sepolia.etherscan.io";
export const QFT_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function totalSupply() view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function burn(uint256 amount)",
] as const;

export const PAYMENT_ABI = ["function pay(uint256 amount)"] as const;

export function explorerUrl(chainId: number | null, kind: "address" | "tx", value: string) {
  return chainId === SUPPORTED_CHAIN_ID ? `${BLOCK_EXPLORER_URL.replace(/\/$/, "")}/${kind}/${value}` : undefined;
}
