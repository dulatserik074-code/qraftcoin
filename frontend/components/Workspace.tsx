"use client";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import Image from "next/image";
import { Header } from "./Header";
import HistoryTable from "./HistoryTable";
import Employees from "./Employees";
import { api, money, rateBps, type Business, type User, type Member, type History, type Stats } from "./businessTypes";
type View = "dashboard" | "onboarding" | "customer" | "scan" | "transactions" | "settings" | "employees";
export default function Workspace({ view, customerId }: { view: View; customerId?: string }) {
  const [business, setBusiness] = useState<Business | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [members, setMembers] = useState<{ items: Member[]; total: number; page: number }>({ items: [], total: 0, page: 1 });
  const [member, setMember] = useState<Member | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [history, setHistory] = useState<History | null>(null);
  const [message, setMessage] = useState("");
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState("");
  const [onboardingRate, setOnboardingRate] = useState("5");
  const [onboardingCurrency, setOnboardingCurrency] = useState("KZT");
  const [purchase, setPurchase] = useState("10000");
  const [points, setPoints] = useState("100");
  const [scan, setScan] = useState("");
  const locked = useRef(false);
  const retry = useRef<{ signature: string; key: string } | null>(null);
  const load = useCallback(async (page = 1, search = "") => {
    const me = await api<{ user: User; businesses: Business[] }>("me");
    setUser(me.user); setBusinesses(me.businesses);
    if (view === "onboarding") { if (me.businesses.length) window.location.assign("/dashboard"); setReady(true); return; }
    if (!me.businesses.length) {
      if (me.user.role === "BUSINESS_OWNER") window.location.assign("/onboarding");
      else setMessage("No business access assigned. Contact the business owner.");
      setReady(true); return;
    }
    const requested = new URLSearchParams(window.location.search).get("businessId");
    const current = me.businesses.find(b => b.id === requested) ?? (!requested ? me.businesses[0] : null);
    if (!current) throw new Error("Business not found");
    setBusiness(current);
    const base = `businesses/${current.id}`;
    if (view === "dashboard") {
      const [s, c] = await Promise.all([api<Stats>(`${base}/dashboard`), api<typeof members>(`${base}/customers?page=${page}&query=${encodeURIComponent(search)}`)]);
      setStats(s); setMembers(c);
    }
    if (view === "customer" && customerId) setMember(await api<Member>(`${base}/customers/${customerId}?page=${page}`));
    if (view === "transactions") setHistory(await api<History>(`${base}/transactions?page=${page}`));
    if (view === "scan") setScan(new URLSearchParams(window.location.search).get("code") ?? "");
    setReady(true);
  }, [view, customerId]);
  useEffect(() => { void load().catch(e => { setMessage(e.message); setReady(true); }); }, [load]);
  async function action(run: () => Promise<void>) {
    if (locked.current) return;
    locked.current = true; setBusy(true); setMessage("");
    try { await run(); } catch (e) { setMessage(e instanceof Error ? e.message : "Unable to connect. Retry the operation."); }
    finally { locked.current = false; setBusy(false); }
  }
  const reload = (page: number) => { void action(() => load(page, query)); };
  const suffix = business ? `?businessId=${business.id}` : "";
  async function onboard(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    await action(async () => {
      const created = await api<Business>("businesses", { business: { name: form.get("businessName"), currency: form.get("currency"), rewardRateBps: rateBps(String(form.get("rate"))) }, customer: { name: form.get("customerName"), phone: form.get("phone"), email: form.get("email") } });
      const first = await api<{ items: Member[] }>(`businesses/${created.id}/customers`);
      window.location.assign(first.items[0] ? `/customers/${first.items[0].customerId}?businessId=${created.id}` : "/dashboard");
    });
  }
  async function addCustomer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const element = event.currentTarget; const form = new FormData(element);
    await action(async () => { await api(`businesses/${business!.id}/customers`, { name: form.get("name"), phone: form.get("phone"), email: form.get("email") }); element.reset(); await load(); setMessage("Customer created"); });
  }
  async function reward(type: "EARN" | "REDEEM") {
    await action(async () => {
      const input = { type, customerId, ...(type === "EARN" ? { purchaseAmount: purchase } : { points }) };
      const signature = JSON.stringify(input);
      if (retry.current?.signature !== signature) retry.current = { signature, key: crypto.randomUUID() };
      const result = await api<{ message: string }>(`businesses/${business!.id}/rewards`, { ...input, idempotencyKey: retry.current.key });
      // Clear the submitted input after a confirmed response. A failed dashboard refresh
      // must not turn a completed purchase into a new request on the next click.
      retry.current = null;
      if (type === "EARN") setPurchase(""); else setPoints("");
      setMessage(result.message);
      try { await load(); } catch { setMessage(`${result.message}. Refresh the page to see the updated balance.`); }
    });
  }
  async function lookup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await action(async () => {
      let code = scan.trim();
      if (code.startsWith("http")) {
        const url = new URL(code);
        if (url.origin !== window.location.origin || url.pathname !== "/scan" || url.searchParams.get("businessId") !== business!.id) throw new Error("This QR does not belong to the current business");
        code = url.searchParams.get("code") ?? "";
      }
      const found = await api<Member>(`businesses/${business!.id}/scan?code=${encodeURIComponent(code)}`);
      window.location.assign(`/customers/${found.customerId}${suffix}`);
    });
  }
  let estimate = "—";
  if (business && /^\d{1,12}(\.\d{1,2})?$/.test(purchase)) { const [whole, fraction = ""] = purchase.split("."); estimate = ((BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"))) * BigInt(business.rewardRateBps) / 1000000n).toString(); }
  return <><Header/><main className="shell workspace"><div className="workspace-top"><div><span className="eyebrow">REAL BUSINESS DATA</span><h1>{view === "onboarding" ? "Launch your program" : business?.name ?? "Your workspace"}</h1><p>{user?.email}</p></div><button disabled={busy} onClick={() => void action(async () => { await api("auth/logout", {}); window.location.assign("/login"); })}>Sign out</button></div>
    {businesses.length > 1 && <label>Business<select value={business?.id ?? ""} onChange={e => window.location.assign(`/dashboard?businessId=${e.target.value}`)}>{businesses.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label>}
    {business && <nav className="workspace-nav"><Link href={`/dashboard${suffix}`}>Dashboard & customers</Link><Link href={`/scan${suffix}`}>Scan / customer ID</Link><Link href={`/transactions${suffix}`}>Transactions</Link>{user?.id === business.ownerId && <><Link href={`/settings${suffix}`}>Settings</Link><Link href={`/employees${suffix}`}>Employees</Link></>}</nav>}
    <p role="status" className="workspace-status">{message}</p>{!ready && <p>Loading your business…</p>}
    {ready && view === "onboarding" && user?.role === "BUSINESS_OWNER" && <form className="saas-panel saas-form" onSubmit={onboard}><ol className="pilot-progress" role="list" aria-label="Program setup progress"><li>1. Account created ✓</li><li aria-current="step">2. Business → 3. Reward rate → 4. First customer</li><li>5. First reward → 6. Dashboard</li></ol><h2>Create your business</h2><label>Business name<input name="businessName" required maxLength={120}/></label><label>Currency<select name="currency" value={onboardingCurrency} onChange={e => setOnboardingCurrency(e.target.value)}><option>KZT</option><option>USD</option><option>EUR</option></select></label><h2>Set your reward rate</h2><label>Reward percentage<input name="rate" value={onboardingRate} onChange={e => setOnboardingRate(e.target.value)} inputMode="decimal" required/></label><p role="status">{(() => { try { const points = BigInt(rateBps(onboardingRate)); return `Purchase 10 000 ${onboardingCurrency === "KZT" ? "₸" : onboardingCurrency} → customer earns ${points} QL Points`; } catch { return "Enter a percentage from 0 to 100."; } })()}</p><h2>Add your first customer</h2><label>Customer name<input name="customerName" required maxLength={120}/></label><label>Phone (optional)<input name="phone" type="tel" maxLength={30}/></label><label>Customer email (optional)<input name="email" type="email" maxLength={254}/></label><button className="primary" disabled={busy}>Create business and customer</button></form>}
    {ready && business && view === "dashboard" && <>
      {stats && stats.totalPurchases === 0 && user?.id === business.ownerId && <section className="saas-panel"><h2>Your first steps</h2><ul><li>Create business ✓</li><li>Set reward rate ✓</li><li>{stats.totalCustomers ? "Add first customer ✓" : "Add your first customer below"}</li><li>{members.items[0] ? <Link href={`/customers/${members.items[0].customerId}${suffix}`}>Issue your first reward →</Link> : "Issue the first reward after adding a customer"}</li><li><Link href={`/employees${suffix}`}>Invite an employee when ready →</Link></li></ul></section>}{stats && <div className="stats-grid">{[["Total Customers", stats.totalCustomers], ["Active Customers (30 days)", stats.activeCustomers], ["Returning Customers", stats.returningCustomers], ["Points Issued", stats.pointsIssued], ["Points Redeemed", stats.pointsRedeemed], ["Total Purchases", stats.totalPurchases], ["Revenue Tracked", money(stats.revenueTracked, business.currency)], ["Repeat Purchase Rate", `${(stats.repeatPurchaseRateBps / 100).toFixed(2)}%`]].map(([label, value]) => <article className="saas-panel" key={label}><span>{label}</span><strong>{value}</strong></article>)}</div>}
      <p>Returning customers have 2+ rewarded purchases. Repeat rate = returning customers / customers with a rewarded purchase.</p>
      <section className="saas-panel"><h2>Customers</h2><form className="inline-form" onSubmit={e => { e.preventDefault(); reload(1); }}><label>Find a customer<input value={query} onChange={e => setQuery(e.target.value)} placeholder="Name, phone or email" maxLength={120}/></label><button disabled={busy}>Search</button></form>{members.total === 0 && <p>{query ? "No matching customers. Try another name, email or phone." : "No customers yet. Add your first customer to start your loyalty program."}</p>}<div className="table-scroll"><table><thead><tr><th>Name</th><th>Phone</th><th>QL Points</th><th>Purchases</th></tr></thead><tbody>{members.items.map(m => <tr key={m.customerId}><td><Link href={`/customers/${m.customerId}${suffix}`}>{m.customer.name} →</Link></td><td>{m.customer.phone || "—"}</td><td>{m.pointsBalance}</td><td>{m.totalPurchases}</td></tr>)}</tbody></table></div><div className="pagination"><button disabled={busy || members.page <= 1} onClick={() => reload(members.page - 1)}>Previous</button><span>{members.total} customers · Page {members.page}</span><button disabled={busy || members.page * 20 >= members.total} onClick={() => reload(members.page + 1)}>Next</button></div></section>
      <form className="saas-panel saas-form" onSubmit={addCustomer}><h2>Add customer</h2><label>Name<input name="name" required maxLength={120}/></label><label>Phone (optional)<input name="phone" type="tel" maxLength={30}/></label><label>Email (optional)<input name="email" type="email" maxLength={254}/></label><button className="primary" disabled={busy}>Create customer</button></form>
    </>}
    {ready && business && view === "customer" && member && <><h2>{member.customer.name}</h2>{user?.id === business.ownerId && member.history?.total === 0 && <p className="saas-panel">Setup step 5: issue the first reward below, then <Link href={`/dashboard${suffix}`}>open your dashboard →</Link></p>}<div className="demo-grid"><article className="saas-panel"><h2 data-testid="persistent-balance">{member.pointsBalance} QL Points</h2><p>Lifetime points: {member.lifetimePoints} QL Points</p><p>{member.customer.phone} {member.customer.email}</p>{member.qrImage && <Image unoptimized src={member.qrImage} alt="Customer QR identifier" width={240} height={240}/>}<p className="public-id">Customer ID: {member.publicId}</p><p>The QR identifies this membership. Staff must sign in to view or reward it.</p></article><article className="saas-panel saas-form"><h2>Reward a purchase</h2><label>Purchase amount ({business.currency})<input value={purchase} onChange={e => setPurchase(e.target.value)} inputMode="decimal"/></label><p>Rate: {business.rewardRateBps / 100}% · Estimated reward: <strong>{estimate} QL Points</strong></p><button className="primary" disabled={busy} onClick={() => void reward("EARN")}>Confirm reward</button><h2>Redeem points</h2><label>QL Points to redeem<input value={points} onChange={e => setPoints(e.target.value)} inputMode="numeric"/></label><button disabled={busy} onClick={() => void reward("REDEEM")}>Confirm redemption</button></article></div><section className="saas-panel"><h2>Transaction history</h2>{member.history && <HistoryTable history={member.history} currency={business.currency} onPage={reload}/>}</section></>}
    {ready && business && view === "scan" && <form className="saas-panel saas-form" onSubmit={lookup}><h2>Find customer by QR / ID</h2><p>Open a customer QR with your device camera, or paste its link or customer ID below. In-app camera scanning can be added later.</p><label>Customer QR link or ID<input value={scan} onChange={e => setScan(e.target.value)} required maxLength={500}/></label><button className="primary" disabled={busy}>Open customer</button></form>}
    {ready && business && view === "transactions" && history && <section className="saas-panel"><h2>Transaction history</h2><HistoryTable history={history} currency={business.currency} onPage={reload}/></section>}
    {ready && business && ["settings", "employees"].includes(view) && user?.id !== business.ownerId && <p role="alert">Access denied. Only the owner can manage settings and employees.</p>}
    {ready && business && view === "employees" && user?.id === business.ownerId && <Employees businessId={business.id}/>}
    {ready && business && view === "settings" && user?.id === business.ownerId && <form key={`${business.name}-${business.rewardRateBps}`} className="saas-panel saas-form" onSubmit={event => { event.preventDefault(); const form = new FormData(event.currentTarget); void action(async () => { await api(`businesses/${business.id}`, { name: form.get("name"), description: form.get("description"), rewardRateBps: rateBps(String(form.get("rate"))) }, "PATCH"); await load(); setMessage("Settings saved"); }); }}><h2>Program settings</h2><label>Business name<input name="name" defaultValue={business.name} required maxLength={120}/></label><label>Description<input name="description" defaultValue={business.description} maxLength={500}/></label><label>Reward percentage<input name="rate" defaultValue={business.rewardRateBps / 100} inputMode="decimal" required/></label><p>Currency: {business.currency}. Currency is fixed for this ledger to prevent mixing monetary units.</p><button className="primary" disabled={busy}>Save settings</button></form>}
  </main></>;
}

