export interface OneShotTaskStatus {
  taskId: string;
  status: 'Mocked' | 'Pending' | 'Submitted' | 'Confirmed' | 'Rejected' | 'Reverted';
  chainId?: string;
  txHash?: string;
  detail?: string;
}

export interface OneShotSettlementTask {
  gameId: string;
  chainId: string;
  vaultAddress: string;
  calldata: string;
  paymentToken?: string;
  feeContext?: unknown;
}

export interface OneShotFeeQuote {
  mode: 'mock' | 'live';
  chainId: string;
  paymentToken: string;
  context: unknown;
  note?: string;
}

export interface OneShotRelayerTrace {
  mode: 'mock' | 'live';
  endpoint: string;
  methodPlan: string[];
  chainIds: string[];
  capabilities: Record<string, unknown>;
  feeQuotes: OneShotFeeQuote[];
  settlementTasks: OneShotTaskStatus[];
  notes: string[];
}

export interface OneShotRelayerAdapter {
  getCapabilities(chainIds: string[]): Promise<Record<string, unknown>>;
  quoteFee(chainId: string, paymentToken: string): Promise<OneShotFeeQuote>;
  submitSettlement(task: OneShotSettlementTask): Promise<OneShotTaskStatus>;
}

const DEFAULT_ENDPOINT = 'https://relayer.1shotapi.com/relayers';

export class MockOneShotRelayerAdapter implements OneShotRelayerAdapter {
  async getCapabilities(chainIds: string[]): Promise<Record<string, unknown>> {
    return {
      mode: 'mock',
      chainIds,
      supportedChains: {
        '84532': { name: 'Base Sepolia', settlementToken: 'USDC' },
        '421614': { name: 'Arbitrum Sepolia', settlementToken: 'USDC' },
        '11155420': { name: 'Optimism Sepolia', settlementToken: 'USDC' }
      },
      note: 'Replace with relayer_getCapabilities from https://relayer.1shotapi.com/relayers.'
    };
  }

  async quoteFee(chainId: string, paymentToken: string): Promise<OneShotFeeQuote> {
    return {
      mode: 'mock',
      chainId,
      paymentToken,
      context: `mock-fee-context-${chainId}-${paymentToken}`,
      note: 'Replace with relayer_getFeeData and pass returned context into send.'
    };
  }

  async submitSettlement(task: OneShotSettlementTask): Promise<OneShotTaskStatus> {
    return {
      taskId: `mock-1shot-${task.gameId}-${task.chainId}`,
      status: 'Mocked',
      chainId: task.chainId,
      detail: 'Replace with relayer_send7710Transaction or relayer_send7710TransactionMultichain.'
    };
  }
}

export class JsonRpcOneShotRelayerAdapter implements OneShotRelayerAdapter {
  constructor(private readonly endpoint = process.env.ONESHOT_RELAYER_URL || DEFAULT_ENDPOINT) {}

  async getCapabilities(chainIds: string[]): Promise<Record<string, unknown>> {
    return this.rpc('relayer_getCapabilities', chainIds) as Promise<Record<string, unknown>>;
  }

  async quoteFee(chainId: string, paymentToken: string): Promise<OneShotFeeQuote> {
    const context = await this.rpc('relayer_getFeeData', [chainId, paymentToken]);
    return { mode: 'live', chainId, paymentToken, context };
  }

  async submitSettlement(task: OneShotSettlementTask): Promise<OneShotTaskStatus> {
    const result = await this.rpc('relayer_send7710Transaction', [task]);
    const taskId = typeof result === 'object' && result && 'taskId' in result ? String((result as { taskId: unknown }).taskId) : `live-1shot-${task.gameId}-${task.chainId}`;
    return {
      taskId,
      status: 'Submitted',
      chainId: task.chainId,
      detail: 'Submitted through relayer_send7710Transaction.'
    };
  }

  private async rpc(method: string, params: unknown): Promise<unknown> {
    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'user-agent': 'delegated-mindgames-arena/0.1'
      },
      body: JSON.stringify({ jsonrpc: '2.0', id: Date.now(), method, params })
    });
    if (!response.ok) throw new Error(`1Shot relayer ${method} failed: HTTP ${response.status}`);
    const payload = await response.json() as { result?: unknown; error?: unknown };
    if (payload.error) throw new Error(`1Shot relayer ${method} error: ${JSON.stringify(payload.error)}`);
    return payload.result;
  }
}

export function createOneShotRelayerAdapter(): OneShotRelayerAdapter {
  return process.env.ONESHOT_RELAYER_MODE === 'live'
    ? new JsonRpcOneShotRelayerAdapter()
    : new MockOneShotRelayerAdapter();
}

export async function buildOneShotSettlementTrace(input: {
  adapter: OneShotRelayerAdapter;
  gameId: string;
  chainIds: string[];
  vaultAddress: string;
  paymentToken: string;
  calldata?: string;
  preflightResult?: { safe: boolean; errors: string[]; warnings: string[] };
}): Promise<OneShotRelayerTrace> {
  const capabilities = await input.adapter.getCapabilities(input.chainIds);
  const feeQuotes: OneShotFeeQuote[] = [];
  const settlementTasks: OneShotTaskStatus[] = [];

  for (const chainId of input.chainIds) {
    const quote = await input.adapter.quoteFee(chainId, input.paymentToken);
    feeQuotes.push(quote);
    settlementTasks.push(await input.adapter.submitSettlement({
      gameId: input.gameId,
      chainId,
      vaultAddress: input.vaultAddress,
      calldata: input.calldata ?? `mock-settle-calldata-${input.gameId}-${chainId}`,
      paymentToken: input.paymentToken,
      feeContext: quote.context
    }));
  }

  const notes = [
    'Mock mode records the intended 1Shot flow without submitting transactions.',
    'Live mode is guarded by ONESHOT_RELAYER_MODE=live and should be used only after final calldata/chain support review.',
    'Mantle is not in the 2026-05-13 checked public capabilities response; faucet-funded testnet demo chains are Base Sepolia, Arbitrum Sepolia, and Optimism Sepolia.'
  ];

  if (input.preflightResult) {
    if (!input.preflightResult.safe) {
      notes.push(`Preflight blocked live mode: ${input.preflightResult.errors.join('; ')}`);
    }
    if (input.preflightResult.warnings.length > 0) {
      notes.push(`Preflight warnings: ${input.preflightResult.warnings.join('; ')}`);
    }
  }

  return {
    mode: process.env.ONESHOT_RELAYER_MODE === 'live' ? 'live' : 'mock',
    endpoint: process.env.ONESHOT_RELAYER_URL || DEFAULT_ENDPOINT,
    methodPlan: ['relayer_getCapabilities', 'relayer_getFeeData', 'relayer_send7710TransactionMultichain', 'relayer_getStatus'],
    chainIds: input.chainIds,
    capabilities,
    feeQuotes,
    settlementTasks,
    notes
  };
}
