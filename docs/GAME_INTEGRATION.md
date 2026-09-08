# Game integration

The current token is Qraft Coin (QFC). Sepolia deployment is pending. Use the verified new address after deployment. No token purchase or financial commitment is required for experiments.

## Level 1 — Read QFC balance

~~~text
Player wallet
  ↓
Game frontend
  ↓
QraftCoin ERC-20 contract
  ↓
balanceOf(player)
~~~

This ethers v6 browser function requests wallet access after a user clicks Connect. Supply a verified contract address; never substitute an invented address. Bundle it in an application that has ethers installed.

~~~javascript
import { ethers } from "ethers";

export async function connectAndReadBalance(tokenAddress) {
  if (!window.ethereum) throw new Error("Install a compatible wallet.");
  if (!ethers.isAddress(tokenAddress) || tokenAddress === ethers.ZeroAddress) {
    throw new Error("Configure the verified Sepolia token address.");
  }
  const provider = new ethers.BrowserProvider(window.ethereum);
  await provider.send("eth_requestAccounts", []);
  if ((await provider.getNetwork()).chainId !== 11155111n) {
    throw new Error("Switch your wallet to Ethereum Sepolia.");
  }
  if ((await provider.getCode(tokenAddress)) === "0x") {
    throw new Error("No token contract at this address.");
  }
  const player = await (await provider.getSigner()).getAddress();
  const token = new ethers.Contract(tokenAddress, [
    "function balanceOf(address) view returns (uint256)",
    "function decimals() view returns (uint8)",
    "function symbol() view returns (string)"
  ], provider);
  const [balance, decimals, symbol] = await Promise.all([
    token.balanceOf(player), token.decimals(), token.symbol()
  ]);
  if (symbol !== "QFC") throw new Error("Expected QFC; check the configured token address.");
  return { player, balance: ethers.formatUnits(balance, decimals), symbol };
}
~~~

Recreate the provider and refresh the display on accountsChanged and chainChanged. Handle rejected connections and RPC errors in the UI. A read does not require approval, gas or a token transfer. The runnable [Node example](../examples/ethers/qfc-example.js) works without connecting a wallet.

## Level 2 — Reward players

~~~text
Game server
  ↓
Reward validation
  ↓
Authorized reward wallet/service
  ↓
QFC transfer
  ↓
Player wallet
~~~

The server validates achievements using authoritative game state. Authenticate the player and their wallet using expiring, domain-bound, single-use signed challenges. Apply reward limits and anti-abuse checks. Record a unique reward ID before queuing a payout. Serialize signer nonces, persist transaction hashes and reconcile confirmations before retrying uncertain submissions; retries must not pay twice.

The authorized service transfers existing test tokens from a funded reward wallet. It has no special contract role and cannot mint. Private keys must never be placed in frontend code or NEXT_PUBLIC variables. Use a server-side secret manager/signing service and maintain enough Sepolia test ETH for gas. Confirm destination, chain and reward amount server-side; never trust values sent directly by a client. Use ethers.parseUnits(amountString, decimals) and bigint arithmetic.

This describes a proposed architecture, not an implemented reward backend. The existing deployer allocation is a technical fact, not a predefined rewards allocation.

## Level 3 — In-game utility

Illustrative design examples only, not existing economics or exchange rates:

| Example branded QFC amount | Potential game behavior |
| --- | --- |
| 100 QFC | Special cosmetic access |
| 25 QFC | Tournament entry |
| 50 QFC | Bonus item |
| QFC reward | Achievement reward |

Validate the deployed symbol is QFC before integration. Choose whether access checks a balance or consumes a transfer; these are different designs. Balance checks alone do not reserve tokens, so recheck at use time. For payments, validate confirmed contract events on the server before granting the item and prevent duplicate grants. Explain spending and any burn before wallet approval.

The optional QraftPayment demo routes 95% to treasury and burns 5%. It does not implement inventory, event entry, refunds or reward validation. Do not silently use its burn behavior for an example that only needs a balance check.

API references: [ethers v6 providers](https://docs.ethers.org/v6/api/providers/) and [OpenZeppelin ERC-20](https://docs.openzeppelin.com/contracts/5.x/api/token/erc20).
