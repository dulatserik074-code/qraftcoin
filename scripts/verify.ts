import { run, ethers } from "hardhat";
import { isAddress, ZeroAddress } from "ethers";

// Etherscan V2 source verification: no signer or blockchain transaction.
async function main() {
  const address = process.env.QFC_CONTRACT_ADDRESS;
  if (!address || !isAddress(address) || address === ZeroAddress) {
    throw new Error("QFC_CONTRACT_ADDRESS must be the existing Sepolia token address");
  }
  if (!process.env.ETHERSCAN_API_KEY) throw new Error("ETHERSCAN_API_KEY is required");
  if ((await ethers.provider.getNetwork()).chainId !== 11155111n) throw new Error("Expected Sepolia");
  await run("verify:verify", {
    address,
    constructorArguments: [],
    contract: "contracts/QraftCoin.sol:QraftCoin"
  });
}

main().catch(() => {
  console.error("Source verification failed. Check address, compiler/source match and Etherscan configuration. Credentials are not logged.");
  process.exitCode = 1;
});
