import type { OneShotRelayerAdapter } from '../oneshot/OneShotRelayerAdapter.js';
import type { DelegatedPermissionRecord } from '../metamask/DelegatedPermissionAdapter.js';
import { getSettlementChainConfig, validateSettlementChainConfig } from './MultiChainSettlementConfig.js';

export interface OneShotPreflightResult {
  safe: boolean;
  errors: string[];
  warnings: string[];
}

export async function runOneShotLivePreflight(input: {
  adapter: OneShotRelayerAdapter;
  delegatedPermission: DelegatedPermissionRecord;
  requestedChainIds: string[];
}): Promise<OneShotPreflightResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (process.env.ONESHOT_RELAYER_MODE !== 'live') {
    warnings.push('ONESHOT_RELAYER_MODE is not live; this preflight is advisory only.');
  }

  const chainValidation = validateSettlementChainConfig(input.requestedChainIds);
  if (!chainValidation.valid) {
    errors.push(`Unknown settlement chains: ${chainValidation.missing.join(', ')}`);
  }

  for (const chainId of input.requestedChainIds) {
    const config = getSettlementChainConfig(chainId);
    if (!config) {
      errors.push(`No settlement config for chain ${chainId}`);
      continue;
    }
    if (config.performanceBondVaultAddress === '0x0000000000000000000000000000000000000000') {
      errors.push(`PerformanceBondVault address not configured for chain ${chainId} (${config.chainName})`);
    }
  }

  if (input.delegatedPermission.status !== 'granted' && input.delegatedPermission.status !== 'mocked') {
    errors.push(`Delegated permission status is ${input.delegatedPermission.status}, expected granted or mocked`);
  }

  const permissionChains = input.delegatedPermission.scope.chainIds;
  const missing = input.requestedChainIds.filter((id) => !permissionChains.includes(id));
  if (missing.length > 0) {
    errors.push(`Requested chains ${missing.join(', ')} are not covered by the delegated permission scope`);
  }

  try {
    const capabilities = await input.adapter.getCapabilities(input.requestedChainIds);
    if (!capabilities || typeof capabilities !== 'object') {
      errors.push('1Shot relayer getCapabilities returned invalid response');
    } else if (process.env.ONESHOT_RELAYER_MODE === 'live') {
      const capabilityKeys = Object.keys(capabilities as Record<string, unknown>);
      const missingCapabilities = input.requestedChainIds.filter((id) => !capabilityKeys.includes(id));
      if (missingCapabilities.length > 0) {
        errors.push(`1Shot relayer capabilities do not include requested chains: ${missingCapabilities.join(', ')}`);
      }
    }
  } catch (error) {
    errors.push(`1Shot relayer getCapabilities failed: ${error instanceof Error ? error.message : String(error)}`);
  }

  return {
    safe: errors.length === 0,
    errors,
    warnings
  };
}
