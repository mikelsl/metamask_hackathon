# 1Shot Public Relayer Capabilities Check — 2026-05-13

## Endpoint

```text
POST https://relayer.1shotapi.com/relayers
method: relayer_getCapabilities
```

## Check A — common EVM mainnet IDs + Mantle candidates

Requested:

- Ethereum `1`
- Optimism `10`
- Polygon `137`
- Base `8453`
- Arbitrum `42161`
- Celo `42220`
- Mantle mainnet `5000`
- Mantle Sepolia `5003`

Returned capabilities for:

- `1` Ethereum
- `10` Optimism
- `137` Polygon
- `8453` Base
- `42161` Arbitrum
- `42220` Celo

Did **not** include:

- `5000` Mantle mainnet
- `5003` Mantle Sepolia

## Check B — Sepolia testnet IDs

Requested:

- Base Sepolia `84532`
- Arbitrum Sepolia `421614`
- Optimism Sepolia `11155420`
- Mantle Sepolia `5003`

Returned:

```json
{}
```

## Decision

- Treat Mantle as **not currently supported** by the checked public 1Shot relayer capability response.
- For faucet-funded contract deployment and local/live-like demos, use Sepolia testnets:
  - Base Sepolia `84532`
  - Arbitrum Sepolia `421614`
  - Optimism Sepolia `11155420`
- Keep 1Shot in mock/trace mode for those Sepolia chains until hackathon docs or a separate relayer endpoint confirms testnet support.
- If the final judging environment expects mainnet IDs, adapt the settlement config separately and never submit live transactions without explicit preflight + Mike confirmation.
