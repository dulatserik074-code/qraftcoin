"use client";
import { useState } from "react";
import { Header } from "@/components/Header";
import { DemoRewardProvider, POINTS_ASSET, purchaseReward, type RewardProvider, type RewardTransaction } from "@/modules/rewards/provider";
const scope={businessId:"qaz-coffee",customerId:"demo-customer",assetId:POINTS_ASSET.id};
export default function Demo() {
 const [provider] = useState<RewardProvider>(()=>new DemoRewardProvider());
 const [balance,setBalance]=useState(0);
 const [history,setHistory]=useState<readonly RewardTransaction[]>([]);
 const [purchase,setPurchase]=useState("10000");
 const [rate,setRate]=useState("5");
 const [redeem,setRedeem]=useState("100");
 const [currency,setCurrency]=useState("KZT");
 const [message,setMessage]=useState("");
 const [busy,setBusy]=useState(false);
 async function transact(kind:"EARN"|"REDEEM") {
  setBusy(true);
  try {
   if (kind === "EARN" && (!/^\d+(\.\d{1,2})?$/.test(purchase) || !/^\d+(\.\d{1,2})?$/.test(rate))) throw new Error("Enter a purchase and reward rate with up to two decimal places");
   if (kind === "REDEEM" && !/^\d+$/.test(redeem)) throw new Error("Enter a whole number of points");
   const points=kind === "EARN" ? purchaseReward(Math.round(Number(purchase)*100),2,Math.round(Number(rate)*100)) : Number(redeem);
   if (kind === "EARN" && points === 0) {
    setMessage("This purchase earns 0 QL Points at the current rate. No transaction was created. Increase the purchase amount or reward rate.");
    return;
   }
   if (kind === "REDEEM" && points === 0) throw new Error("Enter at least 1 QL Point to redeem");
   await provider.transact({...scope,kind,points,idempotencyKey:crypto.randomUUID(),reason:kind === "EARN" ? `Purchase ${purchase} ${currency} · ${rate}%` : "Reward redemption"});
   setBalance(await provider.balance(scope));setHistory(await provider.history(scope));setMessage(kind === "EARN" ? "Reward issued" : "Points redeemed");
  } catch(e) {setMessage(e instanceof Error ? e.message : "Transaction failed");} finally {setBusy(false);}
 }
 return <><Header/><main className="shell"><span className="eyebrow">QAZ COFFEE / INTERACTIVE DEMO</span><h1>Reward a purchase.</h1><p>This session uses sample data. Refreshing clears the ledger. No registration or wallet is needed.</p><div className="demo-grid"><article><h2>Customer balance</h2><h2>{balance.toLocaleString()} {POINTS_ASSET.symbol}</h2><p>Demo Customer · Qaz Coffee</p><label>Points to redeem<input value={redeem} onChange={e=>setRedeem(e.target.value)} inputMode="numeric"/></label><button className="primary" disabled={busy} onClick={()=>transact("REDEEM")}>Redeem points</button></article><article><h2>Issue a purchase reward</h2><label>Currency<select value={currency} onChange={e=>setCurrency(e.target.value)}>{["KZT","USD","EUR"].map(c=><option key={c}>{c}</option>)}</select></label><label>Purchase amount<input value={purchase} onChange={e=>setPurchase(e.target.value)} inputMode="decimal"/></label><label>Reward rate (%)<input value={rate} onChange={e=>setRate(e.target.value)} inputMode="decimal"/></label><button className="primary" disabled={busy} onClick={()=>transact("EARN")}>Issue reward</button></article></div><p role="status">{message}</p><h2>Transaction history</h2><table><thead><tr><th>Activity</th><th>QL Points</th></tr></thead><tbody>{history.map(t=><tr key={t.id}><td>{t.reason}</td><td>{t.kind === "EARN" ? "+" : "−"}{t.points}</td></tr>)}</tbody></table>{history.length===0&&<p>No transactions yet. Try a 10,000 purchase at 5% to earn 500 points.</p>}<p>Redemption rules are set by each business. QL Points have no guaranteed monetary exchange rate and are separate from legacy test tokens.</p></main></>;
}
