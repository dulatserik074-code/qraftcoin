import type { Metadata } from "next";
import "./globals.css";
import "./v02.css";
export const metadata: Metadata = { title: "QazLoyal — Digital loyalty for businesses", description: "Reward purchases and customer actions, encourage repeat sales and build customer loyalty with QazLoyal." };
export default function RootLayout({children}: Readonly<{children: React.ReactNode}>) {return <html lang="en"><body>{children}</body></html>}
