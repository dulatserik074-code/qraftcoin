"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { BrowserProvider, Contract, formatUnits, isAddress, parseUnits } from "ethers";
import { ArrowUpRight, ExternalLink, Flame, RefreshCw, ShieldCheck, Wallet, Zap } from "lucide-react";
import { Header } from "@/components/Header";
import { assertQFCMetadata, explorerUrl, NETWORK_NAME, PAYMENT_ABI, QFC_ABI, QFC_TOKEN_ADDRESS, QRAFT_PAYMENT_ADDRESS, SUPPORTED_CHAIN_ID } from "@/lib/contract";
import { chainIdToHex, EMPTY_WALLET_DATA } from "@/lib/network";

declare global { interface Window { ethereum?: { request: (args: { method: string; params?: unknown[] }) => Promise<unknown>; on?: (event: string, cb: (...args: unknown[]) => void) => void; removeListener?: (event: string, cb: (...args: unknown[]) => void) => void } } }
type Mode = "send" | "burn";
type Status = { type: "idle" | "loading" | "success" | "error"; text: string; hash?: string };
const IDLE: Status = { type: "idle", text: "" };

function friendlyError(error: unknown, fallback: string) {
  if (!(error instanceof Error)) return fallback;
  const candidate = error as Error & { shortMessage?: string; code?: string };
  if (candidate.code === "ACTION_REJECTED") return "The request was cancelled in MetaMask.";
  const message = candidate.shortMessage || candidate.message;
  if (message.includes("insufficient funds")) return "Not enough ETH to pay the network fee.";
  if (message.includes("ERC20InsufficientBalance")) return "Your QFC balance is too low.";
  if (message.includes("ERC20InsufficientAllowance")) return "The QFC allowance is too low.";
  return message.length < 180 ? message : fallback;
}

function displayUnits(value: bigint, maximumDecimals = 4) {
  const [whole, decimals = ""] = formatUnits(value, 18).split(".");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const trimmed = decimals.slice(0, maximumDecimals).replace(/0+$/, "");
  return trimmed ? `${grouped}.${trimmed}` : grouped;
}

function parseAmount(value: string) {
  if (!/^\d+(\.\d{0,18})?$/.test(value)) throw new Error("Enter a valid amount with up to 18 decimals.");
  const parsed = parseUnits(value, 18);
  if (parsed <= 0n) throw new Error("Amount must be greater than zero.");
  return parsed;
}

