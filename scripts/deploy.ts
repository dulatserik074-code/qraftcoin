import { ethers, network } from "hardhat";

async function main() {
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
  console.error(error);
  process.exitCode = 1;
});
