export interface GamePermissionScope {
  gameId: string;
  maxBondAmount: string;
  bondTokenSymbol: string;
  allowedContracts: string[];
  allowedFunctions: string[];
  expiresAt: string;
  chainIds: string[];
}

export interface DelegatedPermissionRecord {
  kind: 'metamask-smart-account-permission';
  status: 'mocked' | 'requested' | 'granted' | 'rejected';
  delegator?: string;
  delegate?: string;
  scope: GamePermissionScope;
  delegationHash?: string;
  notes: string[];
}

export class MockMetaMaskPermissionAdapter {
  async requestGameSessionPermission(scope: GamePermissionScope): Promise<DelegatedPermissionRecord> {
    return {
      kind: 'metamask-smart-account-permission',
      status: 'mocked',
      scope,
      delegationHash: `mock-delegation-${scope.gameId}`,
      notes: [
        'Mock adapter only: replace with MetaMask Smart Accounts Kit / Advanced Permissions flow.',
        'Intended ERC-7710 scope: bounded game-session permission for performance-bond deposit/claim/refund and allowed game actions.',
        'No arbitrary transfer permission should be requested.'
      ]
    };
  }
}
