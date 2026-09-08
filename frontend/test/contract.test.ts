import test from "node:test";
import assert from "node:assert/strict";
import { assertQFCMetadata } from "../lib/contract";
test("accepts official QFC metadata", () => {
  assert.doesNotThrow(() => assertQFCMetadata("Qraft Coin", "QFC", 18n));
});
test("rejects a different token or decimal scale before wallet writes", () => {
  assert.throws(() => assertQFCMetadata("Qraft Coin", "OTHER", 18n), /Expected Qraft Coin/);
  assert.throws(() => assertQFCMetadata("Other", "QFC", 18n), /Expected Qraft Coin/);
  assert.throws(() => assertQFCMetadata("Qraft Coin", "QFC", 6n), /Expected Qraft Coin/);
});
