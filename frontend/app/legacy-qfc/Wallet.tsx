"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BrowserProvider, Contract, formatUnits, isAddress, parseUnits } from "ethers";
import { ArrowUpRight, ExternalLink, Flame, RefreshCw, ShieldCheck, Wallet, Zap } from "lucide-react";
import { Header } from "@/components/Header";
import { explorerUrl, NETWORK_NAME, PAYMENT_ABI, PAYMENT_CODE_HASH, QFT_ABI, QFT_TOKEN_ADDRESS, QRAFT_PAYMENT_ADDRESS, SUPPORTED_CHAIN_ID } from "@/modules/blockchain/legacy-qfc/contract";
import { chainIdToHex, EMPTY_WALLET_DATA } from "@/modules/blockchain/legacy-qfc/network";

declare global { interface Window { ethereum?: { request: (args: { method: string; params?: unknown[] }) => Promise<unknown>; on?: (event: string, cb: (...args: unknown[]) => void) => void; removeListener?: (event: string, cb: (...args: unknown[]) => void) => void } } }
import { paymentReader, validatePayment, paymentSplit, type PaymentTerms } from "@/modules/blockchain/legacy-qfc/payment";
const paymentConfig = { address: QRAFT_PAYMENT_ADDRESS, token: QFT_TOKEN_ADDRESS, chainId: SUPPORTED_CHAIN_ID, codeHash: PAYMENT_CODE_HASH };
type Mode = "send" | "burn";
type Status = { type: "idle" | "loading" | "success" | "error"; text: string; hash?: string };
const IDLE: Status = { type: "idle", text: "" };

