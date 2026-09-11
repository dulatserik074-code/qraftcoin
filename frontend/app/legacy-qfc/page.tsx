import { Header } from "@/components/Header";
import Wallet from "./Wallet";
export const dynamic = "force-dynamic";
export default function Page() {
 if (process.env.BLOCKCHAIN_ENABLED !== "true") return <><Header/><main className="shell"><h1>Experimental blockchain prototype</h1><p>The legacy QraftCoin integration is disabled. QazLoyal works without a wallet.</p></main></>;
 return <Wallet/>;
}
