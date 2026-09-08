import { expect } from "chai";
import { selectedHardhatNetwork, validateSepoliaEnvironment } from "../config/network";

describe("Hardhat network configuration", function () {
  it("detects both supported --network argument forms", () => {
    expect(selectedHardhatNetwork(["node", "hardhat", "--network", "sepolia"])).to.equal("sepolia");
    expect(selectedHardhatNetwork(["node", "hardhat", "--network=sepolia"])).to.equal("sepolia");
  });

  it("allows local commands without Sepolia credentials", () => {
    expect(() => validateSepoliaEnvironment(undefined, {})).not.to.throw();
    expect(() => validateSepoliaEnvironment("hardhat", {})).not.to.throw();
    expect(() => validateSepoliaEnvironment("localhost", {})).not.to.throw();
  });

  it("requires the RPC URL before a Sepolia command starts", () => {
    expect(() => validateSepoliaEnvironment("sepolia", {}))
      .to.throw("SEPOLIA_RPC_URL is required for Sepolia");
  });

  it("allows read-only Sepolia commands without a private key", () => {
    expect(() => validateSepoliaEnvironment("sepolia", { SEPOLIA_RPC_URL: "https://rpc.example" }))
      .not.to.throw();
  });
});
