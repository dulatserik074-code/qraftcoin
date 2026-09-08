import { expect } from "chai";
import { ethers } from "hardhat";

describe("QraftCoin", function () {
  async function deployFixture() {
    const [deployer, alice, bob] = await ethers.getSigners();
    const token = await ethers.deployContract("QraftCoin");
    return { token, deployer, alice, bob };
  }

  it("has the correct name and symbol", async () => {
    const { token } = await deployFixture();
    expect(await token.name()).to.equal("Qraft Coin");
    expect(await token.symbol()).to.equal("QFC");
    expect(await token.decimals()).to.equal(18);
  });

  it("mints exactly 1,000,000 QFC to the deployer", async () => {
    const { token, deployer } = await deployFixture();
    const supply = ethers.parseEther("1000000");
    expect(await token.totalSupply()).to.equal(supply);
    expect(await token.balanceOf(deployer.address)).to.equal(supply);
    expect(await token.MAX_SUPPLY()).to.equal(supply);
  });

  it("transfers without burning or changing total supply", async () => {
    const { token, alice } = await deployFixture();
    const supplyBefore = await token.totalSupply();
    await expect(token.transfer(alice.address, ethers.parseEther("25")))
      .to.changeTokenBalances(token, [alice], [ethers.parseEther("25")]);
    expect(await token.totalSupply()).to.equal(supplyBefore);
  });

  it("supports approve and transferFrom", async () => {
    const { token, deployer, alice, bob } = await deployFixture();
    const amount = ethers.parseEther("50");
    await token.approve(alice.address, amount);
    await token.connect(alice).transferFrom(deployer.address, bob.address, amount);
    expect(await token.balanceOf(bob.address)).to.equal(amount);
  });

  it("supports burn and burnFrom", async () => {
    const { token, deployer, alice } = await deployFixture();
    const amount = ethers.parseEther("10");
    await token.burn(amount);
    await token.approve(alice.address, amount);
    await token.connect(alice).burnFrom(deployer.address, amount);
    expect(await token.totalSupply()).to.equal(ethers.parseEther("999980"));
  });

  it("lets a holder burn an exact amount from their own balance", async () => {
    const { token, alice } = await deployFixture();
    const amount = ethers.parseEther("40");
    const burned = ethers.parseEther("7.25");
    await token.transfer(alice.address, amount);
    const supplyBefore = await token.totalSupply();
    await token.connect(alice).burn(burned);
    expect(await token.balanceOf(alice.address)).to.equal(amount - burned);
    expect(await token.totalSupply()).to.equal(supplyBefore - burned);
  });

  it("exposes no mint function after deployment", async () => {
    const { token } = await deployFixture();
    expect(token.interface.hasFunction("mint")).to.equal(false);
  });

  it("rejects a transfer above the sender balance", async () => {
    const { token, alice, bob } = await deployFixture();
    await expect(token.connect(alice).transfer(bob.address, 1n))
      .to.be.revertedWithCustomError(token, "ERC20InsufficientBalance")
      .withArgs(alice.address, 0n, 1n);
  });

  it("rejects burning above the holder balance", async () => {
    const { token, alice } = await deployFixture();
    await expect(token.connect(alice).burn(1n))
      .to.be.revertedWithCustomError(token, "ERC20InsufficientBalance")
      .withArgs(alice.address, 0n, 1n);
  });

  it("rejects burnFrom without permission and preserves supply", async () => {
    const { token, deployer, alice } = await deployFixture();
    const before = await token.totalSupply();
    await expect(token.connect(alice).burnFrom(deployer.address, 1n))
      .to.be.revertedWithCustomError(token, "ERC20InsufficientAllowance")
      .withArgs(alice.address, 0n, 1n);
    expect(await token.totalSupply()).to.equal(before);
  });

  it("exposes no owner or administrative ownership methods", async () => {
    const { token } = await deployFixture();
    for (const method of ["owner", "transferOwnership", "renounceOwnership"]) {
      expect(token.interface.hasFunction(method)).to.equal(false);
    }
  });
});
