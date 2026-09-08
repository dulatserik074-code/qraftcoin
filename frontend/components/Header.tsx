import Link from "next/link";
export function Header() {
  return <header className="header"><Link href="/" className="brand"><span className="coin">Q</span><span>Qraft Coin</span></Link><nav><Link href="/">Wallet</Link><Link href="/tokenomics">Tokenomics</Link></nav><span className="testnet"><i /> TESTNET</span></header>;
}
