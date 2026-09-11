"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { Header } from "./Header";
export default function AuthForm({ register = false }: { register?: boolean }) {
  const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    const form = new FormData(event.currentTarget);
    try {
      const result = await fetch(`/api/auth/${register ? "register" : "login"}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: form.get("email"), password: form.get("password") }) });
      const data = await result.json(); if (!result.ok) throw new Error(data.error);
      window.location.assign(register ? "/onboarding" : "/dashboard");
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to connect"); setBusy(false); }
  }
  return <><Header/><main className="shell auth-shell"><span className="eyebrow">QAZLOYAL / BUSINESS ACCOUNT</span><h1>{register ? "Create your account" : "Welcome back"}</h1><form className="saas-panel saas-form" onSubmit={submit}><label>Email<input name="email" type="email" autoComplete="email" required maxLength={254}/></label><label>Password<input name="password" type="password" autoComplete={register ? "new-password" : "current-password"} minLength={12} maxLength={72} required/></label><p>Use 12–72 characters (at most 72 UTF-8 bytes).</p><button className="primary" disabled={busy}>{busy ? "Please wait…" : register ? "Create account" : "Sign in"}</button><p role="alert">{error}</p></form><p>{!register && <><Link href="/forgot-password">Forgot password?</Link> · </>}<Link href={register ? "/login" : "/register"}>{register ? "Already have an account? Sign in" : "Create a business account"}</Link> · <Link href="/demo">Try demo data</Link></p></main></>;
}
