"use client";
import { useSyncExternalStore } from "react";
import { money, type History, type Transaction } from "./businessTypes";
import styles from "./HistoryTable.module.css";

const mobileQuery = "(max-width: 767px)";
function subscribe(callback: () => void) {
  const query = window.matchMedia(mobileQuery);
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}
const isMobile = () => window.matchMedia(mobileQuery).matches;
const serverSnapshot = () => false;
const grouped = (value: bigint) => value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
function signedPoints(t: Transaction, compact = false) {
  const points = BigInt(t.points);
  const negative = points < 0n || t.type === "REDEEM" || t.type === "EXPIRE";
  const magnitude = points < 0n ? -points : points;
  return `${points === 0n ? "" : negative ? "−" : "+"}${compact ? grouped(magnitude) : magnitude}`;
}
function cardPurchase(minor: string | null, currency: string) {
  if (minor === null) return "—";
  const value = BigInt(minor);
  const magnitude = value < 0n ? -value : value;
  const fraction = magnitude % 100n;
  return `${value < 0n ? "−" : ""}${grouped(magnitude / 100n)}${fraction ? `.${fraction.toString().padStart(2, "0")}` : ""} ${currency === "KZT" ? "₸" : currency}`;
}

export default function HistoryTable({ history, currency, onPage }: { history: History; currency: string; onPage: (page: number) => void }) {
  const mobile = useSyncExternalStore(subscribe, isMobile, serverSnapshot);
  return <>
    {mobile ? <ul className={styles.cards} aria-label="Transaction history" role="list">
      {history.items.map(t => <li className={styles.card} key={t.id}>
        <dl>
          <div><dt>Date</dt><dd><time dateTime={t.createdAt}>{new Date(t.createdAt).toLocaleString()}</time></dd></div>
          <div><dt>Customer</dt><dd className={styles.customer}>{t.membership.customer.name}</dd></div>
          <div><dt>Type</dt><dd>{t.type}</dd></div>
          <div><dt>Purchase amount</dt><dd>{cardPurchase(t.purchaseAmount ?? null, currency)}</dd></div>
          <div><dt>QL Points</dt><dd className={`${styles.points} ${signedPoints(t).startsWith("−") ? styles.debit : styles.credit}`}>{signedPoints(t, true)} QL Points</dd></div>
          {t.employee && <div><dt>Employee</dt><dd>{t.employee.email}</dd></div>}
          <div><dt>Status</dt><dd>{t.status === "COMPLETED" ? "Completed" : t.status}</dd></div>
        </dl>
      </li>)}
    </ul> : <div className={`table-scroll ${styles.desktop}`}><table aria-label="Transaction history"><thead><tr>{["Date", "Customer", "Type", "Purchase", "QL Points", "Employee", "Status"].map(label => <th scope="col" key={label}>{label}</th>)}</tr></thead><tbody>{history.items.map(t => <tr key={t.id}><td><time dateTime={t.createdAt}>{new Date(t.createdAt).toLocaleString()}</time></td><td>{t.membership.customer.name}</td><td>{t.type}</td><td>{money(t.purchaseAmount ?? null, currency)}</td><td>{signedPoints(t)}</td><td>{t.employee?.email ?? "—"}</td><td>{t.status}</td></tr>)}</tbody></table></div>}
    {history.total === 0 && <p>No transactions yet. Your first reward transaction will appear here.</p>}
    <nav className="pagination" aria-label="Transaction history pages"><button disabled={history.page <= 1} onClick={() => onPage(history.page - 1)}>Previous</button><span aria-live="polite">Page {history.page} · {history.total} transactions</span><button disabled={history.page * history.pageSize >= history.total} onClick={() => onPage(history.page + 1)}>Next</button></nav>
  </>;
}

