# Qraft Coin v0.2.0

Qraft Coin (QFT) is a testnet-only, fixed-supply ERC-20 MVP. It includes audited OpenZeppelin building blocks, a transparent 5% payment-burn demo, Hardhat tests and deployment scripts, and a mobile-first Next.js wallet for MetaMask.

> QFT is currently a test token. Market price is not guaranteed. Do not use real funds or deploy this MVP to mainnet without an independent professional audit.

## Architecture

```text
qraft-coin/
├── contracts/
│   ├── QraftCoin.sol       # Fixed-supply ERC20 + ERC20Burnable
│   └── QraftPayment.sol    # 95% treasury / 5% burn payment demo
├── scripts/deploy.ts       # Token and payment deployment
├── test/                   # Hardhat unit tests
├── frontend/               # Next.js 15 wallet and tokenomics UI
├── hardhat.config.ts
└── .env.example
```

`QraftCoin` mints exactly 1,000,000 QFT (18 decimals) to the deployer in its constructor. It has no public or privileged mint function, owner role, blacklist, fees, transfer restrictions, balance adjustment, confiscation, proxy, or upgrade mechanism.

`QraftPayment` accepts an approved QFT service payment. It transfers 95% directly from the payer to an immutable, explicitly configured treasury and calls the token's standard `burnFrom` for 5%. The burn rate is the public constant `BURN_RATE_BPS = 500` (500 / 10,000 = 5%). Ordinary QFT transfers have no payment burn or transaction tax.

There are two distinct burn mechanisms:

- Voluntary burn: holders call `QraftCoin.burn` to destroy their own QFT.
- Payment burn: after approving `QraftPayment`, a service payment routes 95% to treasury and permanently burns 5%.

```text
User pays 100 QFT
→ 95 QFT treasury
→ 5 QFT permanently burned
```

## Requirements

- Node.js 22 (>=22 <23; runtime requirement updated for QazLoyal)
- npm
- MetaMask (for the frontend)
- Test ETH on Sepolia only when deploying to Sepolia

## Installation

```bash
npm install
cd frontend
npm install
```

## Compile

From the repository root:

```bash
npx hardhat compile
```

## Tests

```bash
npx hardhat test
```

Tests cover metadata, fixed supply, deployer allocation, transfers, allowances, `transferFrom`, `burn`, `burnFrom`, absence of mint, fixed payment burn rate, 95/5 routing, and input validation.

## Local deployment

Terminal 1:

```bash
npx hardhat node
```

Terminal 2:

```bash
$env:TREASURY_ADDRESS="0x_VALID_LOCAL_TREASURY_ADDRESS" # PowerShell
npm run deploy:local
```

On macOS/Linux use `export TREASURY_ADDRESS=0x_VALID_LOCAL_TREASURY_ADDRESS`. The script prints the network, chain ID, deployer, treasury, QraftCoin address, QraftPayment address, and total supply. Add the local Hardhat network to MetaMask (`http://127.0.0.1:8545`, chain ID `31337`) and use only a development account shown by Hardhat.

## Sepolia deployment

1. Run `npm install`.
2. Copy `.env.example` to `.env`.
3. Set `SEPOLIA_RPC_URL` to a trusted Sepolia RPC endpoint.
4. Set `PRIVATE_KEY` to a dedicated testnet wallet private key. Never use a wallet that holds real assets and never commit `.env`.
5. Set `TREASURY_ADDRESS` to a valid non-zero Sepolia address.
6. Fund the deployment wallet with Sepolia faucet ETH.
7. Compile and test: `npm run compile && npm test`.
8. Deploy:

```bash
npm run deploy:sepolia
```

No mainnet network is configured. Review the printed network before confirming any action.
The deployment command detects `--network sepolia` directly from the Hardhat CLI arguments and fails before any network connection if the Sepolia RPC URL or private key is missing. The deploy script separately rejects a missing, invalid, or zero treasury address.

## Frontend setup

After deployment, copy `frontend/.env.local.example` to `frontend/.env.local` and set:

```dotenv
NEXT_PUBLIC_QFT_ADDRESS=0x_DEPLOYED_QRAFTCOIN_ADDRESS
NEXT_PUBLIC_QRAFT_PAYMENT_ADDRESS=0x_DEPLOYED_QRAFTPAYMENT_ADDRESS
NEXT_PUBLIC_REQUIRED_CHAIN_ID=11155111
NEXT_PUBLIC_NETWORK_NAME=Sepolia
NEXT_PUBLIC_BLOCK_EXPLORER_URL=https://sepolia.etherscan.io
```

Run the wallet:

```bash
cd frontend
npm run dev
```

Open `http://localhost:3000`. The app connects to the injected MetaMask provider, blocks writes on the wrong network, can request a switch to Sepolia, and supports `transfer`, voluntary `burn`, and the approve-then-pay QraftPayment flow. Payment previews use 18-decimal integer arithmetic and show the treasury and burn amounts before confirmation. Balance, supply, allowance, transaction state, errors, success, and network-aware explorer links are refreshed in the UI.

Production checks:

```bash
npm run lint
npm run build
npm start
```

## Add QFT to MetaMask

1. Switch MetaMask to Sepolia (or the configured local Hardhat network).
2. Select **Import tokens**.
3. Paste the deployed QraftCoin address printed by the deploy script.
4. Confirm symbol `QFT` and decimals `18`.
5. Verify the address against your deployment output before importing.

## Security notes

- OpenZeppelin ERC-20, ERC20Burnable, SafeERC20, and ReentrancyGuard are used instead of custom token primitives.
- Supply is fixed in the constructor; there is no callable mint path after deployment.
- Token and treasury addresses are validated against the zero address and are immutable.
- Payment calculations use basis points and Solidity 0.8 checked arithmetic. The treasury receives `amount - burnAmount`, so rounding cannot create tokens.
- Integer division rounds the 5% burn down to the nearest token wei. For payments below 20 wei, the burn is zero and the full amount goes to treasury; this is documented and tested. No value is lost or trapped.
- `nonReentrant` guards the payment flow; state does not depend on callbacks.
- Payments require an explicit user allowance. Approve only the intended amount and contract. Be aware of the standard ERC-20 allowance-change race; set an allowance to zero before replacing a non-zero allowance when interacting manually.
- The token has no admin access control because it has no post-deploy administrative functions.
- No hidden fee, honeypot, blacklist, sale restriction, confiscation, forced balance change, or upgradeability exists.
- Unit tests are useful but are not a substitute for an independent audit.
- This is a testnet MVP and has not received an independent smart-contract audit. Do not deploy to mainnet or use significant value before one.
- A production treasury should preferably be a multisig such as Safe rather than a single externally owned account. No Safe dependency is required by these contracts.

## Tokenomics

- Name: Qraft Coin
- Symbol: QFT
- Decimals: 18
- Initial and maximum supply: 1,000,000 QFT
- Additional minting: disabled
- Voluntary `burn` and allowance-based `burnFrom`: enabled
- Payment demo: 95% treasury / 5% burn

Potential future utility includes AI services, subscriptions, digital products, rewards, and payments. Burn reduces token supply but **DOES NOT guarantee token price appreciation**, demand, or liquidity.

## License

MIT
