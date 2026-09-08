import { expect } from "chai";
import { ethers } from "hardhat";

describe("QraftPayment", function () {
  async function deployFixture() {
    const [deployer, user, treasury] = await ethers.getSigners();
    const token = await ethers.deployContract("QraftCoin");
    const payment = await ethers.deployContract("QraftPayment", [await token.getAddress(), treasury.address]);
    await token.transfer(user.address, ethers.parseEther("200"));
    return { token, payment, deployer, user, treasury };
  }

  it("publishes a fixed transparent 5% burn rate", async () => {
    const { payment } = await deployFixture();
    expect(await payment.BURN_RATE_BPS()).to.equal(500);
  });

  it("sends 95% to treasury and burns 5%", async () => {
    const { token, payment, user, treasury } = await deployFixture();
    const amount = ethers.parseEther("100");
    const beforeSupply = await token.totalSupply();
    await token.connect(user).approve(await payment.getAddress(), amount);
    await expect(payment.connect(user).pay(amount))
      .to.emit(payment, "ServicePaid")
      .withArgs(user.address, amount, ethers.parseEther("95"), ethers.parseEther("5"));
    expect(await token.balanceOf(treasury.address)).to.equal(ethers.parseEther("95"));
    expect(await token.balanceOf(user.address)).to.equal(ethers.parseEther("100"));
    expect(await token.totalSupply()).to.equal(beforeSupply - ethers.parseEther("5"));
  });

  it("rejects zero amounts and invalid constructor addresses", async () => {
    const { token, payment, user, treasury } = await deployFixture();
    await expect(payment.connect(user).pay(0)).to.be.revertedWithCustomError(payment, "ZeroPayment");
    const factory = await ethers.getContractFactory("QraftPayment");
    await expect(factory.deploy(ethers.ZeroAddress, treasury.address)).to.be.revertedWithCustomError(factory, "InvalidToken");
    await expect(factory.deploy(await token.getAddress(), ethers.ZeroAddress)).to.be.revertedWithCustomError(factory, "InvalidTreasury");
  });

  it("accounts correctly across multiple payments", async () => {
    const { token, payment, user, treasury } = await deployFixture();
    const paymentAddress = await payment.getAddress();
    const supplyBefore = await token.totalSupply();
    await token.connect(user).approve(paymentAddress, ethers.parseEther("150"));
    await payment.connect(user).pay(ethers.parseEther("100"));
    await payment.connect(user).pay(ethers.parseEther("50"));
    expect(await token.balanceOf(treasury.address)).to.equal(ethers.parseEther("142.5"));
    expect(await token.balanceOf(user.address)).to.equal(ethers.parseEther("50"));
    expect(await token.totalSupply()).to.equal(supplyBefore - ethers.parseEther("7.5"));
  });

  it("reverts atomically when allowance is insufficient", async () => {
    const { token, payment, user, treasury } = await deployFixture();
    const supplyBefore = await token.totalSupply();
    await token.connect(user).approve(await payment.getAddress(), ethers.parseEther("99"));
    await expect(payment.connect(user).pay(ethers.parseEther("100"))).to.be.reverted;
    expect(await token.balanceOf(treasury.address)).to.equal(0);
    expect(await token.totalSupply()).to.equal(supplyBefore);
  });

  it("reverts atomically when balance is insufficient", async () => {
    const { token, payment, user, treasury } = await deployFixture();
    const amount = ethers.parseEther("201");
    const supplyBefore = await token.totalSupply();
    await token.connect(user).approve(await payment.getAddress(), amount);
    await expect(payment.connect(user).pay(amount)).to.be.reverted;
    expect(await token.balanceOf(treasury.address)).to.equal(0);
    expect(await token.totalSupply()).to.equal(supplyBefore);
  });

  it("rounds the burn down for indivisible wei without losing value", async () => {
    const { token, payment, user, treasury } = await deployFixture();
    const paymentAddress = await payment.getAddress();
    const supplyBefore = await token.totalSupply();
    await token.connect(user).approve(paymentAddress, 19n);
    await expect(payment.connect(user).pay(19n))
      .to.emit(payment, "ServicePaid").withArgs(user.address, 19n, 19n, 0n);
    expect(await token.balanceOf(treasury.address)).to.equal(19n);
    expect(await token.totalSupply()).to.equal(supplyBefore);

    await token.connect(user).approve(paymentAddress, 20n);
    await expect(payment.connect(user).pay(20n))
      .to.emit(payment, "ServicePaid").withArgs(user.address, 20n, 19n, 1n);
    expect(await token.balanceOf(treasury.address)).to.equal(38n);
    expect(await token.totalSupply()).to.equal(supplyBefore - 1n);
  });
});
