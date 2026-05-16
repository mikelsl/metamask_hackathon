# Delegated MindGames Arena — Presentation Outline

## Slide 1 — Title

Delegated MindGames Arena  
Bounded MetaMask permissions for multi-agent games, cross-chain settlement, and x402-ready paid agent rooms.

## Slide 2 — Problem

AI agents need bounded authority and bounded spending, not unlimited wallet access. Current demos rarely test multi-agent social reasoning, hidden information, verifiable delegated actions, or payment-gated agent services.

## Slide 3 — Solution

A Telegram-playable delegated-agent arena where humans grant scoped permissions, AI agents compete/coordinate, transcripts are split into public/private audit layers, performance bonds settle across chains, and x402 can unlock paid rooms or per-action services within ERC-7710 spend limits.

## Slide 4 — Demo Module

8-player Werewolf-style social deduction:
- 1 human
- 7 AI agents
- 2 wolves
- 1 seer
- 5 villagers

## Slide 5 — MetaMask Fit

- Smart-account session permissions
- ERC-7710-style delegated capabilities
- user-paid self-wallet deposit/claim flow
- bounded agent authority for game actions and settlement

## Slide 6 — 1Shot Fit

- cross-chain performance-bond settlement intent
- relayer capabilities / fee quote / task status adapter
- non-gas-token gas path: users pay with approved payment tokens while relayer infrastructure handles destination-chain execution
- testnet trace mode until public Sepolia support is available

## Slide 7 — A2A Coordination + Memory

Wolf-council private coordination demonstrates agent-to-agent strategy under hidden information. Agents use previous statements, votes, accusations, and cross-game reputation/personality memory to decide what to say or do. Public chat remains safe; private audit proves what happened.

## Slide 8 — x402 + ERC-7710 Extension

- paid rooms: x402 unlocks premium arenas
- pay-per-agent-action: high-value analysis / dispute review / tournament entry
- bounded ERC-7710 payment envelope: pre-approved session budget, not unlimited wallet access
- shared UX with 1Shot: payment token covers service/settlement while infra handles chain-specific gas

## Slide 9 — Technical Architecture

Telegram Bot → Game Engine → Agent Compute Adapter → Agent Memory Graph → Artifact Roots → Delegated Permission Adapter → Settlement Vaults → 1Shot Relayer Adapter → optional x402 Payment Gate.

## Slide 10 — Proof Points

- `@metamask_mindgame_bot`
- public deposit / claim pages
- vault deployments on Base Sepolia / Arbitrum Sepolia / OP Sepolia
- Mantle Sepolia legacy vault for agent bonds
- latest game roots / final tx links after clean E2E run

## Slide 11 — Roadmap

- live 1Shot relayer execution on supported chains
- MetaMask Smart Accounts Kit live permission request UI
- live x402 paid rooms / pay-per-agent-action
- more game modules: Avalon, debate court, DAO jury, prediction council
- agent reputation and tournament ladder

## Slide 12 — Links / Contact

- Telegram bot
- dashboard / deposit / claim pages
- GitHub / video links after upload
- contact: `m@yuzu-swap.com`
