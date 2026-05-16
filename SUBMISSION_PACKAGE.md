# Delegated MindGames Arena — Current Submission Package

**Hackathon:** MetaMask Smart Accounts Kit x 1Shot API Dev Cook Off  
**Project:** Delegated MindGames Arena  
**Status:** Ready for GitHub/HackQuest staging after final public-identifier approval. No external upload has been performed.

## 1. Core Positioning

Delegated MindGames Arena is a Telegram-playable multi-agent arena where humans grant bounded MetaMask Smart Account permissions, AI agents reason and coordinate under hidden information, and performance-bond settlement is prepared through a 1Shot-style cross-chain flow.

The first module is Werewolf-style social deduction. The larger product is a reusable delegated-agent coordination substrate for DAO juries, agent tournaments, prediction councils, debate courts, dispute rooms, and paid service-agent workflows.

## 2. Track Fit

### Best Agent

- 7 AI seats reason, speak, vote, perform night actions, and adapt to previous turns.
- Agents use current-game memory and cross-game reputation/personality memory.
- The game produces public transcript roots, private audit roots, and memory manifest roots.

### Best A2A Coordination

- Wolf agents coordinate privately through wolf-council messages.
- Public chat stays safe; private audit proves hidden A2A coordination happened.
- The architecture supports future judge-agent, settlement-agent, and service-agent handoffs.

### Best x402 + ERC-7710

Current MVP does **not** claim live x402 charging in Telegram. The submission should frame x402 as the planned extension track built on the same delegated-permission envelope.

Planned x402 flows:

- paid rooms: x402 unlocks premium arenas after a bounded smart-account payment approval;
- pay-per-agent-action: high-value analysis, dispute review, tournament entry, or special agent capabilities are metered per request;
- service-agent monetization: third-party agents expose payment-gated capabilities to the arena;
- bounded ERC-7710 payment envelope: user pre-approves max spend/session budget instead of granting unlimited wallet control;
- non-gas-token UX: x402 payments plus 1Shot-style relaying converge on paying with an approved payment token while infrastructure handles destination-chain gas.

### 1Shot API

- `/wagerdemo` splits human and AI-agent bonds across chains to create a multi-chain settlement trace.
- 1Shot adapter covers capabilities, quote, submission, and task-status concepts.
- Current caveat: Sepolia 1Shot live support was not confirmed, so the MVP uses trace/mock mode for 1Shot while keeping the integration surface explicit.

## 3. Working Demo Links

- Telegram bot: `https://t.me/metamask_mindgame_bot`
- Dashboard: `https://openclaw.yuzu-swap.com/dashboard/metamask/index.html`
- Deposit page: `https://openclaw.yuzu-swap.com/dashboard/metamask/deposit.html`
- Claim page: `https://openclaw.yuzu-swap.com/dashboard/metamask/claim.html`
- GitHub: https://github.com/mikelsl/metamask_hackathon
- Demo video: https://github.com/mikelsl/metamask_hackathon/raw/main/submission-assets/presentation-video-2026-05-14-v2/Delegated-MindGames-Arena-Presentation-v2-2026-05-14.mp4

## 4. Key Proof Points

### Contracts / Vaults

- Base Sepolia GameSettlementVault: `0x5677F20bD56538F20051Fe8Bf002e6D06780d85c`
- Arbitrum Sepolia GameSettlementVault: `0x5677F20bD56538F20051Fe8Bf002e6D06780d85c`
- OP Sepolia GameSettlementVault: `0x5677F20bD56538F20051Fe8Bf002e6D06780d85c`
- Mantle Sepolia legacy GameSettlementVault: `0xFbadd57084612223aA4D24eA61d7EBe7d470A35E`

### Latest Verified Telegram Artifact

- Game ID: `tg-1778743433354`
- Winner: `wolves`
- Event count: `44`
- Public transcript root: `0x59ae0d851b722c893c7b4604a4a26acbb7e39f4d325422c7673d3c8f582014d3`
- Private audit transcript root: `0x6e7f166909d3ecd07b25df9a31431e905bad18c6d83c2ed8a35d68a10dbb1e66`
- Summary root: `0xc2e34df3762cc18856a2d6db493f7c105ec5ee2949265338d646e6e9a137e6a6`
- Agent memory manifest root: `0x118f59acea2e20b1821db194a3d1c53bb2d4af766b657438fe128a87aa04970b`

## 5. Current Assets

- Final answers: `SUBMISSION_FINAL_ANSWERS.md`
- Prep checklist: `SUBMISSION_PREP.md`
- Demo script: `DEMO_SCRIPT.md`
- Presentation outline: `PRESENTATION_OUTLINE.md`
- Handoff: `HANDOFF.md`
- Internal GitHub upload checklist: `GITHUB_UPLOAD_CHECKLIST.md`（local prep file; not intended for public repo）
- Internal security review: `SECURITY_REVIEW.md`（local prep file; not intended for public repo）
- Internal upload manifest: `GITHUB_UPLOAD_MANIFEST.txt`（local prep file; not intended for public repo）
- v2 video: `submission-assets/presentation-video-2026-05-14-v2/Delegated-MindGames-Arena-Presentation-v2-2026-05-14.mp4`
- v2 PPTX: `submission-assets/presentation-video-2026-05-14-v2/Delegated-MindGames-Arena-Presentation-v2-2026-05-14.pptx`

## 6. HackQuest Form Guidance

Use these themes in order:

1. Bounded MetaMask permissions for delegated AI agents.
2. A2A social reasoning under hidden information.
3. Cross-game agent memory and reputation graph.
4. 1Shot-ready cross-chain settlement and non-gas-token gas abstraction path.
5. x402 + ERC-7710 extension for paid rooms and pay-per-agent-action.
6. Public/private transcript separation and artifact roots.
7. Telegram-first playable demo plus MetaMask deposit/claim pages.

Avoid overclaims:

- Do not say live x402 payment is already charging users in the MVP.
- Do not say live 1Shot Sepolia execution is complete unless final support/tx evidence is added.
- Say “1Shot-ready”, “trace mode”, “adapter”, “planned x402 extension”, and “bounded payment envelope”.

## 7. Pre-Upload Gate

Before GitHub/HackQuest upload, Mike must approve:

- bot/dashboard `index.html`/deposit/claim links;
- public vault addresses and artifact roots;
- `m@yuzu-swap.com` contact use;
- video/PPTX hosting route;
- final `git diff --cached --stat` / staged file summary.
