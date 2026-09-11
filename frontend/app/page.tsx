import Link from "next/link";
import { Header } from "@/components/Header";
export default function Home() {return <><Header/><main className="shell">
 <section className="intro"><div><span className="eyebrow">DIGITAL LOYALTY FOR BUSINESSES</span><h1>Turn buyers into<br/><em>returning customers.</em></h1></div><p>QazLoyal helps small and medium businesses reward purchases and customer actions, encourage repeat sales and strengthen customer relationships.</p></section>
 <Link className="primary" href="/register">Start your loyalty program</Link> <Link className="primary" href="/demo">Try the rewards demo →</Link>
 <section className="token-grid"><article><h2>Reward customers</h2><p>Design rewards for purchases, visits and meaningful customer actions.</p></article><article><h2>Increase retention</h2><p>Give customers a reason to return and use their rewards with your business.</p></article><article><h2>Understand loyalty</h2><p>Build a clear history of rewards to support customer retention analytics.</p></article></section>
 <section className="economy"><div><span className="eyebrow">HOW IT WORKS</span><h2>Your business.<br/>Your loyalty rules.</h2></div><div className="utility-list"><p>01 · Create a loyalty program</p><p>02 · Add your customers</p><p>03 · Reward purchases and actions</p><p>04 · Customers return and redeem rewards</p></div></section>
 <section className="payment-card"><h2>QazLoyal Points</h2><p>Digital rewards for your customers. Each business defines how points are earned and used. Points have no universal fixed monetary value.</p><p>Built for shops, cafés, salons, local services and online stores. No Web3 wallet is required for the rewards demo.</p></section>
 <p className="disclaimer">Persistent business accounts, rewards and analytics are available in your workspace. The separate demo uses temporary sample data. <Link href="/legacy-qfc">Experimental blockchain prototype</Link></p>
 </main></>}
