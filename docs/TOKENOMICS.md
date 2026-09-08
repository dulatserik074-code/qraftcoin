# Technical token parameters

QraftCoin (QFC) is the requested project branding. The supplied contract identifies itself as **Qraft Coin (QFT)**. Its metadata has not been changed.

| Property | Source-confirmed value |
| --- | --- |
| Name | Qraft Coin |
| Symbol | QFT |
| Decimals | 18 (inherited OpenZeppelin default) |
| Standard | ERC-20 |
| Intended network | Ethereum Sepolia, chain ID 11155111 |
| Initial supply | 1,000,000 QFT |
| Initial base units | 1000000000000000000000000 |
| Initial allocation | Entire supply to deployer in constructor |
| Additional minting | No external/public mint path |
| Burning | Holder burn; allowance-authorized burnFrom |
| Ownership | No owner, admin or privileged deployer role |
| Contract address | TODO |
| Current on-chain supply | Unknown; burns can reduce initial supply |

`MAX_SUPPLY` is the initial issuance constant, not a guarantee that current `totalSupply()` remains unchanged. Deployer has ordinary holder rights over its tokens; it cannot create additional tokens, confiscate balances or upgrade the contract.

The separate existing `QraftPayment` demo transfers 95% of a payment to its immutable treasury and burns 5%, rounded down in base units. Below 20 base units the burn is zero. This applies only to its approved `pay` flow; ordinary token transfers do not burn tokens or charge this fee.

There is no asserted price, market capitalization, liquidity, exchange listing, investor allocation, yield or investment return. Testnet QFC branding/QFT tokens have no guaranteed market value.
