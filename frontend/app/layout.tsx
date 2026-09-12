import type { Metadata } from "next";
import "./globals.css";
import "./v02.css";
export const metadata: Metadata = { title: "QazLoyal — Бонусы для ваших клиентов", description: "Простая программа лояльности для малого бизнеса: клиенты, бонусы и повторные покупки." };
export default function RootLayout({children}: Readonly<{children: React.ReactNode}>) {return <html lang="ru"><body>{children}</body></html>}
