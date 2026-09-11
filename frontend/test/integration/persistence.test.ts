import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { db } from "../../server/db";
import { register, login, createSession, getUser, logout, limitAuth, type Actor } from "../../server/authService";
import { createBusiness, requireBusiness, updateBusiness } from "../../server/businessService";
import { createCustomer, requireCustomer, listCustomers, findByPublicId } from "../../server/customerService";
import { transactReward } from "../../server/loyaltyService";
import { transactionHistory } from "../../server/transactionService";
import { analytics } from "../../server/analyticsService";
let owner: Actor, other: Actor, businessId: string, customerId: string, otherBusinessId: string, otherCustomerId: string;
const password = "Test-only-LongPassword-2026!";
const email = `owner-${randomUUID()}@example.test`;
const onboarding = (name: string) => ({ business: { name, currency: "KZT", rewardRateBps: 500 }, customer: { name: "Ayan" } });
const command = (id: string, key = randomUUID()) => ({ type: "EARN", customerId: id, purchaseAmount: "10000", idempotencyKey: key });
before(async () => {
  if (!process.env.DATABASE_URL || process.env.DATABASE_URL !== process.env.TEST_DATABASE_URL || !new URL(process.env.DATABASE_URL).pathname.endsWith("_test")) throw new Error("Integration tests require an explicitly configured *_test database via TEST_DATABASE_URL = DATABASE_URL");
  owner = await register({ email, password }); other = await register({ email: `other-${randomUUID()}@example.test`, password });
  const business = await createBusiness(owner, onboarding("Qaz Coffee")); businessId = business.id;
  customerId = (await listCustomers(owner, businessId, {})).items[0].customerId;
  const otherBusiness = await createBusiness(other, onboarding("Other business")); otherBusinessId = otherBusiness.id;
  otherCustomerId = (await listCustomers(other, otherBusinessId, {})).items[0].customerId;
});
after(async () => { await db.$disconnect(); });
test("registration stores a password hash and rejects duplicate email", async () => {
  const record = await db.user.findUniqueOrThrow({ where: { id: owner.id } });
  assert.notEqual(record.passwordHash, password); assert.match(record.passwordHash, /^\$2/);
  await assert.rejects(register({ email, password }), /register this email/);
});
test("login, session persistence, expiration and logout", async () => {
  assert.equal((await login({ email, password })).id, owner.id);
  await assert.rejects(login({ email, password: "IncorrectPassword123!" }), /Invalid email/);
  const session = await createSession(owner.id); assert.equal((await getUser(session.token))?.id, owner.id);
  await logout(session.token); assert.equal(await getUser(session.token), null);
  const expiring = await createSession(owner.id);
  await db.session.updateMany({ where: { userId: owner.id }, data: { expiresAt: new Date(0) } });
  assert.equal(await getUser(expiring.token), null);
});
test("auth rate limiting is persistent and enforced", async () => {
  const key = `test-limit-${randomUUID()}`; await limitAuth(key, 1); await assert.rejects(limitAuth(key, 1), /Too many attempts/);
});
test("onboarding creates business and first customer atomically", async () => {
  assert.equal((await requireBusiness(owner, businessId)).rewardRateBps, 500);
  assert.equal((await requireCustomer(owner, businessId, customerId)).customer.name, "Ayan");
  await assert.rejects(createBusiness(owner, onboarding("Duplicate")), /already exists/);
});
test("create and search customer with a tenant-scoped QR identifier", async () => {
  const created = await createCustomer(owner, businessId, { name: "Dana", phone: "+77001234567" });
  assert.equal((await listCustomers(owner, businessId, { query: "Dana" })).items.length, 1);
  assert.equal((await findByPublicId(owner, businessId, created.publicId)).customerId, created.customerId);
  await assert.rejects(findByPublicId(other, otherBusinessId, created.publicId), /Customer not found/);
});
test("tenant isolation blocks customer, transactions, analytics and settings", async () => {
  await assert.rejects(requireCustomer(owner, businessId, otherCustomerId), /Customer not found/);
  await assert.rejects(requireCustomer(owner, otherBusinessId, otherCustomerId), /Business not found/);
  await assert.rejects(transactionHistory(owner, otherBusinessId, {}), /Business not found/);
  await assert.rejects(analytics(owner, otherBusinessId), /Business not found/);
  await assert.rejects(updateBusiness(owner, otherBusinessId, { name: "Hacked", rewardRateBps: 0 }), /Business not found/);
  await assert.rejects(transactReward(owner, businessId, command(otherCustomerId)), /Customer not found/);
});
test("employee access requires assigned membership; customers cannot act as staff", async () => {
  const employee = await db.user.create({ data: { email: `${randomUUID()}@example.test`, passwordHash: "test-fixture-not-login", role: "EMPLOYEE" } });
  await assert.rejects(requireBusiness(employee, businessId), /not found/);
  await db.businessStaff.create({ data: { businessId, userId: employee.id } });
  assert.equal((await requireBusiness(employee, businessId)).id, businessId);
  await assert.rejects(updateBusiness(employee, businessId, { name: "No", rewardRateBps: 0 }), /Only the owner/);
  await assert.rejects(requireBusiness({ ...employee, role: "CUSTOMER" }, businessId), /not found/);
});
test("rewards persist across a new Prisma connection", async () => {
  const result = await transactReward(owner, businessId, command(customerId)); assert.equal(result.transaction?.points, 500n);
  const connection = new PrismaClient();
  try { const member = await connection.businessCustomer.findUniqueOrThrow({ where: { businessId_customerId: { businessId, customerId } } }); assert.equal(member.pointsBalance, 500n); assert.equal(member.totalSpent, 1000000n); }
  finally { await connection.$disconnect(); }
});
test("insufficient points produce no ledger entry; redeem updates balance", async () => {
  const before = await transactionHistory(owner, businessId, {}, customerId);
  await assert.rejects(transactReward(owner, businessId, { type: "REDEEM", customerId, points: "800", idempotencyKey: randomUUID() }), /Insufficient/);
  assert.equal((await transactionHistory(owner, businessId, {}, customerId)).total, before.total);
  await transactReward(owner, businessId, { type: "REDEEM", customerId, points: "100", idempotencyKey: randomUUID() });
  assert.equal((await requireCustomer(owner, businessId, customerId)).pointsBalance, 400n);
});
test("concurrent duplicate keys credit only once; changed payload conflicts", async () => {
  const input = command(customerId); const results = await Promise.all([transactReward(owner, businessId, input), transactReward(owner, businessId, input)]);
  assert.equal(results[0].transaction?.id, results[1].transaction?.id);
  assert.equal((await requireCustomer(owner, businessId, customerId)).pointsBalance, 900n);
  await assert.rejects(transactReward(owner, businessId, { ...input, purchaseAmount: "20000" }), /different request/);
});
test("concurrent redemptions cannot overdraw", async () => {
  const results = await Promise.allSettled([1, 2].map(() => transactReward(owner, businessId, { type: "REDEEM", customerId, points: "800", idempotencyKey: randomUUID() })));
  assert.equal(results.filter(r => r.status === "fulfilled").length, 1);
  assert.equal((await requireCustomer(owner, businessId, customerId)).pointsBalance, 100n);
});
test("a failing balance update rolls back the already inserted ledger transaction", async () => {
  const member = await createCustomer(other, otherBusinessId, { name: "Rollback fixture" });
  // Test-only trigger in an explicitly isolated *_test database; never installed in production.
  await db.$executeRawUnsafe(`CREATE FUNCTION test_reject_balance() RETURNS trigger AS $$ BEGIN IF NEW."customerId" = '${member.customerId}'::uuid THEN RAISE EXCEPTION 'injected balance failure'; END IF; RETURN NEW; END; $$ LANGUAGE plpgsql`);
  await db.$executeRawUnsafe('CREATE TRIGGER test_reject_balance BEFORE UPDATE ON "BusinessCustomer" FOR EACH ROW EXECUTE FUNCTION test_reject_balance()');
  try {
    await assert.rejects(transactReward(other, otherBusinessId, command(member.customerId)));
    assert.equal((await transactionHistory(other, otherBusinessId, {}, member.customerId)).total, 0);
    assert.equal((await requireCustomer(other, otherBusinessId, member.customerId)).pointsBalance, 0n);
  } finally { await db.$executeRawUnsafe('DROP TRIGGER test_reject_balance ON "BusinessCustomer"'); await db.$executeRawUnsafe('DROP FUNCTION test_reject_balance()'); }
});
test("transaction history, pagination and analytics use real data", async () => {
  const data = await analytics(owner, businessId);
  assert.equal(data.totalCustomers, 2); assert.equal(data.activeCustomers, 1); assert.equal(data.returningCustomers, 1);
  assert.equal(data.pointsIssued, 1000n); assert.equal(data.pointsRedeemed, 900n); assert.equal(data.revenueTracked, 2000000n); assert.equal(data.repeatPurchaseRateBps, 10000);
  assert.equal((await transactionHistory(owner, businessId, {})).total, 4);
  assert.equal((await transactionHistory(owner, businessId, { page: 2 })).items.length, 0);
  await assert.rejects(transactionHistory(owner, businessId, { page: -1 }));
});
test("zero rewards do not mutate ledger; ledger rejects updates", async () => {
  const before = await transactionHistory(owner, businessId, {});
  const result = await transactReward(owner, businessId, { ...command(customerId), purchaseAmount: "1" });
  assert.equal(result.transaction, null); assert.equal((await transactionHistory(owner, businessId, {})).total, before.total);
  await assert.rejects(db.loyaltyTransaction.update({ where: { id: before.items[0].id }, data: { points: 999999n } }), /append-only/);
});

