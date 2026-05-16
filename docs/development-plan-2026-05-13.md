# Development Plan — Delegated MindGames Arena

## Working Title
**Delegated MindGames Arena**

## One-liner
A generalized multi-agent game/workflow protocol where humans grant bounded MetaMask Smart Account permissions, AI agents coordinate through ERC-7710 delegations/redelegations, and 1Shot executes gas-abstracted multi-chain settlement.

## Hackathon Fit
Target hackathon: **MetaMask Smart Accounts Kit x 1Shot API Dev Cook Off**

Best-fit prize tracks:
1. **Best Agent** — AI agents play/coordinate in a live social-reasoning arena.
2. **Best A2A coordination** — wolf-council / judge-agent / settlement-agent handoff demonstrates agent-to-agent delegation/redelegation.
3. **Best x402 + ERC-7710** — optional stretch: pay-per-agent-action or premium game-room access using x402 + bounded ERC-7710 permissions.

## Product Framing
Do **not** frame the project as a fixed Werewolf game or gambling product.

Frame it as:
- a generalized **delegated multi-agent arena**;
- a benchmark environment for social reasoning and coordinated agent actions;
- a cross-chain performance-bond settlement demo;
- a reusable protocol for turn-based multi-agent workflows.

The Werewolf-style social deduction module is only the first playable module.

Preferred language:
- Use **performance bond**, **stake-backed arena**, **commitment pool**, **settlement vault**.
- Avoid leading with **wager**, **bet**, or gambling language.

## Core Demo Narrative
1. A user enters a MindGames room with MetaMask.
2. The app requests bounded permissions through MetaMask Smart Accounts Kit / Advanced Permissions:
   - maximum bond/payment amount;
   - allowed target vault contract(s);
   - allowed functions only;
   - game/session expiry;
   - no arbitrary transfers.
3. AI agents play an 8-player social deduction module:
   - 2 wolf agents;
   - 1 seer;
   - 5 villagers;
   - wolf-council coordination shows private A2A reasoning/handoff.
4. Game-critical actions are hash-anchored on chain:
   - game creation;
   - role commitments;
   - speeches/votes/action hashes;
   - judge decision;
   - settlement root.
5. Players can bond on different L2s.
6. Judge/settlement agent uses 1Shot relayer to execute settlement/claim/refund on each player’s selected chain.
7. UI shows a replay timeline with:
   - public transcript;
   - private audit transcript / hashes;
   - delegation chain;
   - 1Shot task statuses;
   - per-chain settlement links.

## MVP Scope

### Must Have
- Reuse the existing local MindGames Arena implementation as the implementation base, but create a MetaMask-specific fork/surface.
- Generalize branding from Werewolf-only to **MindGames module framework**.
- Implement first game module: **8-player social deduction arena**.
- Role distribution: `2 wolves + 1 seer + 5 villagers`.
- Add lightweight **wolf council** event before night kill:
  - each wolf proposes a target or rationale;
  - lead wolf / judge selects final target;
  - public replay shows commitment/hash, private audit shows rationale.
- Keep Witch out of MVP; include as roadmap capability.
- Support multiple open chains conceptually through local vault interfaces.
- Implement at least two-chain settlement demo target, preferably EVM testnets supported by MetaMask/1Shot docs.
- Integrate MetaMask Smart Accounts Kit in demo flow enough to satisfy judging requirement.
- Show ERC-7710 delegation concept concretely in the flow:
  - user grants bounded game permission;
  - agent redeems permission to deposit/settle/claim or perform game action.
- Integrate 1Shot Public Relayer flow at least for one concrete transaction path:
  - capabilities discovery;
  - fee quote/context lock;
  - 7710 send or simulated send with clearly documented fallback if testnet support blocks live relay.
- Produce demo video and README emphasizing MetaMask + 1Shot.

### Should Have
- Cross-chain settlement dashboard:
  - Arbitrum / Optimism / Base / Linea style chain columns;
  - task status: Pending / Submitted / Confirmed / Rejected / Reverted.
- Delegation/redelegation visualizer:
  - User → Game Session Agent;
  - Judge Agent → Player Turn Agent;
  - Wolf Council → Lead Wolf / Judge;
  - Settlement Agent → per-chain vault execution.
- Public/private transcript separation inherited from prior project.
- Performance bond terminology throughout UI/docs.

### Stretch
- x402 pay-per-agent-action:
  - users authorize max x402 service spend per game;
  - agent calls paid strategy/judge service;
  - ERC-7710 constrains recipient and total amount.
