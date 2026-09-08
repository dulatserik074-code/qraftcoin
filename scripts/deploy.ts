import { ethers, network } from "hardhat";

async function main() {
  if (network.name === "sepolia" && !(process.env.DEPLOYER_PRIVATE_KEY || process.env.PRIVATE_KEY)) {
    throw new Error("DEPLOYER_PRIVATE_KEY is required for Sepolia deployment");
  }
  const actualChain = (await ethers.provider.getNetwork()).chainId;
  if (![31337n, 11155111n].includes(actualChain)) throw new Error("Only local Hardhat or Sepolia deployment is supported");
  if (network.name === "sepolia" && actualChain !== 11155111n) throw new Error("RPC must use Sepolia");
  const treasury = process.env.TREASURY_ADDRESS;
  if (!treasury || !ethers.isAddress(treasury) || treasury === ethers.ZeroAddress) {
    throw new Error("TREASURY_ADDRESS is required and must be a valid non-zero address");
  }

  const [deployer] = await ethers.getSigners();
  const chainId = (await ethers.provider.getNetwork()).chainId;
  const token = await ethers.deployContract("QraftCoin");
  await token.waitForDeployment();
  const payment = await ethers.deployContract("QraftPayment", [await token.getAddress(), treasury]);
  await payment.waitForDeployment();

  console.log("Network:", network.name);
  console.log("Chain ID:", chainId.toString());
  console.log("Deployer:", deployer.address);
  console.log("Treasury:", treasury);
  console.log("QraftCoin address:", await token.getAddress());
  console.log("QraftPayment address:", await payment.getAddress());
  console.log("Total supply:", ethers.formatUnits(await token.totalSupply(), 18), "QFT");
}

main().catch((error) => {
  console.error("Deployment failed. Check network, testnet credentials, treasury and transaction status before retrying. Credentials are not logged.");
  process.exitCode = 1;
});
