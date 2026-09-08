import { expect } from "chai";
import { assertDeploymentNetwork, assertInitialSupply, assertQFCMetadata, INITIAL_SUPPLY } from "../config/token";
describe("Deployment validation (no network or signer)", () => {
  it("accepts official metadata and constructor allocation", () => {
    expect(() => assertQFCMetadata("Qraft Coin", "QFC", 18n)).not.to.throw();
    expect(() => assertInitialSupply(INITIAL_SUPPLY, INITIAL_SUPPLY)).not.to.throw();
  });
  it("rejects wrong symbol, name and decimals", () => {
    expect(() => assertQFCMetadata("Qraft Coin", "OTHER", 18n)).to.throw("Expected token symbol QFC");
    expect(() => assertQFCMetadata("Other", "QFC", 18n)).to.throw("Expected token name");
    expect(() => assertQFCMetadata("Qraft Coin", "QFC", 6n)).to.throw("Expected 18 decimals");
  });
  it("rejects incorrect supply or allocation", () => {
    expect(() => assertInitialSupply(INITIAL_SUPPLY - 1n, INITIAL_SUPPLY)).to.throw("initial supply");
    expect(() => assertInitialSupply(INITIAL_SUPPLY, 0n)).to.throw("deployer balance");
  });
  it("rejects mainnet and mismatched RPC networks before deployment", () => {
    expect(() => assertDeploymentNetwork("sepolia", 11155111n)).not.to.throw();
    expect(() => assertDeploymentNetwork("localhost", 31337n)).not.to.throw();
    expect(() => assertDeploymentNetwork("sepolia", 1n)).to.throw();
    expect(() => assertDeploymentNetwork("sepolia", 31337n)).to.throw();
    expect(() => assertDeploymentNetwork("localhost", 11155111n)).to.throw();
  });
});
