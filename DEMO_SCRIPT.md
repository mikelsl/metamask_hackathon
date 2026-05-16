# Delegated MindGames Arena — Demo Script

Target length: 60-120 seconds.

## 0:00 — Opening

"This is Delegated MindGames Arena, a MetaMask Smart Accounts, 1Shot-ready, and x402-ready arena for delegated AI agents. A human grants bounded game-session permissions, AI agents play a social deduction game, and performance bonds are settled through a cross-chain coordination flow."

Show:
- Telegram bot `@metamask_mindgame_bot`
- `/newgame`

## 0:10 — Cross-chain wager mode

"For the fast judge demo, I use `/wagerdemo`. The operator sponsors the testnet bonds, but they are intentionally split across chains: the human seat bond is on Arbitrum Sepolia, while AI-agent bonds are on Mantle Sepolia. This creates a 1Shot-style multi-chain settlement trace, with the target UX that users can pay with approved payment tokens while relayer infrastructure handles destination-chain gas."

Show:
- `/wagerdemo`
- `/join`
- `/startgame`
- bond preparation message
- deposit proof with chain labels

## 0:30 — Delegated agents and hidden information

"The first module is an 8-player social deduction game: one human, seven AI agents, two wolves, one seer, and five villagers. Roles are private. Agents decide using previous speeches, votes, accusations, and memory; wolf agents coordinate through a private wolf-council flow, but that hidden coordination does not leak into public chat."

Show:
- role/private message if safe
- public gameplay messages
- no public wolf-council identity leakage

## 0:50 — Public/private verification

"The system separates public replay from private audit. Public transcript is safe for viewers; private audit keeps hidden-role evidence and agent memory roots for verification."

Show:
- replay/artifact roots or dashboard/replay page
- public transcript root / private audit root if visible

## 1:05 — Settlement and claim

"At the end, the winning camp is settled. Demo-wallet winners are auto-claimed by the bot; self-wallet human winners use the MetaMask claim page. The same flow can move to live 1Shot relayer execution once Sepolia or target-chain support is enabled."

Show:
- final game result
- settlement / claim lines
- deposit/claim page briefly

## 1:18 — x402 extension

"The x402 extension turns this into a paid agent-service network. Premium rooms, tournament entries, dispute reviews, or special agent actions can return an x402 payment requirement. The user's smart account approves a bounded ERC-7710-style budget for that session, so service agents can charge only within explicit limits."

Show:
- slide or text callout: `x402 paid rooms + pay-per-agent-action`
- bounded payment envelope / non-gas-token payment token callout

## 1:35 — Closing

"Werewolf is only the first interface. The same bounded delegation, private coordination, replay audit, settlement layer, and x402 payment envelope can support DAO juries, agent tournaments, prediction-market councils, and other multi-agent workflows where trust and delegated authority matter."

Show:
- final links: bot, dashboard, repo (https://github.com/mikelsl/metamask_hackathon), video (https://github.com/mikelsl/metamask_hackathon/raw/main/submission-assets/presentation-video-2026-05-14-v2/Delegated-MindGames-Arena-Presentation-v2-2026-05-14.mp4), contact email

## Must Capture in Final Video

- `/wagerdemo` cross-chain explanation
- chain-labeled bond tx proof
- hidden wolf-council behavior not exposed publicly
- final settlement/claim behavior
- MetaMask deposit or claim page if time allows
- x402 extension callout: paid rooms / pay-per-agent-action with bounded ERC-7710 payment permission
