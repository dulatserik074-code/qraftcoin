import test from "node:test";
import assert from "node:assert/strict";
import { validateEnvironment } from "../server/environment";
import { health } from "../server/healthService";
import { emailService } from "../server/emailService";
import { logEvent, requestContext } from "../server/logger";
const valid = { NODE_ENV: "production", DATABASE_URL: "postgresql://example:placeholder@db.example.test/pilot", AUTH_SECRET: "a".repeat(48), RATE_LIMIT_SECRET: "b".repeat(48), NEXT_PUBLIC_APP_URL: "https://qazloyal.example.test", EMAIL_PROVIDER: "resend", EMAIL_API_KEY: "qa-placeholder-key", EMAIL_FROM: "pilot@example.test", BLOCKCHAIN_ENABLED: "false" };
test("production env requires HTTPS, PostgreSQL, secret and email configuration without exposing values", () => {
  validateEnvironment(valid);
  for (const key of ["DATABASE_URL", "AUTH_SECRET", "RATE_LIMIT_SECRET", "NEXT_PUBLIC_APP_URL", "EMAIL_PROVIDER", "EMAIL_API_KEY", "EMAIL_FROM", "NODE_ENV"]) assert.throws(() => validateEnvironment({ ...valid, [key]: "" }), /configuration error/);
  for (const change of [{ DATABASE_URL: "file:sqlite.db" }, { NEXT_PUBLIC_APP_URL: "http://localhost:3107" }, { EMAIL_PROVIDER: "console" }, { APP_URL: "https://foreign.example.test" }, { AUTH_SECRET: "development-secret" }, { BLOCKCHAIN_ENABLED: "true" }]) assert.throws(() => validateEnvironment({ ...valid, ...change }));
  assert.throws(() => validateEnvironment({ ...valid, DATABASE_URL: "secret-value-invalid" }), e => e instanceof Error && !e.message.includes("secret-value-invalid"));
});
test("health returns safe status, version and timestamp for success and failure", async () => {
  const old = process.env; process.env = { ...valid, NODE_ENV: "production" };
  try {
  const good = await health(async () => 1); assert.equal(good.statusCode, 200); assert.equal(good.body.version, "0.4.1");
  const bad = await health(async () => { throw Error("postgres://secret:password@internal/secret"); }); assert.equal(bad.statusCode, 503); assert.equal(bad.body.database, "unavailable"); assert.ok(!JSON.stringify(bad).includes("password"));
  } finally { process.env = old; }
});
test("structured logging uses an allowlist and request correlation", () => {
  const output: string[] = []; const original = console.info;
  console.info = (line: string) => { output.push(line); };
  try { requestContext.run({ requestId: "qa-request-id" }, () => logEvent("login_failed", { category: "invalid_credentials", ...{ password: "secret-password", token: "secret-token" } })); }
  finally { console.info = original; }
  assert.match(output[0], /qa-request-id/); assert.ok(!output[0].includes("secret-"));
});
test("production email rejects console delivery and never prints raw action links", async () => {
  const old = { NODE_ENV: process.env.NODE_ENV, EMAIL_PROVIDER: process.env.EMAIL_PROVIDER }; const output: unknown[] = []; const original = console.info;
  Object.assign(process.env, { NODE_ENV: "production", EMAIL_PROVIDER: "console" }); console.info = (...args) => { output.push(args); };
  try { await assert.rejects(emailService.send({ to: "fixture@example.test", subject: "Reset", text: "raw-token-placeholder" })); assert.deepEqual(output, []); }
  finally { console.info = original; for (const [key,value] of Object.entries(old)) { if(value === undefined) delete process.env[key]; else process.env[key]=value; } }
});

test("explicit disabled email permits core production configuration but cannot deliver or log mail", async () => {
  const disabled = { ...valid, EMAIL_PROVIDER: "disabled", EMAIL_API_KEY: "", EMAIL_FROM: "" };
  assert.equal(validateEnvironment(disabled).emailProvider, "disabled");
  const old = process.env; const oldFetch = globalThis.fetch; const oldLog = console.info;
  let fetched = false; const output: unknown[] = [];
  process.env = { ...disabled, NODE_ENV: "production" };
  globalThis.fetch = async () => { fetched = true; throw Error("must not send"); };
  console.info = (...args) => { output.push(args); };
  try {
    assert.equal((await health(async () => 1)).statusCode, 200);
    await assert.rejects(emailService.send({to:"fixture@example.test",subject:"Reset",text:"private-action-token"}), /Email provider not configured/);
    assert.equal(fetched, false); assert.deepEqual(output, []);
  } finally { process.env = old; globalThis.fetch = oldFetch; console.info = oldLog; }
});
