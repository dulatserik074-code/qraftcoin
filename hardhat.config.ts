import "@nomicfoundation/hardhat-toolbox";
import "dotenv/config";
import { HardhatUserConfig } from "hardhat/config";
import { selectedHardhatNetwork, validateSepoliaEnvironment } from "./config/network";

const { SEPOLIA_RPC_URL, ETHERSCAN_API_KEY } = process.env;
const PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY || process.env.PRIVATE_KEY;
validateSepoliaEnvironment(selectedHardhatNetwork(process.argv), { SEPOLIA_RPC_URL, PRIVATE_KEY });

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.28",
    settings: { optimizer: { enabled: true, runs: 200 } },
  },
  etherscan: { apiKey: ETHERSCAN_API_KEY || "" },
  networks: {
    hardhat: {},
    sepolia: {
      url: SEPOLIA_RPC_URL || "",
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
    },
  },
};

export default config;
