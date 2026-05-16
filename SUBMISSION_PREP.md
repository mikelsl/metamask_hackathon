# Delegated MindGames Arena — Submission Prep

**Hackathon:** MetaMask Smart Accounts Kit x 1Shot API Dev Cook Off  
**Project:** Delegated MindGames Arena  
**Status:** Submission package reorganized; v2 video/PPTX ready; GitHub/HackQuest upload deferred until final public-identifier approval.

## Core Deliverables Status

### 1. Code & Runtime

- [x] MetaMask-specific fork exists: `hackathon/metamask/mindgames-arena/`
- [x] Telegram bot running: `@metamask_mindgame_bot`
- [x] Public deposit / claim pages hosted under `/dashboard/metamask/`
- [x] 8-player social deduction module implemented
- [x] Private wolf-council no longer leaks to public transcript
- [x] Demo wallet set consolidated: prior well-funded demo 5 + MetaMask 2
- [x] Typecheck passes
- [ ] Final clean E2E `/wagerdemo` run captured after latest wallet/claim fixes
- [ ] Public GitHub repo prepared after secret scan

### 2. Contracts / Chains

- [x] Base Sepolia vault deployed: `0x5677F20bD56538F20051Fe8Bf002e6D06780d85c`
- [x] Arbitrum Sepolia vault deployed: `0x5677F20bD56538F20051Fe8Bf002e6D06780d85c`
- [x] OP Sepolia vault deployed: `0x5677F20bD56538F20051Fe8Bf002e6D06780d85c`
- [x] Mantle Sepolia legacy vault available: `0xFbadd57084612223aA4D24eA61d7EBe7d470A35E`
- [x] 1Shot capability caveat documented
- [x] x402 + ERC-7710 extension path documented as planned paid-room / pay-per-agent-action layer
- [x] Latest settlement trace selected for submission package: `mock-delegated-tx-tg-1778743433354`

### 3. Documentation

- [x] `README.md`
- [x] `RUNSTATE.md`
- [x] Multi-chain settlement setup doc
- [x] Final answers draft: `SUBMISSION_FINAL_ANSWERS.md`
- [x] Demo script draft: `DEMO_SCRIPT.md`
- [x] Consolidated package summary: `SUBMISSION_PACKAGE.md`
- [x] GitHub upload checklist and security review prepared
- [ ] Final README polish after GitHub repo URL is known
- [ ] `.env.example` final review before staging

### 4. Demo Assets

- [x] Final v2 presentation/demo video generated
- [ ] Telegram screenshots:
  - `/newgame`
  - `/wagerdemo`
  - cross-chain bond proof
  - gameplay
  - hidden/private role behavior note
  - final settlement / claim result
- [ ] Deposit page screenshot
- [ ] Claim page screenshot
- [ ] Optional dashboard/replay screenshot

## Submission Form Content

### Project Name

Delegated MindGames Arena

### Tagline

Bounded MetaMask permissions for delegated AI agents, private A2A coordination, 1Shot-ready cross-chain settlement, and an x402 + ERC-7710 path for paid agent rooms.

### Short Description

Delegated MindGames Arena is a Telegram-playable multi-agent arena where humans grant bounded MetaMask Smart Account permissions, AI agents compete and coordinate in social deduction games, and performance-bond settlement is prepared through a 1Shot-style cross-chain flow. The MVP demonstrates an 8-player Werewolf module with public/private transcripts, private wolf-council coordination, cross-game agent memory, verifiable artifact roots, MetaMask deposit/claim pages, and testnet settlement vaults. The same bounded permission envelope extends naturally to x402 paid rooms and pay-per-agent-action services under ERC-7710-style spend limits.

### Track Fit

- Best Agent
- Best A2A coordination
- Best x402 + ERC-7710 / delegated permissions path: submit as planned extension, not current live payment path

### Team / Contact

Use stable hackathon profile from memory:

- Team/project: YuzuSwap / Mike / solo builder
- Location: Hong Kong
- Email: `m@yuzu-swap.com`
- Telegram: `mikelee_tg`
- Discord: `3betmike`
- GitHub: `https://github.com/mikelsl`
- X: `@mic_klaw`

### Live Demo Links

- Telegram bot: https://t.me/metamask_mindgame_bot
- Deposit page: https://openclaw.yuzu-swap.com/dashboard/metamask/deposit.html
- Claim page: https://openclaw.yuzu-swap.com/dashboard/metamask/claim.html
- GitHub: https://github.com/mikelsl/metamask_hackathon
- Video: https://github.com/mikelsl/metamask_hackathon/raw/main/submission-assets/presentation-video-2026-05-14-v2/Delegated-MindGames-Arena-Presentation-v2-2026-05-14.mp4

## x402 Submission Wording

Use this wording when space allows:

> x402 is the planned payment-gating layer for paid agent rooms and pay-per-agent-action services. A user grants a bounded ERC-7710-style payment envelope for one game/session, then x402-enabled service agents can charge only within that explicit budget. Combined with 1Shot-style relaying, the intended UX is that users pay with an approved payment token while infrastructure handles destination-chain gas.

Important caveat: do **not** claim live x402 charging is already active in the Telegram MVP. Phrase it as `planned x402 extension`, `x402-ready`, or `Best x402 + ERC-7710 path`.

## Required Final Evidence Capture

Run a fresh room after latest fixes:

```text
/newgame
/wagerdemo
/join
/startgame
```

Capture:

1. Bot says demo-sponsored cross-chain mode.
2. Deposit proof shows human on Arbitrum Sepolia and agents on Mantle Sepolia.
3. Public gameplay does not reveal wolf-council identities.
4. Final result shows settlement/claim behavior.
5. Collect tx links from final settlement message.

Optional self-wallet proof:

```text
/newgame
/wagerself
/wallet 0xYourAddress
/join
/startgame
```

Capture deposit page and claim page behavior.

## Security Review Before Publish

Mandatory before GitHub / hackathon upload:

```bash
cd mindgames-arena
npm run check
npm run scan:legacy
find . -name '.env*' -o -path './.runtime/*' -o -name '*log*'
```

Manual review must confirm:

- no `.env` or `.env.backup-*`
- no private keys / API keys / bot tokens
- no raw `.runtime` logs
- no local credential paths
- no screenshots containing tokens or private config
- public addresses / tx hashes approved by Mike
