import { run, ethers } from "hardhat";
import { isAddress, ZeroAddress } from "ethers";
import { assertQFCMetadata } from "../config/token";

// Etherscan V2 source verification: no signer or blockchain transaction.
async function main() {
  const address = process.env.QFC_CONTRACT_ADDRESS;
  if (!address || !isAddress(address) || address === ZeroAddress) {
    throw new Error("QFC_CONTRACT_ADDRESS must be the existing Sepolia token address");
  }
  if (!process.env.ETHERSCAN_API_KEY) throw new Error("ETHERSCAN_API_KEY is required");
  if ((await ethers.provider.getNetwork()).chainId !== 11155111n) throw new Error("Expected Sepolia");
  if ((await ethers.provider.getCode(address)) === "0x") throw new Error("No bytecode at QFC_CONTRACT_ADDRESS");
  const token = new ethers.Contract(address, [
    "function name() view returns (string)",
    "function symbol() view returns (string)",
    "function decimals() view returns (uint8)"
  ], ethers.provider);
  assertQFCMetadata(await token.name(), await token.symbol(), await token.decimals());
  await run("verify:verify", {
    address,
    constructorArguments: [],
    contract: "contracts/QraftCoin.sol:QraftCoin"
  });
}

main().catch(() => {
  console.error("Source verification failed. Expected Sepolia bytecode and Qraft Coin / QFC / 18 metadata. Check address, compiler/source match and Etherscan configuration. Credentials are not logged.");
  process.exitCode = 1;
});
