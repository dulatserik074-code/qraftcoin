export const INITIAL_SUPPLY = 1_000_000n * 10n ** 18n;
export function assertQFCMetadata(name: string, symbol: string, decimals: bigint) {
  if (name !== "Qraft Coin") throw new Error("Expected token name Qraft Coin");
  if (symbol !== "QFC") throw new Error("Expected token symbol QFC; check the contract address");
  if (decimals !== 18n) throw new Error("Expected 18 decimals");
}
export function assertInitialSupply(supply: bigint, deployerBalance: bigint) {
  if (supply !== INITIAL_SUPPLY || deployerBalance !== INITIAL_SUPPLY) {
    throw new Error("Expected initial supply and deployer balance of 1,000,000 QFC");
  }
}
export function assertDeploymentNetwork(name: string, chainId: bigint) {
  if (name === "sepolia" && chainId === 11155111n) return;
  if ((name === "hardhat" || name === "localhost") && chainId === 31337n) return;
  throw new Error("Deployment network must match Sepolia or local Hardhat");
}