test("concurrent duplicate redemption is committed once and can be replayed after balance is exhausted", async () => {
  const member = await createCustomer(other, otherBusinessId, { name: "Redeem replay fixture" });
  await transactReward(other, otherBusinessId, command(member.customerId));
  const input = { type: "REDEEM", customerId: member.customerId, points: "500", idempotencyKey: randomUUID() };
  const results = await Promise.all([transactReward(other, otherBusinessId, input), transactReward(other, otherBusinessId, input)]);
  assert.equal(results[0].transaction?.id, results[1].transaction?.id);
  assert.equal(results.filter(result => result.replayed).length, 1);
  assert.equal((await requireCustomer(other, otherBusinessId, member.customerId)).pointsBalance, 0n);
  const replay = await transactReward(other, otherBusinessId, input);
  assert.equal(replay.transaction?.id, results[0].transaction?.id);
  assert.equal(replay.replayed, true);
  assert.equal((await transactionHistory(other, otherBusinessId, {}, member.customerId)).total, 2);
  await assert.rejects(transactReward(other, otherBusinessId, { ...input, points: "1" }), /different request/);
  assert.equal((await requireCustomer(other, otherBusinessId, member.customerId)).pointsBalance, 0n);
});

test("idempotency replays retain their original reward after rate changes", async () => {
  const member = await createCustomer(other, otherBusinessId, { name: "Rate replay fixture" });
  const input = command(member.customerId);
  const first = await transactReward(other, otherBusinessId, input);
  const business = await requireBusiness(other, otherBusinessId);
  try {
    await updateBusiness(other, otherBusinessId, { name: business.name, rewardRateBps: 1000 });
    const replay = await transactReward(other, otherBusinessId, input);
    assert.equal(replay.transaction?.id, first.transaction?.id);
    assert.equal(replay.transaction?.points, 500n);
    assert.equal((await requireCustomer(other, otherBusinessId, member.customerId)).pointsBalance, 500n);
    assert.equal((await transactionHistory(other, otherBusinessId, {}, member.customerId)).total, 1);
  } finally { await updateBusiness(other, otherBusinessId, { name: business.name, rewardRateBps: business.rewardRateBps }); }
});

test("the same request key is independently scoped to each business", async () => {
  const a = await createCustomer(owner, businessId, { name: "Scoped key A" });
  const b = await createCustomer(other, otherBusinessId, { name: "Scoped key B" });
  const key = randomUUID();
  const [first, second] = await Promise.all([transactReward(owner, businessId, command(a.customerId, key)), transactReward(other, otherBusinessId, command(b.customerId, key))]);
  assert.notEqual(first.transaction?.id, second.transaction?.id);
  assert.equal((await requireCustomer(owner, businessId, a.customerId)).pointsBalance, 500n);
  assert.equal((await requireCustomer(other, otherBusinessId, b.customerId)).pointsBalance, 500n);
  await assert.rejects(transactReward(owner, otherBusinessId, command(b.customerId, key)), /Business not found/);
});
