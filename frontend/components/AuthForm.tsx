"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { friendlyError } from "./friendlyError";
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
    } catch (e) { setError(friendlyError(e)); setBusy(false); }
  }
  return <><Header/><main className="shell auth-shell"><span className="eyebrow">КАБИНЕТ ВЛАДЕЛЬЦА</span><h1>{register ? "Создайте аккаунт" : "Вход в QazLoyal"}</h1><form className="saas-panel saas-form" onSubmit={submit}><label>Email<input name="email" type="email" autoComplete="email" required maxLength={254}/></label><label>Пароль<input name="password" type="password" autoComplete={register ? "new-password" : "current-password"} minLength={12} maxLength={72} required/></label><p>Пароль: 12–72 латинских символа. Сохраните его: восстановление по email пока недоступно в пилоте.</p><button className="primary" disabled={busy}>{busy ? "Подождите…" : register ? "Зарегистрироваться" : "Войти"}</button><p role="alert">{error}</p></form><p><Link href={register ? "/login" : "/register"}>{register ? "Уже есть аккаунт? Войти" : "Создать аккаунт бизнеса"}</Link></p></main></>;
}
