# QraftCoin (QFC)

Experimental ERC-20 utility token for game rewards, digital services and Web3 integration research.

![Solidity 0.8.28](https://img.shields.io/badge/Solidity-0.8.28-363636) ![Ethereum Sepolia](https://img.shields.io/badge/Network-Ethereum%20Sepolia-blue) ![ERC-20](https://img.shields.io/badge/Standard-ERC--20-blue) ![MIT](https://img.shields.io/badge/License-MIT-green)

> **Metadata notice:** QFC is the requested project branding. The supplied Solidity contract actually returns **Qraft Coin** / **QFT**. This repository preserves that contract. Wallets and integrations must use the actual metadata; QFC is not asserted to be its on-chain symbol.

## Overview

QraftCoin is an experimental ERC-20 utility token prototype designed to explore game rewards, digital services and Web3 integrations within the developing Qraft ecosystem. The maintainer reports an Ethereum Sepolia deployment, but the supplied archive includes no contract address or deployment receipt. Confirming that deployment remains TODO.

The current version is intended for development and integration testing. Potential experiments include in-game rewards, achievements, special events, loyalty rewards, access to selected digital features, experimental player-to-player transfers and Qraft application integrations. These are proposed use cases, not claims of completed integrations.

QFC is a testnet project and has no guaranteed market value. It is not presented as an investment product. No price, exchange listing, return or confirmed corporate partnership is claimed.

## Network

| Field | Value |
| --- | --- |
| Network | Ethereum Sepolia (chain ID 11155111) |
| Project | QraftCoin (QFC branding) |
| Contract token name | Qraft Coin |
| Contract symbol | QFT |
| Standard | ERC-20 |
| Decimals | 18 |
| Initial total supply | 1,000,000 QFT (1000000000000000000000000 base units) |
| Current deployed total supply | TODO: query verified deployment; burns reduce supply |
| Contract address | TODO |
| Block explorer link | TODO: requires the actual contract address |

Sepolia Contract Address: TODO

Do not deploy a replacement just to fill this field. Obtain the existing address and transaction receipt from the maintainer, confirm Sepolia and bytecode, then read name(), symbol(), decimals() and totalSupply().

## Smart Contract

[QraftCoin.sol](contracts/QraftCoin.sol) uses Solidity pragma ^0.8.28; Hardhat compiles with 0.8.28 and optimizer enabled for 200 runs. OpenZeppelin Contracts is declared as ^5.4.0 and locked to **5.6.1**. ERC20 and ERC20Burnable provide the token implementation and 18-decimal default.

The constructor creates the entire 1,000,000-token supply for the deployer. There is no additional public mint, owner/admin role or upgrade mechanism. The deployer has ordinary holder rights. Holders can burn their tokens; burnFrom requires allowance. The initial supply is fixed, but current supply can decrease.

The existing [QraftPayment.sol](contracts/QraftPayment.sol) is an optional payment demo: 95% goes to its immutable treasury and 5% is burned, with integer rounding down. Ordinary transfers have no payment fee or burn. See [technical tokenomics](docs/TOKENOMICS.md).

This contract has not undergone a formal third-party security audit and should currently be treated as an experimental testnet implementation.

## Developer Quick Start

Use Node.js 22 and npm. Clone the repository and open its root directory:

~~~bash
git clone https://github.com/dulatserik074-code/qraftcoin.git
cd qraftcoin
~~~

~~~bash
npm ci
npm run compile
npm test
~~~

Local compile/tests use an ephemeral Hardhat chain and require no private key, RPC credential or Sepolia funds.

To read a player balance, copy .env.example to .env, set QFC_CONTRACT_ADDRESS to the verified address, optionally set SEPOLIA_RPC_URL, then run:

~~~bash
node examples/ethers/qfc-example.js YOUR_PLAYER_WALLET_ADDRESS
~~~

The [read-only example](examples/ethers/qfc-example.js) checks Sepolia and contract code, reads decimals and symbol from the chain and returns a formatted balance. No signing key is needed.

### Deployment and verification tooling

The existing deploy script creates **both a new token and a new payment contract**. It does not attach to an existing token. Running it requires a separate decision to deploy; no public-network deployment was performed during repository preparation.

For a deliberately authorized new Sepolia test deployment, configure SEPOLIA_RPC_URL, DEPLOYER_PRIVATE_KEY and TREASURY_ADDRESS in .env, then use:

~~~bash
npm run deploy:sepolia
~~~

For an existing token, source verification submits source code to Etherscan and needs no wallet key. Configure SEPOLIA_RPC_URL, ETHERSCAN_API_KEY and QFC_CONTRACT_ADDRESS, then use:

~~~bash
npm run verify:sepolia
~~~

Verification requires that deployed bytecode matches this compiler, optimizer and source. This command verifies QraftCoin only (no constructor arguments); verification of QraftPayment additionally requires its original token and treasury constructor arguments. See [security notes](docs/SECURITY.md).

### Existing wallet frontend

The supplied Next.js frontend is retained. Inside frontend/, run npm ci, copy .env.local.example to .env.local and set the verified token/payment addresses. The existing NEXT_PUBLIC_QFT_ADDRESS name intentionally matches source metadata. Run npm run dev and open localhost:3000. Validation commands are npm test, npm run lint and npm run build.

It supports wallet connection, transfers, voluntary burns and the approved payment demo. These can change token balances when used against a deployed contract; a balance-only game does not need them.

## Game Integration

Start with [the integration guide](docs/GAME_INTEGRATION.md) and [game developer starter](examples/game-integration/README.md):

1. Read balances through a compatible wallet and the ERC-20 contract.
2. Validate rewards on a game server and transfer existing test tokens from an authorized reward wallet.
3. Explore optional in-game utility, clearly separated from real implemented game economics.

Never put a reward wallet private key in frontend code. No token purchase or financial commitment is required for experimental integrations.

## Add QFC to MetaMask

1. Switch to Ethereum Sepolia (enable test networks if needed).
2. Open Import Tokens.
3. Enter the verified QraftCoin contract address: **TODO**.
4. Check the actual symbol: **QFT**, decimals **18** for the supplied source. QFC is project branding.
5. Confirm import only after checking the address and metadata.

## Looking for Integration Partners

QraftCoin is currently looking for indie game developers, Web3 builders and experimental projects interested in testing QFC integrations on Ethereum Sepolia.

Possible experiments include game rewards, achievements, tournament rewards, loyalty mechanics, wallet-based access, special events and cross-project experiments.

At this stage, QraftCoin is a testnet prototype. No token purchase or financial commitment is required for experimental integrations.

Contact: [dulatserik074-code on GitHub](https://github.com/dulatserik074-code).

## Qraft Ecosystem

Qraft is being developed as a broader ecosystem for software, applications, games and digital services. QraftCoin is being explored as a potential utility layer within that ecosystem. Future integrations are experimental and subject to technical, economic and legal evaluation.

## Documentation and contributions

- [Technical tokenomics](docs/TOKENOMICS.md)
- [Game integration](docs/GAME_INTEGRATION.md)
- [Security](docs/SECURITY.md)
- [Experimental roadmap](docs/ROADMAP.md)
- [Contributing](CONTRIBUTING.md)

## License

[MIT](LICENSE), preserved from the original project.
