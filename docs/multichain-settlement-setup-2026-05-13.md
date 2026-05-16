# Multi-chain Settlement Setup — Delegated MindGames Arena

Status: MVP setup guide for MetaMask Smart Accounts Kit x 1Shot API Dev Cook Off. Updated after live testnet vault deployment on 2026-05-13.

## Primary testnet settlement chains

For live contract deployment and faucet-funded demos, use the Sepolia testnet chain IDs below. Note: the 2026-05-13 public `relayer_getCapabilities` check returned support for mainnet IDs (`8453`, `42161`, `10`) but returned `{}` for Sepolia testnet IDs (`84532`, `421614`, `11155420`). Therefore, current MVP keeps 1Shot in mock/trace mode on testnets until the hackathon relayer/testnet support is confirmed.

| Chain | Chain ID | Native gas | Vault env var | RPC env var | Deployed vault |
|---|---:|---|---|---|---|
| Base Sepolia | `84532` | ETH | `BASE_SEPOLIA_VAULT_ADDRESS` | `BASE_SEPOLIA_RPC_URL` | `0x5677F20bD56538F20051Fe8Bf002e6D06780d85c` |
| Arbitrum Sepolia | `421614` | ETH | `ARBITRUM_SEPOLIA_VAULT_ADDRESS` | `ARBITRUM_SEPOLIA_RPC_URL` | `0x5677F20bD56538F20051Fe8Bf002e6D06780d85c` |
| Optimism Sepolia | `11155420` | ETH | `OPTIMISM_SEPOLIA_VAULT_ADDRESS` | `OPTIMISM_SEPOLIA_RPC_URL` | `0x5677F20bD56538F20051Fe8Bf002e6D06780d85c` |

Mantle Sepolia remains a legacy/local optional path only. The checked public 1Shot capabilities response did not include Mantle `5000` or `5003`.

## Faucet links

Use a fresh deployment wallet and do not expose private keys.

### Base Sepolia

- Base docs faucet directory: https://docs.base.org/base-chain/tools/network-faucets
- Chainlink Base Sepolia faucet: https://faucets.chain.link/base-sepolia
- Alchemy Base Sepolia faucet: https://www.alchemy.com/faucets/base-sepolia

### Arbitrum Sepolia

- Alchemy Arbitrum Sepolia faucet: https://www.alchemy.com/faucets/arbitrum-sepolia
- QuickNode Arbitrum Sepolia faucet: https://faucet.quicknode.com/arbitrum/sepolia
- Chainlink Arbitrum Sepolia faucet: https://faucets.chain.link/arbitrum-sepolia
- L2 Faucet Arbitrum: https://www.l2faucet.com/arbitrum

### Optimism Sepolia

- Optimism docs faucet page: https://docs.optimism.io/app-developers/tools/faucets
- Alchemy OP Sepolia faucet: https://www.alchemy.com/faucets/optimism-sepolia
- QuickNode Optimism Sepolia faucet: https://faucet.quicknode.com/optimism/sepolia
- Chainlink OP Sepolia faucet: https://faucets.chain.link/optimism-sepolia
- L2 Faucet Optimism: https://www.l2faucet.com/optimism

## Required env vars

```bash
# never commit real private keys
DEPLOYER_PRIVATE_KEY=...

BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
ARBITRUM_SEPOLIA_RPC_URL=https://sepolia-rollup.arbitrum.io/rpc
OPTIMISM_SEPOLIA_RPC_URL=https://sepolia.optimism.io

# deployed testnet vaults, owner = Cornerstone
BASE_SEPOLIA_VAULT_ADDRESS=0x5677F20bD56538F20051Fe8Bf002e6D06780d85c
ARBITRUM_SEPOLIA_VAULT_ADDRESS=0x5677F20bD56538F20051Fe8Bf002e6D06780d85c
OPTIMISM_SEPOLIA_VAULT_ADDRESS=0x5677F20bD56538F20051Fe8Bf002e6D06780d85c

ONESHOT_RELAYER_MODE=mock # switch to live only after preflight is safe
ONESHOT_RELAYER_URL=https://relayer.1shotapi.com/relayers
```

## Deployment workflow

1. Compile contracts:

```bash
npm run contracts:compile
```

2. Dry-run settlement deployment plan:

```bash
npm run deploy:settlement:dry-run
```

This writes `deployments/settlement-vaults.json` and reports which chains still need vault deployment.

3. Fund deployer wallet on Base Sepolia / Arbitrum Sepolia / Optimism Sepolia using the faucet links above.

4. Deploy vaults live only after confirming the deployment wallet and chain list:

```bash
DEPLOY_SETTLEMENT_LIVE=1 \
SETTLEMENT_CHAINS=84532,421614,11155420 \
DEPLOYER_PRIVATE_KEY=... \
npm run deploy:settlement:live
```

5. Copy deployed vault addresses into `.env`:

```bash
BASE_SEPOLIA_VAULT_ADDRESS=0x...
ARBITRUM_SEPOLIA_VAULT_ADDRESS=0x...
OPTIMISM_SEPOLIA_VAULT_ADDRESS=0x...
```

6. Run the safe demo gate:

```bash
npm run check
npm run demo
npm run scan:legacy
```

7. Confirm replay manifest notes no longer contain `PerformanceBondVault address not configured` for the selected chains.

8. Only then consider:

```bash
ONESHOT_RELAYER_MODE=live npm run demo
```

## Safety gates before live 1Shot submission

Live mode should refuse to submit unless:

- all selected chains exist in `SETTLEMENT_CHAIN_CONFIG`;
- vault addresses are configured and non-zero;
- delegated permission scope includes all selected chains;
- 1Shot `relayer_getCapabilities` is reachable and includes the selected chain IDs;
- calldata was built for `GameSettlementVault.settle(...)`;
- no private key, token, or credential appears in docs, logs, screenshots, or repo output.

## Current MVP state

- Mock mode is safe and complete.
- Testnet settlement vaults are deployed on Base Sepolia, Arbitrum Sepolia, and OP Sepolia with Cornerstone as owner/authorized settler.
- Local `.env` and `.env.example` contain only public vault addresses, no private keys.
- 1Shot live mode remains intentionally blocked until public/testnet relayer capabilities include the selected Sepolia chain IDs.
- Primary judging narrative should focus on MetaMask bounded delegation + 1Shot gas-abstracted multi-chain settlement + A2A agent coordination.
