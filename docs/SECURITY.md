# Security

This contract has not undergone a formal third-party security audit and should currently be treated as an experimental testnet implementation.

Never commit PRIVATE_KEY, DEPLOYER_PRIVATE_KEY, SEED_PHRASE, MNEMONIC, API_KEY, ETHERSCAN_API_KEY, RPC_SECRET or wallet backup files. `.env.example` contains empty placeholders only. Public addresses are not secrets; RPC URLs can contain credentials.

Keep signing keys in a server-side secret manager or dedicated signing service. Never put keys in frontend code, NEXT_PUBLIC variables, logs, screenshots or CI. Local compile and tests need no wallet credentials. CI never deploys.

If a secret is exposed, stop using it and rotate/revoke it through the relevant provider. For wallet keys, migrate remaining assets using a trusted wallet and retire the compromised account. Deleting the file does not remove historical exposure; coordinate history cleanup after rotation. Report only filenames and secret categories in public reports, never values.

For vulnerability reports, contact the maintainer through the [GitHub profile](https://github.com/dulatserik074-code) to arrange a private channel. Do not post exploit details or secrets in public issues. TODO: maintainer should enable GitHub private vulnerability reporting or provide a dedicated security contact.

Check chain ID, contract address, bytecode and token metadata before integration. The supplied archive contains no deployment address or prior Git history; the claimed Sepolia deployment has not been independently verified. Tests establish local source behavior, not deployed bytecode equivalence.

Reward servers must validate achievements, authenticate wallet ownership with nonce-based signatures, prevent replay and duplicate payouts, rate-limit requests and reconcile confirmed transfers. Wallet login is separate from permission to spend tokens. Limit allowances to the intended amount. Transfers and burns require user consent; burns are irreversible. Existing payment code intentionally burns part of a payment.
