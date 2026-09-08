import { ethers, network } from "hardhat";
import { assertDeploymentNetwork, assertInitialSupply, assertQFCMetadata } from "../config/token";

async function main() {
  if (network.name === "sepolia" && !(process.env.DEPLOYER_PRIVATE_KEY || process.env.PRIVATE_KEY)) {
    throw new Error("DEPLOYER_PRIVATE_KEY is required for Sepolia deployment");
  }
  const chainId = (await ethers.provider.getNetwork()).chainId;
  assertDeploymentNetwork(network.name, chainId);
  const paymentOption = process.env.DEPLOY_QRAFT_PAYMENT || "false";
  if (!["true", "false"].includes(paymentOption)) throw new Error("DEPLOY_QRAFT_PAYMENT must be true or false");
  const withPayment = paymentOption === "true";
  const treasury = process.env.TREASURY_ADDRESS;
  if (withPayment && (!treasury || !ethers.isAddress(treasury) || treasury === ethers.ZeroAddress)) {
    throw new Error("A valid non-zero TREASURY_ADDRESS is required for the optional payment contract");
  }
  const [deployer] = await ethers.getSigners();
  const token = await ethers.deployContract("QraftCoin");
  console.log("Token deployment transaction:", token.deploymentTransaction()?.hash);
  await token.waitForDeployment();
  const address = await token.getAddress();
  console.log("QFC contract address:", address);
  const [name, symbol, decimals, supply, balance] = await Promise.all([
    token.name(), token.symbol(), token.decimals(), token.totalSupply(), token.balanceOf(deployer.address)
  ]);
  assertQFCMetadata(name, symbol, decimals);
  assertInitialSupply(supply, balance);
  console.log("Network:", network.name, "Chain ID:", chainId.toString());
  console.log("Token:", name, "Symbol:", symbol, "Decimals:", decimals.toString());
  console.log("Initial supply:", ethers.formatUnits(supply, decimals), symbol);
  console.log("Deployer:", deployer.address, "Balance:", ethers.formatUnits(balance, decimals), symbol);
  if (withPayment) {
    const payment = await ethers.deployContract("QraftPayment", [address, treasury!]);
    console.log("Payment deployment transaction:", payment.deploymentTransaction()?.hash);
    await payment.waitForDeployment();
    console.log("QraftPayment address:", await payment.getAddress(), "Treasury:", treasury);
  }
}
main().catch(() => {
  console.error("Deployment failed or metadata/supply validation failed. Expected Qraft Coin / QFC / 18 decimals / 1,000,000 initial tokens. Check recorded deployment transactions before retrying; a submitted deployment cannot be rolled back. Credentials are not logged.");
  process.exitCode = 1;
});
