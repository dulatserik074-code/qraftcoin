import test from "node:test";
import assert from "node:assert/strict";
import { calculatePoints, credentials, minorUnits, rewardInput } from "../server/input";
test("persistent money parsing and rewards avoid floating point", () => {
  assert.equal(minorUnits("10000"), 1000000n);
  assert.equal(calculatePoints(minorUnits("10000"), 500), 500n);
  assert.equal(minorUnits("0.29"), 29n);
  assert.equal(calculatePoints(minorUnits("19.99"), 500), 0n);
  assert.throws(() => minorUnits("1.001")); assert.throws(() => minorUnits("1e9")); assert.throws(() => minorUnits("-1"));
});
test("schema rejects mass assignment and invalid identity/points", () => {
  assert.throws(() => credentials.parse({ email: "x@example.test", password: "LongPassword123!", role: "EMPLOYEE" }));
  assert.throws(() => rewardInput.parse({ type: "REDEEM", customerId: "bad", points: "-1", idempotencyKey: "bad" }));
});
