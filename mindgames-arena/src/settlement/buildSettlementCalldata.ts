import { ethers } from 'ethers';
import type { GameSummary } from '../types/game.js';

export interface SettlementCalldataInput {
  gameKey: string;
  winnerCamp: string;
  winnerAddresses: string[];
  summaryRoot: string;
}

export function buildSettlementCalldata(input: SettlementCalldataInput): string {
  const iface = new ethers.Interface([
    'function settle(bytes32 gameKey, bytes32 winnerCamp, address[] calldata winners, bytes32 summaryRoot)'
  ]);
  return iface.encodeFunctionData('settle', [
    input.gameKey,
    ethers.id(input.winnerCamp),
    input.winnerAddresses,
    input.summaryRoot
  ]);
}

export function buildMockSettlementCalldata(gameId: string, summary: GameSummary): SettlementCalldataInput {
  return {
    gameKey: ethers.id(`delegated-mindgames:game:${gameId}`),
    winnerCamp: summary.winner,
    winnerAddresses: ['0x0000000000000000000000000000000000000001'],
    summaryRoot: `0x${'00'.repeat(32)}`
  };
}
