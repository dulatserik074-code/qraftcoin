import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { db } from "../../server/db";
import { register, login, createSession, getUser, type Actor } from "../../server/authService";
import { requestPasswordReset, resetPassword, resetMessage } from "../../server/passwordService";
import { inviteEmployee, acceptInvitation, listEmployees, setEmployeeAccess, revokeInvitation } from "../../server/employeeService";
import { createBusiness, requireBusiness, updateBusiness, listBusinesses } from "../../server/businessService";
import { listCustomers, requireCustomer, findByPublicId } from "../../server/customerService";
import { transactionHistory } from "../../server/transactionService";
import { transactReward } from "../../server/loyaltyService";
import { health } from "../../server/healthService";
import { tokenHash } from "../../server/tokens";
import type { EmailMessage, EmailService } from "../../server/emailService";
const password = "Synthetic-Pilot-Test-Password-2026!";
const nextPassword = "Replacement-Pilot-Test-Password-2026!";
let owner: Actor, other: Actor, businessId: string, foreignId: string, customerId: string, publicId: string, employee: Actor;
const mailbox: EmailMessage[] = []; const mail: EmailService = { async send(message) { mailbox.push(message); } };
const lastToken = () => new URLSearchParams(new URL(mailbox.at(-1)!.text.match(/https?:\/\/\S+/)![0]).hash.slice(1)).get("token")!;
const address = () => `pilot-${randomUUID()}@example.test`;
before(async () => {
  if (!process.env.DATABASE_URL || process.env.DATABASE_URL !== process.env.TEST_DATABASE_URL || !new URL(process.env.DATABASE_URL).pathname.endsWith("_test")) throw Error("Use isolated *_test PostgreSQL");
  owner = await register({ email: address(), password }); other = await register({ email: address(), password });
  const input = { business: { name: "Pilot fixture", currency: "KZT", rewardRateBps: 500 }, customer: { name: "Ayan" } };
  businessId = (await createBusiness(owner, input)).id; foreignId = (await createBusiness(other, input)).id;
  const member = (await listCustomers(owner, businessId, {})).items[0]; customerId = member.customerId; publicId = member.publicId;
});
after(async () => { await db.$disconnect(); });
test("login rejects wrong password and unknown account with identical error", async () => {
  for (const email of [owner.email, address()]) await assert.rejects(login({ email, password: nextPassword }), /Invalid email or password/);
});
test("reset request is generic, stores only hash, ignores email delivery failure", async () => {
  assert.equal((await requestPasswordReset({ email: owner.email }, mail)).message, resetMessage);
  const raw = lastToken(); const record = await db.passwordReset.findUniqueOrThrow({ where: { tokenHash: tokenHash(raw) } }); assert.notEqual(record.tokenHash, raw);
  const before = mailbox.length; assert.equal((await requestPasswordReset({ email: address() }, mail)).message, resetMessage); assert.equal(mailbox.length, before);
  assert.equal((await requestPasswordReset({ email: other.email }, { async send() { throw Error("provider unavailable"); } })).message, resetMessage);
});
test("reset expires, succeeds once, invalidates every old token/session and stale login", async () => {
  const account = await register({ email: address(), password }); const oldLogin = await login({ email: account.email, password }); const session = await createSession(account.id, oldLogin.authVersion);
  await requestPasswordReset({ email: account.email }, mail); const expired = lastToken();
  await db.passwordReset.update({ where: { tokenHash: tokenHash(expired) }, data: { expiresAt: new Date(0) } }); await assert.rejects(resetPassword({ token: expired, password: nextPassword }), /expired/);
  await requestPasswordReset({ email: account.email }, mail); const earlier = lastToken();
  await requestPasswordReset({ email: account.email }, mail); const current = lastToken();
  await assert.rejects(resetPassword({ token: earlier, password: nextPassword }), /expired/);
  const results = await Promise.allSettled([1,2].map(() => resetPassword({ token: current, password: nextPassword }))); assert.equal(results.filter(r => r.status === "fulfilled").length, 1);
  await assert.rejects(resetPassword({ token: current, password: nextPassword }), /expired/);
  assert.equal(await getUser(session.token), null); await assert.rejects(createSession(account.id, oldLogin.authVersion), /sign in again/);
  await assert.rejects(login({ email: account.email, password }), /Invalid/); assert.equal((await login({ email: account.email, password: nextPassword })).id, account.id);
});
test("owner invitation hashes token; foreign actor denied; accepts once as employee", async () => {
  const email = address(); const invite = await inviteEmployee(owner, businessId, { email }, mail); const token = lastToken();
  assert.ok(!JSON.stringify(invite).includes(token)); assert.ok(!("tokenHash" in invite)); assert.equal((await db.invitation.findUniqueOrThrow({ where: { id: invite.id } })).tokenHash, tokenHash(token));
  await assert.rejects(acceptInvitation({ token, password }, other), /not found/);
  await acceptInvitation({ token, password }); await assert.rejects(acceptInvitation({ token, password }), /expired/);
  employee = await login({ email, password }); assert.equal(employee.role, "EMPLOYEE"); assert.equal((await listBusinesses(employee))[0].id, businessId);
});
test("expired and revoked invitations cannot be accepted, foreign invitations cannot be revoked", async () => {
  const first = await inviteEmployee(owner, businessId, { email: address() }, mail); const expired = lastToken();
  await db.invitation.update({ where: { id: first.id }, data: { expiresAt: new Date(0) } }); await assert.rejects(acceptInvitation({ token: expired, password }), /expired/);
  const second = await inviteEmployee(owner, businessId, { email: address() }, mail); const revoked = lastToken();
  await assert.rejects(revokeInvitation(other, foreignId, second.id), /not found/); await revokeInvitation(owner, businessId, second.id); await assert.rejects(acceptInvitation({ token: revoked, password }), /expired/);
});
test("employee performs attributed EARN/REDEEM but cannot manage settings/team/foreign data", async () => {
  const first = await transactReward(employee, businessId, { type: "EARN", customerId, purchaseAmount: "10000", idempotencyKey: randomUUID() }); assert.equal(first.transaction?.points, 500n);
  await transactReward(employee, businessId, { type: "REDEEM", customerId, points: "100", idempotencyKey: randomUUID() }); assert.equal((await requireCustomer(owner, businessId, customerId)).pointsBalance, 400n);
  const history = await transactionHistory(owner, businessId, {}); assert.equal(history.items[0].employee?.email, employee.email);
  await assert.rejects(updateBusiness(employee, businessId, { name: "Denied", rewardRateBps: 100 }), /Only the owner/);
  await assert.rejects(inviteEmployee(employee, businessId, { email: address() }, mail), /Only the owner/);
  await assert.rejects(listEmployees(employee, businessId), /Only the owner/);
  await assert.rejects(setEmployeeAccess(other, foreignId, employee.id, { active: false }), /not found/);
  await assert.rejects(findByPublicId(other, foreignId, publicId), /not found/);
  await assert.rejects(requireBusiness(employee, foreignId), /not found/);
  await assert.rejects(transactionHistory(employee, foreignId, {}), /not found/);
  for (const type of ["EARN", "REDEEM"]) await assert.rejects(transactReward(employee, foreignId, { type, customerId, idempotencyKey: randomUUID(), ...(type === "EARN" ? { purchaseAmount: "10000" } : { points: "1" }) }), /not found/);
});
test("disable denies existing session business access, restore preserves attribution and balance", async () => {
  const session = await createSession(employee.id); await setEmployeeAccess(owner, businessId, employee.id, { active: false });
  const actor = await getUser(session.token); assert.ok(actor); assert.deepEqual(await listBusinesses(actor), []);
  await assert.rejects(requireCustomer(actor, businessId, customerId), /not found/);
  await assert.rejects(transactReward(actor, businessId, { type: "REDEEM", customerId, points: "1", idempotencyKey: randomUUID() }), /not found/);
  await assert.rejects(inviteEmployee(owner, businessId, { email: employee.email }, mail), /already exists/);
  await setEmployeeAccess(owner, businessId, employee.id, { active: true }); assert.equal((await requireCustomer(actor, businessId, customerId)).pointsBalance, 400n);
});
test("new rate affects future EARN only; existing transactions unchanged", async () => {
  const before = await transactionHistory(owner, businessId, {}); await updateBusiness(owner, businessId, { name: "Pilot fixture", rewardRateBps: 1000 });
  const next = await transactReward(owner, businessId, { type: "EARN", customerId, purchaseAmount: "10000", idempotencyKey: randomUUID() }); assert.equal(next.transaction?.points, 1000n);
  assert.equal((await db.loyaltyTransaction.findUniqueOrThrow({ where: { id: before.items.find(t => t.type === "EARN")!.id } })).points, 500n);
});
test("health reaches actual PostgreSQL", async () => { assert.equal((await health()).statusCode, 200); });
test("existing account invitation requires its password and cannot overwrite credentials", async () => {
  const account = await register({ email: address(), password }); await inviteEmployee(owner, businessId, { email: account.email }, mail); const token = lastToken();
  await assert.rejects(acceptInvitation({ token, password: nextPassword }), /Check your account password/); await acceptInvitation({ token, password }); assert.equal((await login({ email: account.email, password })).role, "EMPLOYEE");
});
