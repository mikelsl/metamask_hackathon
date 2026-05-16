export interface ChainSettlementConfig {
  chainId: string;
  chainName: string;
  rpcUrl: string;
  explorerTxBase: string;
  performanceBondVaultAddress: string;
  settlementTokenSymbol: string;
  settlementTokenAddress?: string;
}

export const SETTLEMENT_CHAIN_CONFIG: Record<string, ChainSettlementConfig> = {
  '84532': {
    chainId: '84532',
    chainName: 'Base Sepolia',
    rpcUrl: 'https://sepolia.base.org',
    explorerTxBase: 'https://sepolia.basescan.org/tx/',
    performanceBondVaultAddress: process.env.BASE_SEPOLIA_VAULT_ADDRESS || '0x5677F20bD56538F20051Fe8Bf002e6D06780d85c',
    settlementTokenSymbol: 'USDC',
    settlementTokenAddress: '0x036CbD53842c5426634e7929541eC2318f3dCF7e'
  },
  '421614': {
    chainId: '421614',
    chainName: 'Arbitrum Sepolia',
    rpcUrl: 'https://sepolia-rollup.arbitrum.io/rpc',
    explorerTxBase: 'https://sepolia.arbiscan.io/tx/',
    performanceBondVaultAddress: process.env.ARBITRUM_SEPOLIA_VAULT_ADDRESS || '0x5677F20bD56538F20051Fe8Bf002e6D06780d85c',
    settlementTokenSymbol: 'USDC',
    settlementTokenAddress: '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d'
  },
  '11155420': {
    chainId: '11155420',
    chainName: 'Optimism Sepolia',
    rpcUrl: 'https://sepolia.optimism.io',
    explorerTxBase: 'https://sepolia-optimism.etherscan.io/tx/',
    performanceBondVaultAddress: process.env.OPTIMISM_SEPOLIA_VAULT_ADDRESS || '0x5677F20bD56538F20051Fe8Bf002e6D06780d85c',
    settlementTokenSymbol: 'USDC',
    settlementTokenAddress: '0x5fd84259d66Cd46123540766Be93DFE6D43130D7'
  },
  '5003': {
    chainId: '5003',
    chainName: 'Mantle Sepolia (legacy)',
    rpcUrl: 'https://rpc.sepolia.mantle.xyz',
    explorerTxBase: 'https://sepolia.mantlescan.xyz/tx/',
    performanceBondVaultAddress: process.env.MANTLE_SEPOLIA_VAULT_ADDRESS || process.env.GAME_SETTLEMENT_VAULT_ADDRESS || '0x0000000000000000000000000000000000000000',
    settlementTokenSymbol: 'MNT'
  }
};

export function getSettlementChainConfig(chainId: string): ChainSettlementConfig | undefined {
  return SETTLEMENT_CHAIN_CONFIG[chainId];
}

export function validateSettlementChainConfig(chainIds: string[]): { valid: boolean; missing: string[] } {
  const missing = chainIds.filter((id) => !SETTLEMENT_CHAIN_CONFIG[id]);
  return { valid: missing.length === 0, missing };
}
