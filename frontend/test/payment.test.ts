import test from "node:test";
import assert from "node:assert/strict";
import { keccak256 } from "ethers";
import { validatePayment, paymentSplit, type PaymentReader } from "../modules/blockchain/legacy-qfc/payment";
const token = "0x1111111111111111111111111111111111111111";
const address = "0x2222222222222222222222222222222222222222";
const treasury = "0x3333333333333333333333333333333333333333";
const code = "0x6001600055";
const config = { token, address, chainId:11155111, codeHash:keccak256(code) };
const metadata = { token, treasury, burnRate:750n, denominator:10000n };
const reader = (overrides: Partial<PaymentReader> = {}): PaymentReader => ({chainId:async()=>11155111n,code:async()=>code,metadata:async()=>metadata,...overrides});
test("verified metadata drives the split, including non-5% rate and rounding",async()=>{
 const terms = await validatePayment(reader(),config);
 assert.deepEqual(paymentSplit(10000n,terms),{payment:10000n,burned:750n,treasury:9250n});
 assert.deepEqual(paymentSplit(1n,terms),{payment:1n,burned:0n,treasury:1n});
});
test("rejects wrong chain before reading contract",async()=>{
 await assert.rejects(validatePayment(reader({chainId:async()=>1n,code:async()=>{throw new Error("must not read code")}}),config),/Wrong payment network/);
});
test("fails closed without a trusted pin or executable bytecode",async()=>{
 await assert.rejects(validatePayment(reader(),{...config,codeHash:""}),/verified payment runtime/);
 await assert.rejects(validatePayment(reader({code:async()=>"0x"}),config),/no valid bytecode/);
 await assert.rejects(validatePayment(reader({code:async()=>"0x1234"}),config),/does not match/);
});
test("rejects mismatched token even when code hash matches",async()=>{
 await assert.rejects(validatePayment(reader({metadata:async()=>({...metadata,token:address})}),config),/different token/);
});
test("rejects invalid burn denominator, excessive rate and zero treasury",async()=>{
 for(const values of [{denominator:0n},{burnRate:10001n},{burnRate:-1n}]) await assert.rejects(validatePayment(reader({metadata:async()=>({...metadata,...values})}),config),/burn parameters/);
 await assert.rejects(validatePayment(reader({metadata:async()=>({...metadata,treasury:"0x0000000000000000000000000000000000000000"})}),config),/treasury/);
});
test("RPC and missing contract methods cannot silently pass validation",async()=>{
 await assert.rejects(validatePayment(reader({metadata:async()=>{throw new Error("RPC/method unavailable")}}),config),/unavailable/);
});