export default function Home() {
  const [account, setAccount] = useState("");
  const [chainId, setChainId] = useState<number | null>(null);
  const [network, setNetwork] = useState("Not connected");
  const [balance, setBalance] = useState(0n);
  const [supply, setSupply] = useState<bigint | null>(null);
  const [allowance, setAllowance] = useState(0n);
  const [mode, setMode] = useState<Mode>("send");
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [payAmount, setPayAmount] = useState("");
  const [status, setStatus] = useState<Status>(IDLE);
  const [payStatus, setPayStatus] = useState<Status>(IDLE);
  const configured = isAddress(QFC_TOKEN_ADDRESS) && isAddress(QRAFT_PAYMENT_ADDRESS);
  const onSupportedChain = chainId === SUPPORTED_CHAIN_ID;
  const pending = status.type === "loading" || payStatus.type === "loading";
  const preview = useMemo(() => { try { const payment = parseAmount(payAmount); const burned = payment * 500n / 10_000n; return { payment, treasury: payment - burned, burned }; } catch { return null; } }, [payAmount]);

  const clearWalletState = useCallback(() => {
    setBalance(EMPTY_WALLET_DATA.balance);
    setSupply(EMPTY_WALLET_DATA.supply);
    setAllowance(EMPTY_WALLET_DATA.allowance);
    setStatus(IDLE);
    setPayStatus(IDLE);
  }, []);

  const refresh = useCallback(async (address: string) => {
    if (!window.ethereum || !address) { clearWalletState(); return; }
    const provider = new BrowserProvider(window.ethereum);
    const chain = await provider.getNetwork();
    const id = Number(chain.chainId);
    setChainId(id);
    setNetwork(id === SUPPORTED_CHAIN_ID ? NETWORK_NAME : chain.name === "unknown" ? `Chain ${chain.chainId}` : chain.name);
    if (id !== SUPPORTED_CHAIN_ID || !configured) { clearWalletState(); return; }
    const token = new Contract(QFC_TOKEN_ADDRESS, QFC_ABI, provider);
    try { assertQFCMetadata(await token.name(), await token.symbol(), await token.decimals()); }
    catch (error) { clearWalletState(); throw error; }
    const [nextBalance, nextSupply, nextAllowance] = await Promise.all([token.balanceOf(address), token.totalSupply(), token.allowance(address, QRAFT_PAYMENT_ADDRESS)]);
    setBalance(nextBalance); setSupply(nextSupply); setAllowance(nextAllowance);
  }, [clearWalletState, configured]);

  async function connect() {
    try {
      if (!window.ethereum) throw new Error("MetaMask is not installed.");
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" }) as string[];
      if (!accounts[0]) throw new Error("No wallet account was selected.");
      clearWalletState(); setAccount(accounts[0]); await refresh(accounts[0]);
    } catch (error) { setStatus({ type: "error", text: friendlyError(error, "Could not connect wallet.") }); }
  }

  async function switchToSupportedNetwork() {
    try { if (!window.ethereum) throw new Error("MetaMask is not installed."); await window.ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: chainIdToHex(SUPPORTED_CHAIN_ID) }] }); if (account) await refresh(account); }
    catch (error) { setStatus({ type: "error", text: friendlyError(error, `Could not switch to ${NETWORK_NAME}.`) }); }
  }

  async function signerAndGuard() {
    if (!account || !window.ethereum) throw new Error("Connect MetaMask first.");
    if (!configured) throw new Error("Configure both contract addresses.");
    const provider = new BrowserProvider(window.ethereum);
    const current = Number((await provider.getNetwork()).chainId);
    setChainId(current);
    if (current !== SUPPORTED_CHAIN_ID) throw new Error(`Please switch your wallet to ${NETWORK_NAME}.`);
    const token = new Contract(QFC_TOKEN_ADDRESS, QFC_ABI, provider);
    assertQFCMetadata(await token.name(), await token.symbol(), await token.decimals());
    return provider.getSigner();
  }

  async function submit() {
    try {
      const value = parseAmount(amount);
      if (value > balance) throw new Error("Your QFC balance is too low.");
      if (mode === "send" && !isAddress(recipient)) throw new Error("Enter a valid recipient address.");
      setStatus({ type: "loading", text: "Confirm the transaction in MetaMask…" });
      const token = new Contract(QFC_TOKEN_ADDRESS, QFC_ABI, await signerAndGuard());
      const tx = mode === "send" ? await token.transfer(recipient, value) : await token.burn(value);
      setStatus({ type: "loading", text: "Transaction pending…", hash: tx.hash }); await tx.wait();
      setStatus({ type: "success", text: mode === "send" ? "QFC sent successfully." : "QFC burned successfully.", hash: tx.hash });
      setAmount(""); if (mode === "send") setRecipient(""); await refresh(account);
    } catch (error) { setStatus({ type: "error", text: friendlyError(error, "Transaction failed.") }); }
  }

  async function approvePayment() {
    try {
      if (!preview) throw new Error("Enter a valid payment amount.");
      if (preview.payment > balance) throw new Error("Your QFC balance is too low.");
      setPayStatus({ type: "loading", text: "Confirm the allowance in MetaMask…" });
      const token = new Contract(QFC_TOKEN_ADDRESS, QFC_ABI, await signerAndGuard());
      const tx = await token.approve(QRAFT_PAYMENT_ADDRESS, preview.payment);
      setPayStatus({ type: "loading", text: "Approval pending…", hash: tx.hash }); await tx.wait(); await refresh(account);
      setPayStatus({ type: "success", text: "Allowance approved. You can now pay.", hash: tx.hash });
    } catch (error) { setPayStatus({ type: "error", text: friendlyError(error, "Approval failed.") }); }
  }

  async function pay() {
    try {
      if (!preview) throw new Error("Enter a valid payment amount.");
      if (preview.payment > balance) throw new Error("Your QFC balance is too low.");
      if (allowance < preview.payment) throw new Error("Approve this QFC amount before paying.");
      setPayStatus({ type: "loading", text: "Confirm the payment in MetaMask…" });
      const payment = new Contract(QRAFT_PAYMENT_ADDRESS, PAYMENT_ABI, await signerAndGuard());
      const tx = await payment.pay(preview.payment);
      setPayStatus({ type: "loading", text: "Payment pending…", hash: tx.hash }); await tx.wait(); await refresh(account);
      setPayStatus({ type: "success", text: "Payment completed and 5% permanently burned.", hash: tx.hash }); setPayAmount("");
    } catch (error) { setPayStatus({ type: "error", text: friendlyError(error, "Payment failed.") }); }
  }

  useEffect(() => {
    if (!window.ethereum) return;
    const accountsChanged = (...args: unknown[]) => { const accounts = args[0] as string[]; clearWalletState(); setAccount(accounts?.[0] || ""); if (accounts?.[0]) refresh(accounts[0]); else { setChainId(null); setNetwork("Not connected"); } };
    const chainChanged = () => { clearWalletState(); if (account) refresh(account); };
    const disconnected = () => { clearWalletState(); setAccount(""); setChainId(null); setNetwork("Not connected"); };
    window.ethereum.on?.("accountsChanged", accountsChanged); window.ethereum.on?.("chainChanged", chainChanged); window.ethereum.on?.("disconnect", disconnected);
    return () => { window.ethereum?.removeListener?.("accountsChanged", accountsChanged); window.ethereum?.removeListener?.("chainChanged", chainChanged); window.ethereum?.removeListener?.("disconnect", disconnected); };
  }, [account, clearWalletState, refresh]);

  const short = account ? `${account.slice(0, 6)}…${account.slice(-4)}` : "Not connected";
  const walletLink = account ? explorerUrl(chainId, "address", account) : undefined;
  const tokenLink = configured ? explorerUrl(chainId, "address", QFC_TOKEN_ADDRESS) : undefined;
  const paymentLink = configured ? explorerUrl(chainId, "address", QRAFT_PAYMENT_ADDRESS) : undefined;
  const renderStatus = (value: Status) => value.type !== "idle" && <div className={`notice ${value.type}`}><span>{value.text}</span>{value.hash && explorerUrl(chainId, "tx", value.hash) && <a href={explorerUrl(chainId, "tx", value.hash)} target="_blank" rel="noreferrer">View transaction <ExternalLink size={12}/></a>}</div>;

  return <><Header/><main className="shell">
    <section className="intro"><div><span className="eyebrow">QRAFT PROTOCOL / WALLET v0.2</span><h1>Digital value,<br/><em>crafted to last.</em></h1></div><p>A fixed-supply token for the future Qraft ecosystem. Built transparently on Ethereum-compatible infrastructure.</p></section>
    {account && !onSupportedChain && <div className="network-guard"><div><b>Please switch your wallet to {NETWORK_NAME}.</b><span>Transactions are disabled on the current network.</span></div><button className="primary" onClick={switchToSupportedNetwork}>Switch to {NETWORK_NAME}</button></div>}
    <section className="dashboard">
      <article className="wallet-card"><div className="wallet-top"><span>QRAFT COIN</span><span className="symbol">QFC</span></div><div className="balance-label">YOUR BALANCE</div><div className="balance">{displayUnits(balance)}<small>QFC</small></div><div className="no-price">Estimated value <strong>Not available</strong></div><div className="wallet-bottom"><div><span>NETWORK</span><b><i className="green"/>{network}</b></div><div><span>ADDRESS</span>{walletLink ? <a href={walletLink} target="_blank" rel="noreferrer">{short} ↗</a> : <b>{short}</b>}</div></div></article>
      <article className="action-card"><div className="tabs"><button disabled={pending} className={mode === "send" ? "active" : ""} onClick={() => setMode("send")}><ArrowUpRight size={18}/> Send QFC</button><button disabled={pending} className={mode === "burn" ? "active burn" : ""} onClick={() => setMode("burn")}><Flame size={18}/> Burn QFC</button></div>
        {!account ? <div className="connect-state"><Wallet size={36}/><h2>Your wallet is the key</h2><p>Connect MetaMask to view your balance and manage QFC.</p><button className="primary" onClick={connect}>Connect Wallet</button></div> : <div className="form">
          {mode === "send" && <label>Recipient address<input value={recipient} onChange={e => setRecipient(e.target.value)} placeholder="0x…" autoComplete="off" disabled={pending}/></label>}
          <label>Amount<div className="amount-input"><input value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" inputMode="decimal" disabled={pending}/><span>QFC</span></div></label>
          <button className={`primary ${mode === "burn" ? "danger" : ""}`} onClick={submit} disabled={pending || !onSupportedChain}>{status.type === "loading" ? <RefreshCw className="spin" size={18}/> : mode === "send" ? <ArrowUpRight size={18}/> : <Flame size={18}/>} {status.type === "loading" ? "Processing…" : mode === "send" ? "Send QFC" : "Burn QFC"}</button>
        </div>}{renderStatus(status)}</article>
    </section>
    <section className="payment-card"><div className="payment-heading"><div><span className="eyebrow">SERVICE PAYMENT</span><h2>Pay with QFC</h2><p>One approval, then a transparent on-chain payment.</p></div><Zap/></div>
      {!account ? <button className="primary" onClick={connect}>Connect Wallet</button> : <div className="payment-layout"><div className="form payment-form"><label>Payment amount<div className="amount-input"><input value={payAmount} onChange={e => { setPayAmount(e.target.value); setPayStatus(IDLE); }} placeholder="100.00" inputMode="decimal" disabled={pending}/><span>QFC</span></div></label><div className="allowance"><span>Current allowance</span><strong>{displayUnits(allowance)} QFC</strong></div></div>
        <div className="payment-preview"><div><span>Payment</span><strong>{preview ? displayUnits(preview.payment, 18) : "—"} QFC</strong></div><div><span>Treasury receives</span><strong>{preview ? displayUnits(preview.treasury, 18) : "—"} QFC</strong></div><div className="burn-row"><span>Burned</span><strong>{preview ? displayUnits(preview.burned, 18) : "—"} QFC</strong></div></div>
        <div className="payment-actions">{preview && allowance < preview.payment ? <button className="primary" onClick={approvePayment} disabled={pending || !onSupportedChain}>Approve {displayUnits(preview.payment, 18)} QFC</button> : <button className="primary" onClick={pay} disabled={pending || !preview || !onSupportedChain}><Zap size={18}/>{payStatus.type === "loading" ? "Processing…" : "Pay"}</button>}</div></div>}{renderStatus(payStatus)}
    </section>
    <section className="metrics four"><div><span>TOTAL SUPPLY</span><strong>{supply === null ? "—" : displayUnits(supply, 2)} QFC</strong></div><div><span>QFC CONTRACT</span>{tokenLink ? <a href={tokenLink} target="_blank" rel="noreferrer">{QFC_TOKEN_ADDRESS.slice(0, 8)}…{QFC_TOKEN_ADDRESS.slice(-6)} ↗</a> : <strong>Not configured</strong>}</div><div><span>PAYMENT CONTRACT</span>{paymentLink ? <a href={paymentLink} target="_blank" rel="noreferrer">{QRAFT_PAYMENT_ADDRESS.slice(0, 8)}…{QRAFT_PAYMENT_ADDRESS.slice(-6)} ↗</a> : <strong>Not configured</strong>}</div><div><ShieldCheck/><p><b>Fixed by code</b><br/>No additional minting</p></div></section>
    <p className="disclaimer">QFC is currently a test token. Market price is not guaranteed.</p>
  </main></>;
}
