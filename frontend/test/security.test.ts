import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { getTrustedClientIp, normalizeIp } from "../server/clientIp";
import { securityHeaders } from "../securityHeaders";
import { getServerEnv } from "../server/env";
import { health } from "../server/healthService";
test("trusted IP ignores spoofed forwarding, validates and normalizes IPv4/IPv6", () => {
  const request = { headers: new Headers({ "x-forwarded-for": "1.2.3.4", "x-real-ip": "192.0.2.8", "x-nf-client-connection-ip": "2001:0DB8:0:0:0:0:0:1" }) };
  assert.equal(getTrustedClientIp(request, "none"), "unresolved-client");
  assert.equal(getTrustedClientIp(request, "netlify"), "2001:db8::1");
  assert.equal(getTrustedClientIp(request, "trusted-proxy"), "192.0.2.8");
  for (const ip of ["garbage", "192.0.2.1, 192.0.2.2", "[::1]", "fe80::1%eth0", "192.0.2.1:9000"]) assert.equal(normalizeIp(ip), null);
  assert.equal(normalizeIp("::ffff:192.0.2.8"), "192.0.2.8");
  assert.equal(normalizeIp("::ffff:c000:208"), "192.0.2.8");
  request.headers.delete("x-nf-client-connection-ip");
  assert.equal(getTrustedClientIp(request, "netlify"), "unresolved-client");
});
test("runtime environment fails closed and health hides configuration without npm start", async () => {
  const old = { ...process.env };
  try {
    Object.assign(process.env, { NODE_ENV: "production", DATABASE_URL: "postgresql://fixture:placeholder@db.example.test/test", AUTH_SECRET: "a".repeat(48), RATE_LIMIT_SECRET: "b".repeat(48), NEXT_PUBLIC_APP_URL: "https://fixture.example.test", APP_URL: "https://fixture.example.test", EMAIL_PROVIDER: "resend", EMAIL_API_KEY: "qa-placeholder-key", EMAIL_FROM: "fixture@example.test", BLOCKCHAIN_ENABLED: "false" });
    for (const key of ["AUTH_SECRET", "DATABASE_URL", "RATE_LIMIT_SECRET"]) {
      const value = process.env[key]; delete process.env[key];
      assert.throws(getServerEnv, new RegExp("configuration error: " + key));
      let probed = false;
      const result = await health(() => { probed = true; throw Error("must not reach database"); });
      assert.equal(probed, false);
      assert.equal(result.statusCode, 503);
      assert.deepEqual(Object.keys(result.body).sort(), ["database", "status", "timestamp", "version"]);
      assert.ok(!JSON.stringify(result).includes(key));
      if (value !== undefined) process.env[key] = value;
    }
  } finally { process.env = old; }
});
test("server config rejects import outside server condition", () => {
  const result = spawnSync(process.execPath, ["--import", "tsx", "--eval", "import('./server/env.ts')"], { encoding: "utf8", env: { ...process.env, NODE_OPTIONS: "" } });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /cannot be imported from a Client Component/);
});
test("CSP and headers are strict in production, HSTS only for production HTTPS", () => {
  const headers = Object.fromEntries(securityHeaders(true, "https://example.test").map(h => [h.key, h.value]));
  const csp = headers["Content-Security-Policy"];
  for (const directive of ["default-src 'self'", "script-src", "style-src", "img-src", "connect-src", "font-src", "frame-ancestors 'none'", "base-uri 'self'", "form-action 'self'", "object-src 'none'"]) assert.ok(csp.includes(directive));
  assert.ok(!csp.includes("unsafe-eval")); assert.ok(!csp.includes("default-src *"));
  assert.equal(headers["X-Content-Type-Options"], "nosniff"); assert.equal(headers["Referrer-Policy"], "no-referrer"); assert.ok(headers["Permissions-Policy"]); assert.ok(headers["Strict-Transport-Security"]);
  for (const pair of [[false,"https://example.test"],[true,"http://localhost"]] as const) assert.ok(!securityHeaders(pair[0], pair[1]).some(h => h.key === "Strict-Transport-Security"));
});
