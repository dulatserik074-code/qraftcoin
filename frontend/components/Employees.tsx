"use client";
import { useCallback, useEffect, useState } from "react";
import { api } from "./businessTypes";
import { friendlyError } from "./friendlyError";
type Team = { employees: { userId: string; active: boolean; user: { email: string } }[]; invitations: { id: string; email: string; expiresAt: string }[] };
export default function Employees({ businessId }: { businessId: string }) {
  const [team, setTeam] = useState<Team | null>(null); const [busy, setBusy] = useState(false); const [message, setMessage] = useState("");
  const base = `businesses/${businessId}`;
  const load = useCallback(async () => setTeam(await api<Team>(`${base}/employees`)), [base]);
  useEffect(() => { void load().catch(() => setMessage("Не удалось загрузить сотрудников. Обновите страницу.")); }, [load]);
  async function action(path: string, data: unknown, method = "POST") {
    if (busy) return; setBusy(true); setMessage("");
    try { await api(path, data, method); await load(); setMessage("Доступ обновлён."); } catch (e) { setMessage(friendlyError(e)); } finally { setBusy(false); }
  }
  return <section className="saas-panel"><h2>Сотрудники</h2><p>Только владелец управляет доступом к бизнесу.</p>
    <p>Приглашения по email пока недоступны в пилоте. Сейчас основной сценарий выполняет владелец бизнеса.</p><p role="status">{message}</p>
    {team?.employees.length === 0 && <p>Сотрудников пока нет.</p>}
    <ul className="team-list">{team?.employees.map(member => <li key={member.userId}><strong>{member.user.email}</strong><span>{member.active ? "Активен" : "Доступ отключён"}</span><button disabled={busy} aria-label={`${member.active ? "Disable" : "Restore"} access for ${member.user.email}`} onClick={() => void action(`${base}/employees/${member.userId}`, { active: !member.active }, "PATCH")}>{member.active ? "Отключить доступ" : "Восстановить доступ"}</button></li>)}</ul>
    <h3>Ожидающие приглашения</h3>{team?.invitations.length === 0 && <p>Нет ожидающих приглашений.</p>}<ul className="team-list">{team?.invitations.map(invite => <li key={invite.id}><strong>{invite.email}</strong><span>Истекает {new Date(invite.expiresAt).toLocaleString()}</span><button disabled={busy} aria-label={`Отозвать приглашение for ${invite.email}`} onClick={() => void action(`${base}/invitations/${invite.id}`, {}, "DELETE")}>Отозвать приглашение</button></li>)}</ul>
  </section>;
}
