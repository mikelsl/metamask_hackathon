import 'dotenv/config';
import { WerewolfEngine } from '../engine/WerewolfEngine.js';
import { MockComputeAdapter } from '../compute/MockComputeAdapter.js';
import { createStorageAdapter } from '../storage/createStorageAdapter.js';
import { createDelegatedActionAdapter } from '../chain/createDelegatedActionAdapter.js';
import { persistGameArtifacts } from '../pipeline/persistGameArtifacts.js';
import { writeLocalShadowArtifact } from '../pipeline/writeLocalShadowArtifacts.js';
import { MockMetaMaskPermissionAdapter } from '../metamask/DelegatedPermissionAdapter.js';
import { buildOneShotSettlementTrace, createOneShotRelayerAdapter } from '../oneshot/OneShotRelayerAdapter.js';
import { runOneShotLivePreflight } from '../settlement/OneShotLivePreflight.js';

const players = [
  { id: 'p1', displayName: 'Mike', kind: 'human' as const },
  { id: 'a1', displayName: 'Ada', kind: 'agent' as const, agentPersonaId: 'analyst' },
  { id: 'a2', displayName: 'Charm', kind: 'agent' as const, agentPersonaId: 'charmer' },
  { id: 'a3', displayName: 'Riot', kind: 'agent' as const, agentPersonaId: 'chaos-wolf' },
  { id: 'a4', displayName: 'Shade', kind: 'agent' as const, agentPersonaId: 'silent-killer' },
  { id: 'a5', displayName: 'Mira', kind: 'agent' as const, agentPersonaId: 'empath' },
  { id: 'a6', displayName: 'Blaze', kind: 'agent' as const, agentPersonaId: 'overconfident-leader' },
  { id: 'a7', displayName: 'Echo', kind: 'agent' as const, agentPersonaId: 'analyst' }
];

const gameId = `demo-${Date.now()}`;
const engine = new WerewolfEngine(new MockComputeAdapter());
const storage = createStorageAdapter();
const chain = createDelegatedActionAdapter();
const permissionAdapter = new MockMetaMaskPermissionAdapter();
const oneShotRelayer = createOneShotRelayerAdapter();

const initial = engine.createGame(gameId, players);
const { state, summary } = await engine.runToEnd(initial);

await writeLocalShadowArtifact(`${gameId}/transcript.json`, state.events);
await writeLocalShadowArtifact(`${gameId}/summary.raw.json`, summary);
if (summary.agentMemories) await writeLocalShadowArtifact('latest-agent-memories.json', summary.agentMemories);
const rawTranscriptArtifact = await storage.putJson(`${gameId}/transcript.json`, state.events);
const rawSummaryArtifact = await storage.putJson(`${gameId}/summary.raw.json`, summary);
const chainRecord = await chain.finalizeGame(state, summary, rawTranscriptArtifact.root, rawSummaryArtifact.root);
const settlementChainIds = ['84532', '421614', '11155420'];
const delegatedPermission = await permissionAdapter.requestGameSessionPermission({
  gameId,
  maxBondAmount: '5',
  bondTokenSymbol: 'USDC',
  allowedContracts: ['PerformanceBondVault', 'AgentActionRegistry'],
  allowedFunctions: ['depositBond(bytes32)', 'claim(bytes32)', 'refund(bytes32)', 'recordAction(bytes32,bytes32)'],
  expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
  chainIds: settlementChainIds
});
const preflightResult = await runOneShotLivePreflight({
  adapter: oneShotRelayer,
  delegatedPermission,
  requestedChainIds: settlementChainIds
});
const oneShotTrace = await buildOneShotSettlementTrace({
  adapter: oneShotRelayer,
  gameId,
  chainIds: settlementChainIds,
  vaultAddress: 'PerformanceBondVault',
  paymentToken: 'USDC',
  preflightResult
});
const persisted = await persistGameArtifacts(storage, state, summary, chainRecord, {
  manifestPath: `artifacts/${gameId}/replay-manifest.json`,
  latestManifestPath: (process.env.UPDATE_LATEST_REPLAY ?? 'true') !== 'false' ? 'web/data/latest-demo.json' : undefined,
  engine: 'Mock agents + 8-player social deduction module',
  rawTranscriptArtifact,
  rawSummaryArtifact,
  delegatedPermission,
  oneShotRelayer: oneShotTrace
});

console.log(JSON.stringify({
  gameId,
  winner: summary.winner,
  transcript: persisted.publicTranscriptArtifact,
  auditTranscript: persisted.privateAuditTranscriptArtifact,
  summary: persisted.summaryArtifact,
  chainRecord,
  eventCount: state.events.length
}, null, 2));
