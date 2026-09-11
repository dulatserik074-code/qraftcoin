"use client";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { api } from "./businessTypes";
type Team = { employees: { userId: string; active: boolean; user: { email: string } }[]; invitations: { id: string; email: string; expiresAt: string }[] };
export default function Employees({ businessId }: { businessId: string }) {
  const [team, setTeam] = useState<Team | null>(null); const [busy, setBusy] = useState(false); const [message, setMessage] = useState("");
  const base = `businesses/${businessId}`;
  const load = useCallback(async () => setTeam(await api<Team>(`${base}/employees`)), [base]);
  useEffect(() => { void load().catch(() => setMessage("Unable to load employees. Please reload.")); }, [load]);
  async function action(path: string, data: unknown, method = "POST") {
    if (busy) return; setBusy(true); setMessage("");
    try { await api(path, data, method); await load(); setMessage("Team updated."); } catch (e) { setMessage(e instanceof Error ? e.message : "Unable to update team."); } finally { setBusy(false); }
  }
  function invite(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const form = new FormData(event.currentTarget); void action(`${base}/invitations`, { email: form.get("email") }); }
  return <section className="saas-panel"><h2>Employees</h2><p>Cashiers can find customers, issue and redeem points in this business. Only you manage settings and access.</p>
    <form className="saas-form" onSubmit={invite}><label>Employee email<input name="email" type="email" autoComplete="off" required maxLength={254}/></label><button className="primary" disabled={busy}>Send invitation</button></form><p role="status">{message}</p>
    {team?.employees.length === 0 && <p>No employees yet. Invite a cashier or employee when you are ready.</p>}
    <ul className="team-list">{team?.employees.map(member => <li key={member.userId}><strong>{member.user.email}</strong><span>{member.active ? "Active" : "Access disabled"}</span><button disabled={busy} aria-label={`${member.active ? "Disable" : "Restore"} access for ${member.user.email}`} onClick={() => void action(`${base}/employees/${member.userId}`, { active: !member.active }, "PATCH")}>{member.active ? "Disable access" : "Restore access"}</button></li>)}</ul>
    <h3>Pending invitations</h3>{team?.invitations.length === 0 && <p>No pending invitations.</p>}<ul className="team-list">{team?.invitations.map(invite => <li key={invite.id}><strong>{invite.email}</strong><span>Expires {new Date(invite.expiresAt).toLocaleString()}</span><button disabled={busy} aria-label={`Revoke invitation for ${invite.email}`} onClick={() => void action(`${base}/invitations/${invite.id}`, {}, "DELETE")}>Revoke invitation</button></li>)}</ul>
  </section>;
}
