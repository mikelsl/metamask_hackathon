# Delegated MindGames Arena

A generalized multi-agent arena for MetaMask Smart Accounts Kit x 1Shot API Dev Cook Off.

Delegated MindGames Arena turns turn-based social reasoning games into a reusable delegated-agent protocol: humans grant bounded MetaMask Smart Account permissions, AI agents coordinate through ERC-7710 delegations/redelegations, game-critical actions are hash-anchored, and 1Shot-style adapters prepare gas-abstracted multi-chain performance-bond settlement. The same permission envelope is designed to extend into x402 paid rooms and pay-per-agent-action services.

The first playable module is an 8-player social deduction arena. The product is not limited to Werewolf: the same permission, transcript, agent-memory, reputation, and settlement layer can support DAO juries, debate tournaments, prediction-market councils, trading committees, and other turn-based multi-agent workflows.

## Hackathon Fit

Target hackathon: **MetaMask Smart Accounts Kit x 1Shot API Dev Cook Off**

Priority tracks:

- **Best Agent** — AI agents reason, speak, vote, coordinate, and settle a live arena.
- **Best A2A coordination** — wolf-council / judge-agent / settlement-agent handoff demonstrates agent-to-agent coordination and redelegation.
- **Best x402 + ERC-7710** — planned extension path for pay-per-agent-action or premium rooms using bounded ERC-7710 payment permissions. Current MVP is x402-ready, not live x402-charging.

## MVP Components

- 8-player social deduction module:
  - 2 wolves
  - 1 seer
  - 5 villagers
- Wolf-council coordination flow for private A2A collusion.
- Public/private transcript separation with hash-anchored critical actions.
- MetaMask Smart Account / delegated permission UX.
- Chain-agnostic performance-bond vaults.
- 1Shot relayer adapter for capabilities, fee quote locking, task submission, and task status tracking.
- x402 extension design for paid rooms, tournament entry, dispute review, and pay-per-agent-action endpoints.
- Replay dashboard with delegation graph, transcript timeline, and settlement statuses.

## x402 Extension Scope

x402 is planned as the payment-gating layer for monetized agent services:

- premium rooms and tournament entry;
- pay-per-agent-action for high-value analysis or dispute review;
- third-party service-agent capabilities exposed to the arena;
- bounded ERC-7710-style payment envelopes so users approve a maximum session budget rather than unlimited wallet access;
- convergence with 1Shot-style relaying for a non-gas-token UX where users pay with approved payment tokens while infrastructure handles chain-specific gas.

This repository currently implements the delegated-agent game, settlement adapters, and extension points. It does not claim live x402 payment collection in the Telegram MVP.

## Development Plan

See:

```text
../docs/development-plan-2026-05-13.md
../RUNSTATE.md
```

## Quick Start

```bash
npm install
npm run check
npm run demo
npm run web:serve
```

For LLM-backed local runs, configure `.env` from `.env.example`, verify connectivity, then run:

```bash
npm run test:openrouter-glm
npm run demo:openrouter-glm
```

## Contracts

Current inherited contracts will be generalized during the MetaMask fork:

- `AgentRegistry`
- `AgentActionRegistry`
- `GameSettlementVault` → planned public surface: `PerformanceBondVault`

## Security / Publishing

Before any GitHub push, release, zip, gist, or public upload:

```bash
npm run scan:legacy
```

Also manually confirm no `.env`, private keys, bot tokens, API keys, bearer tokens, cookies, local credential paths, raw logs, or screenshots with secrets are included.