function friendlyError(error: unknown, fallback: string) {
  if (!(error instanceof Error)) return fallback;
  const candidate = error as Error & { shortMessage?: string; code?: string };
  if (candidate.code === "ACTION_REJECTED") return "The request was cancelled in MetaMask.";
  const message = candidate.shortMessage || candidate.message;
  if (message.includes("insufficient funds")) return "Not enough ETH to pay the network fee.";
  if (message.includes("ERC20InsufficientBalance")) return "Your test tokens balance is too low.";
  if (message.includes("ERC20InsufficientAllowance")) return "The test tokens allowance is too low.";
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
  const refreshGeneration = useRef(0);
  const [paymentTerms, setPaymentTerms] = useState<PaymentTerms | null>(null);
  const [symbol, setSymbol] = useState("test tokens");
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
  const configured = isAddress(QFT_TOKEN_ADDRESS) && isAddress(QRAFT_PAYMENT_ADDRESS);
  const onSupportedChain = chainId === SUPPORTED_CHAIN_ID;
  const pending = status.type === "loading" || payStatus.type === "loading";
  const preview = useMemo(() => { try { if (!paymentTerms) return null; return paymentSplit(parseAmount(payAmount), paymentTerms); } catch { return null; } }, [payAmount, paymentTerms]);

  const clearWalletState = useCallback(() => {
    refreshGeneration.current += 1;
    setPaymentTerms(null);
    setSymbol("test tokens");
    setBalance(EMPTY_WALLET_DATA.balance);
    setSupply(EMPTY_WALLET_DATA.supply);
    setAllowance(EMPTY_WALLET_DATA.allowance);
    setStatus(IDLE);
    setPayStatus(IDLE);
  }, []);

  const refresh = useCallback(async (address: string) => {
    if (!window.ethereum || !address) { clearWalletState(); return; }
    const generation = ++refreshGeneration.current;
    setPaymentTerms(null);
    const provider = new BrowserProvider(window.ethereum);
    const chain = await provider.getNetwork();
    if (generation !== refreshGeneration.current) return;
    const id = Number(chain.chainId);
    setChainId(id);
    setNetwork(id === SUPPORTED_CHAIN_ID ? NETWORK_NAME : chain.name === "unknown" ? `Chain ${chain.chainId}` : chain.name);
    if (id !== SUPPORTED_CHAIN_ID || !configured) { clearWalletState(); return; }
    const token = new Contract(QFT_TOKEN_ADDRESS, QFT_ABI, provider);
    const metadata = await Promise.all([token.name(), token.symbol(), token.decimals()]);
    if (metadata[0] !== "Qraft Coin" || !["QFC", "QFT"].includes(metadata[1]) || metadata[2] !== 18n) throw new Error("Unsupported legacy token metadata");
    if (generation !== refreshGeneration.current) return;
    setSymbol(metadata[1]);
    const [nextBalance, nextSupply, nextAllowance] = await Promise.all([token.balanceOf(address), token.totalSupply(), token.allowance(address, QRAFT_PAYMENT_ADDRESS)]);
    if (generation !== refreshGeneration.current) return;
    setBalance(nextBalance); setSupply(nextSupply); setAllowance(nextAllowance);
    try {
      const terms = await validatePayment(paymentReader(provider), paymentConfig);
      if (generation === refreshGeneration.current) { setPaymentTerms(terms); setPayStatus(IDLE); }
    } catch (error) {
      if (generation === refreshGeneration.current) { setPaymentTerms(null); setPayStatus({ type: "error", text: friendlyError(error, "Payment contract validation failed.") }); }
    }
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

  async function signerAndGuard(forPayment = false) {
    if (!account || !window.ethereum) throw new Error("Connect MetaMask first.");
    if (!configured) throw new Error("Configure both contract addresses.");
    const provider = new BrowserProvider(window.ethereum);
    const current = Number((await provider.getNetwork()).chainId);
    setChainId(current);
    if (current !== SUPPORTED_CHAIN_ID) throw new Error(`Please switch your wallet to ${NETWORK_NAME}.`);
    const token = new Contract(QFT_TOKEN_ADDRESS, QFT_ABI, provider);
    const metadata = await Promise.all([token.name(), token.symbol(), token.decimals()]);
    if (metadata[0] !== "Qraft Coin" || !["QFC", "QFT"].includes(metadata[1]) || metadata[2] !== 18n) throw new Error("Unsupported legacy token metadata");
    if (forPayment) {
      const verified = await validatePayment(paymentReader(provider), paymentConfig);
      if (!paymentTerms || verified.burnRate !== paymentTerms.burnRate || verified.denominator !== paymentTerms.denominator || verified.treasury !== paymentTerms.treasury || verified.codeHash !== paymentTerms.codeHash) {
        setPaymentTerms(verified);
        throw new Error("Payment terms changed. Review the new preview and retry.");
      }
    }
    const signer = await provider.getSigner();
    if ((await signer.getAddress()).toLowerCase() !== account.toLowerCase()) throw new Error("Wallet account changed. Reconnect and retry.");
    return signer;
  }

  async function submit() {
    try {
      const value = parseAmount(amount);
      if (value > balance) throw new Error("Your test tokens balance is too low.");
      if (mode === "send" && !isAddress(recipient)) throw new Error("Enter a valid recipient address.");
      setStatus({ type: "loading", text: "Confirm the transaction in MetaMask…" });
      const token = new Contract(QFT_TOKEN_ADDRESS, QFT_ABI, await signerAndGuard());
      const tx = mode === "send" ? await token.transfer(recipient, value) : await token.burn(value);
      setStatus({ type: "loading", text: "Transaction pending…", hash: tx.hash }); await tx.wait();
      setStatus({ type: "success", text: mode === "send" ? "test tokens sent successfully." : "test tokens burned successfully.", hash: tx.hash });
      setAmount(""); if (mode === "send") setRecipient(""); await refresh(account);
    } catch (error) { setStatus({ type: "error", text: friendlyError(error, "Transaction failed.") }); }
  }

  async function approvePayment() {
    try {
      if (!preview) throw new Error("Enter a valid payment amount.");
      if (preview.payment > balance) throw new Error("Your test tokens balance is too low.");
      setPayStatus({ type: "loading", text: "Confirm the allowance in MetaMask…" });
      const token = new Contract(QFT_TOKEN_ADDRESS, QFT_ABI, await signerAndGuard(true));
      const tx = await token.approve(QRAFT_PAYMENT_ADDRESS, preview.payment);
      setPayStatus({ type: "loading", text: "Approval pending…", hash: tx.hash }); await tx.wait(); await refresh(account);
      setPayStatus({ type: "success", text: "Allowance approved. You can now pay.", hash: tx.hash });
    } catch (error) { setPayStatus({ type: "error", text: friendlyError(error, "Approval failed.") }); }
  }

  async function pay() {
    try {
      if (!preview) throw new Error("Enter a valid payment amount.");
      if (preview.payment > balance) throw new Error("Your test tokens balance is too low.");
      if (allowance < preview.payment) throw new Error("Approve this test tokens amount before paying.");
      setPayStatus({ type: "loading", text: "Confirm the payment in MetaMask…" });
      const payment = new Contract(QRAFT_PAYMENT_ADDRESS, PAYMENT_ABI, await signerAndGuard(true));
      const tx = await payment.pay(preview.payment);
      setPayStatus({ type: "loading", text: "Payment pending…", hash: tx.hash }); await tx.wait(); await refresh(account);
      setPayStatus({ type: "success", text: `Payment completed. ${displayUnits(preview.burned, 18)} ${symbol} burned.`, hash: tx.hash }); setPayAmount("");
    } catch (error) { setPayStatus({ type: "error", text: friendlyError(error, "Payment failed.") }); }
  }

  useEffect(() => {
    if (!window.ethereum) return;
    const reportRefreshError = (error: unknown) => { clearWalletState(); setStatus({ type: "error", text: friendlyError(error, "Wallet refresh failed.") }); };
    const accountsChanged = (...args: unknown[]) => { const accounts = args[0] as string[]; clearWalletState(); setAccount(accounts?.[0] || ""); if (accounts?.[0]) void refresh(accounts[0]).catch(reportRefreshError); else { setChainId(null); setNetwork("Not connected"); } };
    const chainChanged = () => { clearWalletState(); if (account) void refresh(account).catch(reportRefreshError); };
    const disconnected = () => { clearWalletState(); setAccount(""); setChainId(null); setNetwork("Not connected"); };
    window.ethereum.on?.("accountsChanged", accountsChanged); window.ethereum.on?.("chainChanged", chainChanged); window.ethereum.on?.("disconnect", disconnected);
    return () => { window.ethereum?.removeListener?.("accountsChanged", accountsChanged); window.ethereum?.removeListener?.("chainChanged", chainChanged); window.ethereum?.removeListener?.("disconnect", disconnected); };
  }, [account, clearWalletState, refresh]);

  const short = account ? `${account.slice(0, 6)}…${account.slice(-4)}` : "Not connected";
  const walletLink = account ? explorerUrl(chainId, "address", account) : undefined;
  const tokenLink = configured ? explorerUrl(chainId, "address", QFT_TOKEN_ADDRESS) : undefined;
  const paymentLink = configured ? explorerUrl(chainId, "address", QRAFT_PAYMENT_ADDRESS) : undefined;
  const renderStatus = (value: Status) => value.type !== "idle" && <div className={`notice ${value.type}`}><span>{value.text}</span>{value.hash && explorerUrl(chainId, "tx", value.hash) && <a href={explorerUrl(chainId, "tx", value.hash)} target="_blank" rel="noreferrer">View transaction <ExternalLink size={12}/></a>}</div>;

  return <><Header/><main className="shell">
    <section className="intro"><div><span className="eyebrow">QAZLOYAL / EXPERIMENTAL BLOCKCHAIN</span><h1>Legacy token<br/><em>test workspace.</em></h1></div><p>Optional Sepolia prototype. These {symbol} are separate from QazLoyal Points.</p></section>
    {account && !onSupportedChain && <div className="network-guard"><div><b>Please switch your wallet to {NETWORK_NAME}.</b><span>Transactions are disabled on the current network.</span></div><button className="primary" onClick={switchToSupportedNetwork}>Switch to {NETWORK_NAME}</button></div>}
    <section className="dashboard">
      <article className="wallet-card"><div className="wallet-top"><span>LEGACY QRAFT COIN</span><span className="symbol">{symbol}</span></div><div className="balance-label">YOUR BALANCE</div><div className="balance">{displayUnits(balance)}<small>{symbol}</small></div><div className="no-price">Estimated value <strong>Not available</strong></div><div className="wallet-bottom"><div><span>NETWORK</span><b><i className="green"/>{network}</b></div><div><span>ADDRESS</span>{walletLink ? <a href={walletLink} target="_blank" rel="noreferrer">{short} ↗</a> : <b>{short}</b>}</div></div></article>
      <article className="action-card"><div className="tabs"><button disabled={pending} className={mode === "send" ? "active" : ""} onClick={() => setMode("send")}><ArrowUpRight size={18}/> Send {symbol}</button><button disabled={pending} className={mode === "burn" ? "active burn" : ""} onClick={() => setMode("burn")}><Flame size={18}/> Burn {symbol}</button></div>
        {!account ? <div className="connect-state"><Wallet size={36}/><h2>Your wallet is the key</h2><p>Connect MetaMask to view your balance and manage the experimental token.</p><button className="primary" onClick={connect}>Connect Wallet</button></div> : <div className="form">
          {mode === "send" && <label>Recipient address<input value={recipient} onChange={e => setRecipient(e.target.value)} placeholder="0x…" autoComplete="off" disabled={pending}/></label>}
          <label>Amount<div className="amount-input"><input value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" inputMode="decimal" disabled={pending}/><span>{symbol}</span></div></label>
          <button className={`primary ${mode === "burn" ? "danger" : ""}`} onClick={submit} disabled={pending || !onSupportedChain}>{status.type === "loading" ? <RefreshCw className="spin" size={18}/> : mode === "send" ? <ArrowUpRight size={18}/> : <Flame size={18}/>} {status.type === "loading" ? "Processing…" : mode === "send" ? `Send ${symbol}` : `Burn ${symbol}`}</button>
        </div>}{renderStatus(status)}</article>
    </section>
    <section className="payment-card"><div className="payment-heading"><div><span className="eyebrow">SERVICE PAYMENT</span><h2>Pay with {symbol}</h2><p>Payment parameters are read from the verified contract.</p></div><Zap/></div>
      {!account ? <button className="primary" onClick={connect}>Connect Wallet</button> : <div className="payment-layout"><div className="form payment-form"><label>Payment amount<div className="amount-input"><input value={payAmount} onChange={e => { setPayAmount(e.target.value); setPayStatus(IDLE); }} placeholder="100.00" inputMode="decimal" disabled={pending}/><span>{symbol}</span></div></label><div className="allowance"><span>Current allowance</span><strong>{displayUnits(allowance)} {symbol}</strong></div></div>
        <div className="payment-preview"><div><span>Payment</span><strong>{preview ? displayUnits(preview.payment, 18) : "—"} {symbol}</strong></div><div><span>Treasury receives</span><strong>{preview ? displayUnits(preview.treasury, 18) : "—"} {symbol}</strong></div><div className="burn-row"><span>Burned</span><strong>{preview ? displayUnits(preview.burned, 18) : "—"} {symbol}</strong></div></div>
        <div className="payment-actions">{preview && allowance < preview.payment ? <button className="primary" onClick={approvePayment} disabled={pending || !onSupportedChain}>Approve {displayUnits(preview.payment, 18)} {symbol}</button> : <button className="primary" onClick={pay} disabled={pending || !preview || !onSupportedChain}><Zap size={18}/>{payStatus.type === "loading" ? "Processing…" : "Pay"}</button>}</div></div>}{paymentTerms && <p>Verified burn ratio: {paymentTerms.burnRate.toString()} / {paymentTerms.denominator.toString()}. Treasury: {paymentTerms.treasury}</p>}{renderStatus(payStatus)}
    </section>
    <section className="metrics four"><div><span>TOTAL SUPPLY</span><strong>{supply === null ? "—" : displayUnits(supply, 2)} {symbol}</strong></div><div><span>{symbol} CONTRACT</span>{tokenLink ? <a href={tokenLink} target="_blank" rel="noreferrer">{QFT_TOKEN_ADDRESS.slice(0, 8)}…{QFT_TOKEN_ADDRESS.slice(-6)} ↗</a> : <strong>Not configured</strong>}</div><div><span>PAYMENT CONTRACT</span>{paymentLink ? <a href={paymentLink} target="_blank" rel="noreferrer">{QRAFT_PAYMENT_ADDRESS.slice(0, 8)}…{QRAFT_PAYMENT_ADDRESS.slice(-6)} ↗</a> : <strong>Not configured</strong>}</div><div><ShieldCheck/><p><b>Fixed by code</b><br/>No additional minting</p></div></section>
    <p className="disclaimer">{symbol} is currently a test token. Market price is not guaranteed.</p>
  </main></>;
}


