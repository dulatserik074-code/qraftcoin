import { Flame, LockKeyhole, Sparkles } from "lucide-react";
import { Header } from "@/components/Header";
export default function Tokenomics() {
  return <><Header/><main className="shell tokenomics"><span className="eyebrow">QFT / TOKEN ECONOMICS</span><h1>A finite token.<br/><em>Clear rules.</em></h1><p className="lede">QFT starts with a hard cap and no path to mint more. Every rule below is public and enforced by the smart contract.</p>
    <section className="token-grid"><article><span>MAXIMUM SUPPLY</span><strong>1,000,000</strong><small>QFT</small><LockKeyhole/></article><article><span>ADDITIONAL MINTING</span><strong>Disabled</strong><small>Permanently</small><Sparkles/></article><article><span>BURN</span><strong>Enabled</strong><small>Voluntary & allowance-based</small><Flame/></article></section>
    <section className="economy"><div><span className="eyebrow">UTILITY</span><h2>Designed for the Qraft ecosystem</h2></div><div className="utility-list"><p><b>01</b> AI services</p><p><b>02</b> Subscriptions</p><p><b>03</b> Digital products</p><p><b>04</b> Rewards</p><p><b>05</b> Payments</p></div></section>
    <aside className="caveat"><Flame/><div><b>Supply mechanics are not a promise of value.</b><p>Limited issuance and token burning can reduce circulating supply, but neither mechanism guarantees demand, liquidity, or an increase in market price. QFT is currently a test token.</p></div></aside>
  </main></>;
}
