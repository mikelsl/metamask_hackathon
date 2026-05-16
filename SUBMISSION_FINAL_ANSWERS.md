# MetaMask Smart Accounts Kit x 1Shot API — Final Submission Answers

## Project Name

Delegated MindGames Arena

## One-line Pitch

A MetaMask-powered delegated AI arena where humans grant bounded smart-account permissions, AI agents coordinate privately, and performance-bond settlement is prepared through a 1Shot-style cross-chain flow.

## Problem

Most agent demos show a single assistant chatting or calling tools. They do not test the harder social behaviors that matter when autonomous agents act for users: bounded authority, hidden information, deception resistance, coalition-building, verifiable action trails, and settlement across chains.

## Solution

Delegated MindGames Arena turns social deduction gameplay into a reusable benchmark and interaction layer for delegated AI agents. In the current MVP, one human and seven AI agents play an 8-player Werewolf-style match through Telegram. MetaMask-style delegated permissions define what agents are allowed to do for a bounded game session. The system separates public replay from private audit data, records deterministic artifact roots, and demonstrates performance-bond settlement across multiple testnet chains.

The game is the first module, not the whole product. The same architecture can support DAO juries, agent tournaments, prediction-market councils, trading committees, dispute resolution rooms, and other multi-agent workflows where bounded delegation and verifiable social reasoning matter.

## Why MetaMask Smart Accounts Kit / ERC-7710

- **Bounded permissions:** users should not hand agents unlimited wallet control; each game session has scoped permissions for deposits, claims, refunds, and allowed game actions.
- **Delegated AI actions:** agents can act within a constrained capability envelope rather than asking the user to sign every low-level action.
- **Human-first UX:** Telegram gameplay plus MetaMask deposit/claim pages give judges a familiar interaction surface.
- **ERC-7710 direction:** the permission model maps naturally to delegated capability records and redelegation between human, agent, and settlement roles.

## Why 1Shot API

- **Cross-chain settlement narrative:** `/wagerdemo` intentionally splits the human bond and AI-agent bonds across testnets to demonstrate a multi-chain settlement coordination path.
- **Gas abstraction path:** 1Shot is the intended relayer layer for status-tracked, gas-abstracted settlement calls.
- **Non-gas-token gas path:** the target user experience is that agents/users can pay settlement execution costs with an approved payment token rather than holding each destination chain's native gas token.
- **Current caveat:** public capability checks returned support for selected mainnet IDs but not Sepolia testnet IDs, so the MVP keeps 1Shot in mock/trace mode for testnet execution until hackathon relayer/testnet support is confirmed.

## Why x402 + ERC-7710

x402 is the planned payment-gating layer for paid agent rooms, premium actions, and pay-per-agent-action services. The important link to ERC-7710 is bounded authority: a user can pre-authorize a game/session budget, and agents or service endpoints can charge only inside that explicit payment envelope.

Planned x402 flows:

- **Paid rooms:** joining a premium arena returns an x402 payment requirement; the user's smart account authorizes a bounded payment before the room unlocks.
- **Pay-per-agent-action:** high-value actions such as advanced analysis, dispute review, or tournament entry can be metered as individual x402 payments.
- **Service-agent monetization:** third-party agents can expose paid capabilities to the arena while still respecting user-granted ERC-7710 limits.
- **Non-gas-token settlement:** x402 payments and 1Shot-style relaying can converge on the same UX goal: users pay with an approved payment token, while infrastructure handles destination-chain gas.

Current scope note: x402 is not yet the live payment path in the MVP Telegram flow. It should be submitted as a clear extension track built on the same delegated-permission and payment-envelope architecture, not as a completed production integration.

## What Works Today

- Telegram demo bot: `@metamask_mindgame_bot`
- 8-player social deduction game: 1 human + 7 AI agents
- Role distribution: 2 wolves + 1 seer + 5 villagers
- Private wolf-council coordination hidden from public chat / public transcript
- Public replay transcript separated from private audit transcript
- Agent memory artifacts with current-game and cross-game layers
- Demo-sponsored cross-chain wager flow:
  - human bond on Arbitrum Sepolia
  - AI-agent bonds on Mantle Sepolia
- Self-wallet mode with MetaMask deposit / claim pages
- Public hosted deposit and claim pages
- Multi-chain vault deployments on Base Sepolia, Arbitrum Sepolia, and OP Sepolia
- x402 extension design for paid rooms and pay-per-agent-action flows using bounded ERC-7710 payment permissions
- Mantle Sepolia legacy vault for agent-bond testing
- Automated demo-wallet claim attempts and manual claim pages for self-wallet winners

## Demo Flow

1. Open Telegram bot `@metamask_mindgame_bot`
2. Send `/newgame`
3. Select `/wagerdemo` for fast sponsored cross-chain flow
4. Send `/join`
5. Send `/startgame`
6. Bot posts performance bonds:
   - human seat on Arbitrum Sepolia
   - AI-agent seats on Mantle Sepolia
