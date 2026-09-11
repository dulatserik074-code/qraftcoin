import test, { after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { db } from "../../server/db";
import { authLimits, limitAuth, limitAuthIp, RateLimitError } from "../../server/rateLimit";
import { login, register } from "../../server/authService";
import { requestPasswordReset, resetMessage } from "../../server/passwordService";
const password = "Synthetic-Security-Password-2026!";
const email = () => `security-${randomUUID()}@example.test`;
after(async () => { await db.$disconnect(); });
test("PostgreSQL atomic limiter isolates IP A from B and stores only HMAC", async () => {
  const old = process.env.TRUSTED_PROXY; process.env.TRUSTED_PROXY = "netlify";
  try {
    const a = { headers: new Headers({ "x-nf-client-connection-ip": "192.0.2.101" }) };
    const b = { headers: new Headers({ "x-nf-client-connection-ip": "192.0.2.102" }) };
    for (let i=0; i<authLimits.login.ip; i++) await limitAuthIp(a, "login");
    await assert.rejects(limitAuthIp(a, "login"), (e: unknown) => e instanceof RateLimitError && e.status === 429 && e.retryAfter > 0 && e.retryAfter <= 300);
    const account = await register({ email: email(), password });
    await limitAuthIp(b, "login"); assert.equal((await login({ email: account.email, password })).id, account.id);
    const rows = await db.rateLimit.findMany(); assert.ok(rows.every(r => /^[a-f0-9]{64}$/.test(r.key)));
  } finally { if (old === undefined) delete process.env.TRUSTED_PROXY; else process.env.TRUSTED_PROXY = old; }
});
test("normalized account limit does not block a different email at the same allowed IP", async () => {
  const first = email(), second = await register({ email: email(), password });
  for (let i=0; i<authLimits.login.account; i++) await assert.rejects(login({ email: first, password }), /Invalid email or password/);
  await assert.rejects(login({ email: ` ${first.toUpperCase()} `, password }), RateLimitError);
  assert.equal((await login({ email: second.email, password })).id, second.id);
});
test("reset known/unknown respond identically, defer mail, apply same account ceiling", async () => {
  const existing = await register({ email: email(), password }), unknown = email();
  const jobs: (() => Promise<void>)[] = []; let sent = 0;
  const mail = { async send() { sent++; } };
  for (let i=0; i<5; i++) for (const address of [existing.email,unknown]) {
    const start = performance.now();
    assert.deepEqual(await requestPasswordReset({ email: address }, mail, job => jobs.push(job)), { message: resetMessage });
    assert.ok(performance.now() - start >= 340, "No immediate unknown-account return");
  }
  assert.equal(sent, 0); assert.equal(jobs.length, 5);
  for (const address of [existing.email,unknown]) await assert.rejects(requestPasswordReset({ email: address }, mail), RateLimitError);
  await jobs.at(-1)!(); assert.equal(sent, 1);
});
test("concurrent increments cannot bypass limiter across concurrent requests", async () => {
  const key = `concurrent:${randomUUID()}`;
  const results = await Promise.allSettled(Array.from({ length: 15 }, () => limitAuth(key, 5)));
  assert.equal(results.filter(r => r.status === "fulfilled").length, 5);
  assert.equal(results.filter(r => r.status === "rejected" && r.reason instanceof RateLimitError).length, 10);
});
