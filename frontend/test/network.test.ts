import assert from "node:assert/strict";
import test from "node:test";
import { chainIdToHex, EMPTY_WALLET_DATA, walletDataForAccount, walletDataForChain } from "../lib/network";

const populated = { balance: 1250n, supply: 1_000_000n, allowance: 100n };

test("unsupported networks clear stale balance, supply, and allowance", () => {
  assert.deepEqual(walletDataForChain(1, 11155111, populated), EMPTY_WALLET_DATA);
});

test("supported network preserves freshly loaded wallet data", () => {
  assert.deepEqual(walletDataForChain(11155111, 11155111, populated), populated);
});

test("wallet disconnect clears all account-specific state", () => {
  assert.deepEqual(walletDataForAccount(undefined, populated), EMPTY_WALLET_DATA);
});

test("switch chain ID is derived from numeric configuration", () => {
  assert.equal(chainIdToHex(11155111), "0xaa36a7");
});
