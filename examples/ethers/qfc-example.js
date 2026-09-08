// Read-only Node.js example. QFC is branding; source token symbol is QFT.
const { ethers } = require("ethers");
require("dotenv/config");

const QFC_ADDRESS = process.env.QFC_CONTRACT_ADDRESS || "YOUR_QFC_CONTRACT_ADDRESS";
const abi = [
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)"
];

async function getQFCBalance(walletAddress) {
  if (!ethers.isAddress(QFC_ADDRESS) || QFC_ADDRESS === ethers.ZeroAddress) {
    throw new Error("Set QFC_CONTRACT_ADDRESS to the verified Sepolia token address.");
  }
  if (!ethers.isAddress(walletAddress)) throw new Error("Provide a valid player wallet address.");
  const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com");
  try {
    if ((await provider.getNetwork()).chainId !== 11155111n) throw new Error("Expected Ethereum Sepolia.");
    if ((await provider.getCode(QFC_ADDRESS)) === "0x") throw new Error("No contract code at this address.");
    const token = new ethers.Contract(QFC_ADDRESS, abi, provider);
    const [balance, decimals, symbol] = await Promise.all([
      token.balanceOf(walletAddress), token.decimals(), token.symbol()
    ]);
    return { balance: ethers.formatUnits(balance, decimals), symbol };
  } finally {
    provider.destroy();
  }
}

module.exports = { getQFCBalance };
if (require.main === module) {
  getQFCBalance(process.argv[2]).then(console.log).catch(() => {
    console.error("Balance lookup failed. Check wallet, contract address, Sepolia RPC and connectivity. No signing key is needed.");
    process.exitCode = 1;
  });
}
