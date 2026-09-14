"use client";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import Image from "next/image";
import { friendlyError } from "./friendlyError";
import { Header } from "./Header";
import HistoryTable from "./HistoryTable";
import Employees from "./Employees";
import { api, rateBps, type Business, type User, type Member, type History, type Stats } from "./businessTypes";
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
  const [points, setPoints] = useState("");
  const [scan, setScan] = useState("");
  const locked = useRef(false);
  const retry = useRef<{ signature: string; key: string } | null>(null);
  const load = useCallback(async (page = 1, search = "") => {
    const me = await api<{ user: User; businesses: Business[] }>("me");
    setUser(me.user); setBusinesses(me.businesses);
    if (view === "onboarding") { if (me.businesses.length) window.location.assign("/dashboard"); setReady(true); return; }
    if (!me.businesses.length) {
      if (me.user.role === "BUSINESS_OWNER") window.location.assign("/onboarding");
      else setMessage("Нет доступа к бизнесу. Обратитесь к владельцу.");
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
  useEffect(() => { void load().catch(e => { setMessage(friendlyError(e)); setReady(true); }); }, [load]);
  async function action(run: () => Promise<void>) {
    if (locked.current) return;
    locked.current = true; setBusy(true); setMessage("");
    try { await run(); } catch (e) { setMessage(friendlyError(e)); }
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
    await action(async () => { const created = await api<Member>(`businesses/${business!.id}/customers`, { name: form.get("name"), phone: form.get("phone"), email: form.get("email") }); window.location.assign(`/customers/${created.customerId}${suffix}`); });
  }
  async function reward(type: "EARN" | "REDEEM") {
    await action(async () => {
      const input = { type, customerId, ...(type === "EARN" ? { purchaseAmount: purchase } : { points }) };
      const signature = JSON.stringify(input);
      if (retry.current?.signature !== signature) retry.current = { signature, key: crypto.randomUUID() };
      const result = await api<{ message: string; transaction: unknown | null }>(`businesses/${business!.id}/rewards`, { ...input, idempotencyKey: retry.current.key });
      // Clear the submitted input after a confirmed response. A failed dashboard refresh
      // must not turn a completed purchase into a new request on the next click.
      retry.current = null;
      if (type === "EARN") setPurchase(""); else setPoints("");
      const confirmation = result.transaction === null ? "При этой сумме начисляется 0 QL. Баланс не изменён, операция не создана." : type === "EARN" ? "Бонусы начислены. Баланс и история обновлены." : "Бонусы списаны. Баланс и история обновлены.";
      setMessage(confirmation);
      try { await load(); } catch { setMessage("Операция выполнена. Обновите страницу, чтобы увидеть баланс. Не проводите её повторно."); }
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
  const validPurchase = /^\d{1,12}(\.\d{1,2})?$/.test(purchase) && Number(purchase) > 0;
  const validPoints = /^[1-9]\d{0,11}$/.test(points);
  return <><Header/><main className="shell workspace"><div className="workspace-top"><div><span className="eyebrow">КАБИНЕТ БИЗНЕСА</span><h1>{view === "onboarding" ? "Добро пожаловать в QazLoyal" : business?.name ?? "Мой бизнес"}</h1><p>{user?.email}</p></div><button disabled={busy} onClick={() => void action(async () => { await api("auth/logout", {}); window.location.assign("/login"); })}>Выйти</button></div>
    {businesses.length > 1 && <label>Бизнес<select value={business?.id ?? ""} onChange={e => window.location.assign(`/dashboard?businessId=${e.target.value}`)}>{businesses.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label>}
    {business && <nav className="workspace-nav"><Link href={`/dashboard${suffix}`}>Клиенты</Link><Link href={`/scan${suffix}`}>Найти по QR</Link><Link href={`/transactions${suffix}`}>История операций</Link>{user?.id === business.ownerId && <><Link href={`/settings${suffix}`}>Настройки</Link><Link href={`/employees${suffix}`}>Сотрудники</Link></>}</nav>}
    {(view !== "customer" || !member) && <p role="status" className="workspace-status">{message}</p>}{!ready && <p>Загружаем бизнес…</p>}
    {ready && view === "onboarding" && user?.role === "BUSINESS_OWNER" && <form className="saas-panel saas-form" onSubmit={onboard}><ol className="pilot-progress" role="list" aria-label="Первые шаги"><li>Аккаунт создан ✓</li><li aria-current="step">1. Создайте бизнес и добавьте клиента</li><li>2. Начислите бонусы в карточке клиента</li></ol><h2>Создайте свой бизнес</h2><label>Название бизнеса<input name="businessName" required maxLength={120}/></label><label>Валюта<select name="currency" value={onboardingCurrency} onChange={e => setOnboardingCurrency(e.target.value)}><option>KZT</option><option>USD</option><option>EUR</option></select></label><h2>Бонусы за покупки</h2><label>Процент начисления<input name="rate" value={onboardingRate} onChange={e => setOnboardingRate(e.target.value)} inputMode="decimal" required/></label><p role="status">{(() => { try { const points = BigInt(rateBps(onboardingRate)); return `Покупка на 10 000 ${onboardingCurrency === "KZT" ? "₸" : onboardingCurrency} → клиент получит ${points} QL`; } catch { return "Введите процент от 0 до 100."; } })()}</p><h2>Добавьте первого клиента</h2><label>Имя клиента<input name="customerName" required maxLength={120}/></label><label>Телефон (необязательно)<input name="phone" type="tel" maxLength={30}/></label><label>Email клиента (необязательно)<input name="email" type="email" maxLength={254}/></label><button className="primary" disabled={busy}>Создать и перейти к начислению</button></form>}
    {ready && business && view === "dashboard" && <>
      {stats && stats.totalPurchases === 0 && user?.id === business.ownerId && <section className="saas-panel"><h2>Следующий шаг</h2><ul><li>Бизнес создан ✓</li><li>Процент настроен ✓</li><li>{stats.totalCustomers ? "Клиент добавлен ✓" : "Добавьте первого клиента ниже"}</li><li>{members.items[0] ? <Link href={`/customers/${members.items[0].customerId}${suffix}`}>Начислить первые бонусы →</Link> : "Добавьте клиента, чтобы начислить бонусы"}</li></ul></section>}{stats && <div className="stats-grid">{[["Клиентов", stats.totalCustomers], ["Начислено QL", stats.pointsIssued], ["Списано QL", stats.pointsRedeemed], ["Покупок с бонусами", stats.totalPurchases]].map(([label, value]) => <article className="saas-panel" key={label}><span>{label}</span><strong>{value}</strong></article>)}</div>}
      <p><a className="primary" href="#add-customer">Добавить клиента</a> · Откройте карточку клиента, чтобы начислить или списать бонусы.</p>
      <section className="saas-panel"><h2>Клиенты</h2><form className="inline-form" onSubmit={e => { e.preventDefault(); reload(1); }}><label>Найти клиента<input value={query} onChange={e => setQuery(e.target.value)} placeholder="Имя, телефон или email" maxLength={120}/></label><button disabled={busy}>Найти</button></form>{members.total === 0 && <p>{query ? "Клиент не найден. Проверьте имя, email или телефон." : "Клиентов пока нет. Добавьте первого клиента ниже, чтобы начислить бонусы."}</p>}<ul className="customer-cards" aria-label="Клиенты">{members.items.map(m => <li key={m.customerId}><div><h3>{m.customer.name}</h3><p>{m.customer.phone || "Телефон не указан"}</p></div><strong>{m.pointsBalance} QL</strong><Link href={`/customers/${m.customerId}${suffix}`} aria-label={`Открыть клиента ${m.customer.name}`}>Открыть карточку →</Link></li>)}</ul><div className="table-scroll customer-table"><table><thead><tr><th>Имя</th><th>Телефон</th><th>QL</th><th>Покупки</th></tr></thead><tbody>{members.items.map(m => <tr key={m.customerId}><td><Link href={`/customers/${m.customerId}${suffix}`}>{m.customer.name} →</Link></td><td>{m.customer.phone || "—"}</td><td>{m.pointsBalance}</td><td>{m.totalPurchases}</td></tr>)}</tbody></table></div><div className="pagination"><button disabled={busy || members.page <= 1} onClick={() => reload(members.page - 1)}>Назад</button><span>Клиентов: {members.total} · Страница {members.page}</span><button disabled={busy || members.page * 20 >= members.total} onClick={() => reload(members.page + 1)}>Далее</button></div></section>
      <form id="add-customer" className="saas-panel saas-form" onSubmit={addCustomer}><h2>Добавить клиента</h2><label>Имя<input name="name" required maxLength={120}/></label><label>Телефон (необязательно)<input name="phone" type="tel" maxLength={30}/></label><label>Email (необязательно)<input name="email" type="email" maxLength={254}/></label><button className="primary" disabled={busy}>Добавить и открыть карточку</button></form>
    </>}
    {ready && business && view === "customer" && member && <>
      <h2>{member.customer.name}</h2>
      {member.history?.total === 0 && <p>Клиент добавлен. Введите сумму покупки ниже и начислите первые бонусы.</p>}
      <section className="saas-panel customer-balance"><span>Баланс клиента</span><h2 data-testid="persistent-balance">{member.pointsBalance} QL</h2><p>{member.customer.phone} {member.customer.email}</p></section>
      <div className="demo-grid">
        <article className="saas-panel saas-form"><h2>Начислить бонусы</h2><label>Сумма покупки ({business.currency === "KZT" ? "KZT / ₸" : business.currency})<input value={purchase} onChange={e => setPurchase(e.target.value.replace(",", "."))} inputMode="decimal" placeholder="Например, 10000"/></label>{estimate === "0" && validPurchase && <p className="field-hint">При этой сумме получится 0 QL: бонусы округляются вниз до целого. Операция не будет создана.</p>}<p>Процент начисления: {business.rewardRateBps / 100}%<br/>Будет начислено: <strong>{estimate} QL</strong><br/>Баланс после начисления: <strong>{estimate !== "—" ? (BigInt(member.pointsBalance) + BigInt(estimate)).toString() : "—"} QL</strong></p><button className="primary" disabled={busy || !validPurchase} onClick={() => void reward("EARN")}>Начислить бонусы</button>{purchase && !validPurchase && <p>Введите сумму больше нуля, не более двух знаков после точки.</p>}</article>
        <article className="saas-panel saas-form"><h2>Списать бонусы</h2><p>При следующем визите предоставьте клиенту скидку или подарок по вашим условиям и спишите бонусы.</p><label>Сколько QL списать<input value={points} onChange={e => setPoints(e.target.value)} inputMode="numeric" placeholder="Например, 100"/></label><p>Доступно: {member.pointsBalance} QL<br/>Баланс после списания: <strong>{validPoints && BigInt(points) <= BigInt(member.pointsBalance) ? (BigInt(member.pointsBalance) - BigInt(points)).toString() : "—"} QL</strong></p>{validPoints && BigInt(points) > BigInt(member.pointsBalance) && <p role="alert">Недостаточно бонусов для списания.</p>}{points && !validPoints && <p>Введите целое количество бонусов больше нуля.</p>}<button disabled={busy || !validPoints || BigInt(points) > BigInt(member.pointsBalance)} onClick={() => void reward("REDEEM")}>Списать бонусы</button></article>
      </div><p role="status" className="workspace-status">{message}</p>
      <section className="saas-panel"><h2>История операций</h2>{member.history && <HistoryTable history={member.history} currency={business.currency} onPage={reload}/>}</section>
      <details className="saas-panel"><summary>QR-код клиента</summary>{member.qrImage && <Image unoptimized src={member.qrImage} alt="QR-код для поиска клиента" width={240} height={240}/>}<p className="public-id">Код клиента: {member.publicId}</p><p>QR помогает найти клиента. Для просмотра баланса нужен вход в кабинет.</p></details>
    </>}
    {ready && business && view === "scan" && <form className="saas-panel saas-form" onSubmit={lookup}><h2>Найти клиента по QR-коду</h2><p>Откройте QR-код клиента камерой телефона или вставьте ссылку / код клиента ниже. QR служит для поиска клиента, а не для оплаты.</p><label>Ссылка из QR или код клиента<input value={scan} onChange={e => setScan(e.target.value)} required maxLength={500}/></label><button className="primary" disabled={busy}>Открыть клиента</button></form>}
    {ready && business && view === "transactions" && history && <section className="saas-panel"><h2>История операций</h2><HistoryTable history={history} currency={business.currency} onPage={reload}/></section>}
    {ready && business && ["settings", "employees"].includes(view) && user?.id !== business.ownerId && <p role="alert">Настройки и доступ сотрудников может менять только владелец.</p>}
    {ready && business && view === "employees" && user?.id === business.ownerId && <Employees businessId={business.id}/>}
    {ready && business && view === "settings" && user?.id === business.ownerId && <form key={`${business.name}-${business.rewardRateBps}`} className="saas-panel saas-form" onSubmit={event => { event.preventDefault(); const form = new FormData(event.currentTarget); void action(async () => { await api(`businesses/${business.id}`, { name: form.get("name"), description: form.get("description"), rewardRateBps: rateBps(String(form.get("rate"))) }, "PATCH"); await load(); setMessage("Настройки сохранены"); }); }}><h2>Настройки программы</h2><label>Название бизнеса<input name="name" defaultValue={business.name} required maxLength={120}/></label><label>Описание<input name="description" defaultValue={business.description} maxLength={500}/></label><label>Процент начисления<input name="rate" defaultValue={business.rewardRateBps / 100} inputMode="decimal" required/></label><p>Валюта: {business.currency}. Валюта выбирается при создании бизнеса и не меняется.</p><button className="primary" disabled={busy}>Сохранить настройки</button></form>}
  </main></>;
}

