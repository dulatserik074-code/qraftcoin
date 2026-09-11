import test from "node:test";
import assert from "node:assert/strict";
import { DemoRewardProvider, purchaseReward, POINTS_ASSET } from "../modules/rewards/provider";
const scope={businessId:"a",customerId:"customer",assetId:POINTS_ASSET.id};
const earn={...scope,kind:"EARN" as const,points:500,idempotencyKey:"purchase-1",reason:"Purchase"};
test("purchase calculation uses minor units, floors points, validates inputs",()=>{
 assert.equal(purchaseReward(1000000,2,500),500);
 assert.equal(purchaseReward(1999,2,500),0);
 assert.throws(()=>purchaseReward(-1,2,500));
 assert.throws(()=>purchaseReward(100,2,10001));
});
test("earn, redeem, history and insufficient points",async()=>{
 const p=new DemoRewardProvider();await p.transact(earn);
 await assert.rejects(p.transact({...earn,kind:"REDEEM",points:800,idempotencyKey:"r"}),/Insufficient/);
 await p.transact({...earn,kind:"REDEEM",points:100,idempotencyKey:"r"});
 assert.equal(await p.balance(scope),400);assert.equal((await p.history(scope)).length,2);
});
test("scope isolates business, customer and asset balances",async()=>{
 const p=new DemoRewardProvider();await p.transact(earn);
 for(const other of [{...scope,businessId:"b"},{...scope,customerId:"other"},{...scope,assetId:"legacy-qfc"}]) assert.equal(await p.balance(other),0);
});
test("idempotency prevents duplicate credits and rejects conflicting replay",async()=>{
 const p=new DemoRewardProvider();await Promise.all([p.transact(earn),p.transact(earn)]);
 assert.equal(await p.balance(scope),500);
 await assert.rejects(p.transact({...earn,points:600}),/Idempotency/);
});
test("concurrent redemptions cannot overspend",async()=>{
 const p=new DemoRewardProvider();await p.transact(earn);
 const results=await Promise.allSettled([p.transact({...earn,kind:"REDEEM",points:400,idempotencyKey:"r1"}),p.transact({...earn,kind:"REDEEM",points:400,idempotencyKey:"r2"})]);
 assert.equal(results.filter(r=>r.status==="fulfilled").length,1);assert.equal(await p.balance(scope),100);
});
test("history and returned entries cannot mutate ledger",async()=>{
 const p=new DemoRewardProvider();const entry=await p.transact(earn);Object.assign(entry,{points:900});
 Object.assign((await p.history(scope))[0],{points:900});assert.equal(await p.balance(scope),500);
 await assert.rejects(p.transact({...earn,points:0,idempotencyKey:"zero"}));
});
