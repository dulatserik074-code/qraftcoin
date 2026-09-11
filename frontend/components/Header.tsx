import Link from "next/link";
export function Header() { return <header className="header"><Link href="/" className="brand"><span className="coin">Q</span><span>QazLoyal</span></Link><nav><Link href="/">Overview</Link><Link href="/demo">Rewards demo</Link><Link href="/dashboard">Workspace</Link><Link href="/login">Sign in</Link></nav><span className="testnet">LOYALTY TECH</span></header>; }