7. Private role messages are sent
8. AI agents speak, vote, perform night actions, and coordinate privately when they are wolves
9. Public chat shows only public-safe events; private audit keeps hidden-role evidence
10. Final result is posted with artifact roots and settlement/claim status
11. Optional: use `/wagerself` + `/wallet 0x...` to test MetaMask deposit/claim pages directly

## Differentiators

- **Delegation-first agent UX:** bounded wallet permissions instead of unlimited agent authority
- **A2A coordination:** wolf-council behavior shows private agent-to-agent coordination under hidden information
- **Public/private transcript split:** public replay is safe for viewers; private audit proves hidden decisions existed without leaking them during play
- **Cross-chain settlement path:** performance bonds are intentionally split across chains for a 1Shot-style settlement trace
- **x402-ready monetization layer:** paid rooms and pay-per-agent-action flows can reuse the same bounded permission model instead of asking for open-ended wallet access
- **Consumer-friendly demo:** Telegram-first gameplay with MetaMask web pages instead of dev-only CLI flows
- **Reusable protocol:** Werewolf is the first module; the substrate can support broader delegated multi-agent workflows

## Live Links

- **Telegram bot:** https://t.me/metamask_mindgame_bot
- **Deposit page:** https://openclaw.yuzu-swap.com/dashboard/metamask/deposit.html
- **Claim page:** https://openclaw.yuzu-swap.com/dashboard/metamask/claim.html
- **Dashboard / replay root:** https://openclaw.yuzu-swap.com/dashboard/metamask/index.html
- **GitHub repository:** https://github.com/mikelsl/metamask_hackathon
- **Demo video:** https://github.com/mikelsl/metamask_hackathon/raw/main/submission-assets/presentation-video-2026-05-14-v2/Delegated-MindGames-Arena-Presentation-v2-2026-05-14.mp4
- **X / social post:** Optional after final publication

## Proof Points

### Contracts / Vaults

- **Base Sepolia GameSettlementVault:** `0x5677F20bD56538F20051Fe8Bf002e6D06780d85c`
- **Arbitrum Sepolia GameSettlementVault:** `0x5677F20bD56538F20051Fe8Bf002e6D06780d85c`
- **OP Sepolia GameSettlementVault:** `0x5677F20bD56538F20051Fe8Bf002e6D06780d85c`
- **Mantle Sepolia legacy GameSettlementVault:** `0xFbadd57084612223aA4D24eA61d7EBe7d470A35E`

### Latest Verified Telegram Artifact

- **Game ID:** `tg-1778743433354`
- **Winner:** `wolves`
- **Event count:** `44`
- **Public transcript root:** `0x59ae0d851b722c893c7b4604a4a26acbb7e39f4d325422c7673d3c8f582014d3`
- **Private audit transcript root:** `0x6e7f166909d3ecd07b25df9a31431e905bad18c6d83c2ed8a35d68a10dbb1e66`
- **Summary root:** `0xc2e34df3762cc18856a2d6db493f7c105ec5ee2949265338d646e6e9a137e6a6`
- **Agent memory manifest root:** `0x118f59acea2e20b1821db194a3d1c53bb2d4af766b657438fe128a87aa04970b`

### Settlement Evidence

- Latest settlement trace: `mock-delegated-tx-tg-1778743433354` (trace-mode settlement record from the latest verified Telegram demo).
- Self-wallet MetaMask deposit/claim tx links: optional; not required for the current repo package.

## Technical Highlights

- TypeScript Telegram bot with Telegraf
- Modular game engine and compute adapter
- `GameSettlementVault.sol` with authorized settler pattern
- Public/private artifact generation and root hashing
- MetaMask permission adapter interface for bounded game-session permissions
- 1Shot relayer adapter interface for capabilities, quote, submission, and status tracking
- x402 extension path for payment-gated rooms, pay-per-agent-action endpoints, and service-agent monetization
- Public deposit/claim pages that can switch/add target chains in MetaMask
- Multi-chain settlement config for Base Sepolia, Arbitrum Sepolia, OP Sepolia, plus Mantle Sepolia legacy flow

## Scope Note

The MVP uses live testnet transactions where available, but 1Shot live Sepolia relayer support remains unconfirmed. The submission should frame the current version as a working delegated-agent arena with a 1Shot-ready settlement adapter and trace-mode cross-chain demonstration, not as a production mainnet bridge.

## Publication Safety

Before any public repo update, zip, external upload, or hackathon form submission:

- remove `.env`, `.runtime/`, raw logs, private keys, API keys, bot tokens, bearer tokens, cookies, credential paths, and unredacted local screenshots;
- confirm whether wallet addresses, contract addresses, explorer links, public bot links, and tx hashes are approved for publication;
- run automated scans plus manual review;
- do not publish until Mike explicitly confirms the review summary.
