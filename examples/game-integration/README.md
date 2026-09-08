# Game integration starter

Start with [the three integration levels](../../docs/GAME_INTEGRATION.md). No token purchase or financial commitment is required for experimental integrations.

1. Obtain the verified Sepolia token address from the maintainer; the archive has none.
2. From the repository root, run `npm ci`.
3. Copy `.env.example` to `.env` and set `QFC_CONTRACT_ADDRESS` and optionally `SEPOLIA_RPC_URL`. Leave signing keys empty for balance reads.
4. Run `node examples/ethers/qfc-example.js YOUR_PLAYER_WALLET_ADDRESS`.

Expected output is an object containing a formatted balance and the actual on-chain symbol. The supplied source returns QFT, even though the project is branded QFC. Never convert the balance through JavaScript Number for transaction arithmetic.

To test rewards, first build a local server validation and payout ledger. Use a funded test-token wallet for transfers; there is no reward mint function. The existing frontend can send tokens, burn tokens and interact with the payment demo. These are wallet actions, not a completed game reward service.