- Witch/Guard/Hunter roles as delegated limited-use capabilities.
- Additional modules beyond social deduction:
  - DAO jury;
  - agent debate tournament;
  - prediction-market council;
  - trading strategy committee.

## Technical Architecture

### Frontend
- React/Next or existing static web demo upgraded as needed.
- MetaMask wallet connect.
- Smart account / advanced permission request flow.
- Chain selector per player.
- Game replay timeline.
- Delegation graph.
- Settlement status panel.

### Contracts
Per target chain:
- `PerformanceBondVault` / generalized `GameSettlementVault`
  - `depositBond(gameId)`
  - `settle(gameId, winners, amounts, settlementRoot)`
  - `claim(gameId)`
  - `refund(gameId)`

Shared/control plane:
- `GameRegistry`
- `AgentActionRegistry`
- Optional `DelegationRecordRegistry`

### Backend / Agents
- Player agents
- Wolf council agent flow
- Judge agent
- Settlement agent
- Optional x402 service agent

### 1Shot Integration
- `relayer_getCapabilities`
- `relayer_getFeeData`
- `relayer_send7710Transaction` or multichain variant
- `relayer_getStatus`
- optional webhook handler

### MetaMask Integration
- Smart Accounts Kit.
- Advanced Permissions / ERC-7715 where available.
- ERC-7710 delegation/redeem flow.
- EIP-7702 authorization if needed for 1Shot/Smart Account flow.

## Game Balance Decision
MVP social deduction module should use 8 players:
- 2 wolves
- 1 seer
- 5 villagers

Reasoning:
- Minimal code change compared with adding Witch.
- Existing engine already partially supports multiple wolves.
- Enables wolf-agent collusion/A2A coordination.
- More balanced than 6-player 2-wolf.
- Avoids large new UI/agent/timeout surface required by Witch.

Witch is roadmap, modeled as limited-use delegated capabilities:
- one-time save capability;
- one-time poison capability;
- permission caveats map cleanly to MetaMask delegation narrative.

## Phased Implementation Plan

### Phase 0 — Project setup / truth source
- Create `hackathon/metamask` workspace.
- Establish RUNSTATE.
- Save development plan.
- Link prior local MindGames sources only when needed for private development context; keep the public submission focused on the MetaMask fork.

### Phase 1 — Product refactor / naming
- Fork or overlay the prior MindGames implementation into the MetaMask workspace.
- Rename public project surface to Delegated MindGames Arena.
- Remove Mantle-specific messaging from MetaMask submission surface.
- Convert wager language to performance bond.
- Update README/pitch skeleton.

### Phase 2 — 8-player social deduction + wolf council
- Change role distribution to 8-player default.
- Add two extra default player seats.
- Add wolf council proposal events.
- Ensure public/private transcript separation.
- Run local mock and LLM demo.

### Phase 3 — MetaMask Smart Accounts permissions
- Build minimal MetaMask connect flow.
- Add permission request UX mock/live depending SDK readiness.
- Represent bounded session permission in app state.
- Add delegation proof display.

### Phase 4 — Multi-chain performance-bond vaults
- Generalize existing Mantle `GameSettlementVault` into chain-agnostic vault.
- Deploy or simulate on two EVM testnets.
- Add chain selector and per-player chain mapping.
- Add settlement plan object and replay display.

### Phase 5 — 1Shot integration
- Implement capabilities discovery.
- Implement fee quote/context lock.
- Implement task submission path or live relay if supported.
- Implement status polling/webhook display.
- Tie settlement agent to 1Shot task results.

### Phase 6 — x402/ERC-7710 prize-track stretch
- Add pay-per-agent-action or premium room fee.
- Keep ERC-7710 permission scopes narrow.
- Show x402 payment proof in demo.

### Phase 7 — Submission polish
- Demo video.
- README.
- Architecture diagram.
- Security/permission model section.
- Track-specific judging checklist.
- Sensitive info scan before any external publish.

## Key Risks
- 1Shot live relayer support on desired testnets may be limited or docs may shift.
- MetaMask Smart Accounts Kit / ERC-7710 APIs may be experimental and version-sensitive.
- ERC-7715 / Advanced Permissions may require MetaMask Flask or specific environment.
- Cross-chain live settlement can become too broad; MVP should prove two chains first.
- Avoid overclaiming “fully onchain game”; use “onchain-critical actions + hash-anchored transcripts.”

## Current Recommendation
Proceed with this as a distinct MetaMask hackathon project, reusing the existing MindGames codebase only as implementation substrate. The submission should present a generalized delegated-agent protocol, not a Werewolf-only app.
