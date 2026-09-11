"use client";
import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { Header } from "./Header";
export default function RecoveryForm({ mode }: { mode: "request" | "reset" | "invite" }) {
  const [token, setToken] = useState(""); const [message, setMessage] = useState(""); const [error, setError] = useState(""); const [busy, setBusy] = useState(false); const [complete, setComplete] = useState(false);
  useEffect(() => { if (mode !== "request") { setToken(new URLSearchParams(location.hash.slice(1)).get("token") ?? ""); history.replaceState(null, "", location.pathname); } }, [mode]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy) return; setBusy(true); setError("");
    const form = new FormData(event.currentTarget);
    try {
      const endpoint = mode === "request" ? "auth/forgot-password" : mode === "reset" ? "auth/reset-password" : "invitations/accept";
      const response = await fetch(`/api/${endpoint}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(mode === "request" ? { email: form.get("email") } : { token, password: form.get("password") }) });
      const result = await response.json(); if (!response.ok) throw new Error(result.error || "Something went wrong. Please try again.");
      setMessage(result.message); setComplete(true); setToken("");
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to connect. Please try again."); } finally { setBusy(false); }
  }
  const title = mode === "request" ? "Forgot your password?" : mode === "reset" ? "Set a new password" : "Join your team";
  return <><Header/><main className="shell auth-shell"><h1>{title}</h1><form className="saas-panel saas-form" onSubmit={submit}>
    {mode === "request" ? <label>Email<input name="email" type="email" autoComplete="email" required maxLength={254}/></label> : <><p>{mode === "invite" ? "Use your existing password for the invited email, or choose a password for a new employee account. If signed in, use the invited account." : "All existing sessions will be signed out."}</p><label>{mode === "invite" ? "Account password" : "New password"}<input name="password" type="password" autoComplete={mode === "invite" ? "current-password" : "new-password"} required minLength={12} maxLength={72}/></label><p>12–72 characters, at most 72 UTF-8 bytes.</p>{!token && !complete && <p>Open the complete link from your email. If you refreshed this page, reopen the email link.</p>}</>}
    <button className="primary" disabled={busy || complete || (mode !== "request" && !token)}>{busy ? "Please wait…" : mode === "request" ? "Send reset instructions" : mode === "reset" ? "Update password" : "Accept invitation"}</button>
    <p role="alert">{error}</p><p role="status">{message}</p>
  </form><p><Link href="/login">Sign in</Link> · <Link href="/forgot-password">Request a new reset link</Link></p></main></>;
}
