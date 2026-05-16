import 'dotenv/config';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { ethers } from 'ethers';

const CHAINS = {
  '84532': {
    env: 'BASE_SEPOLIA',
    name: 'Base Sepolia',
    rpcUrl: process.env.BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org',
    vaultEnv: 'BASE_SEPOLIA_VAULT_ADDRESS'
  },
  '421614': {
    env: 'ARBITRUM_SEPOLIA',
    name: 'Arbitrum Sepolia',
    rpcUrl: process.env.ARBITRUM_SEPOLIA_RPC_URL || 'https://sepolia-rollup.arbitrum.io/rpc',
    vaultEnv: 'ARBITRUM_SEPOLIA_VAULT_ADDRESS'
  },
  '11155420': {
    env: 'OPTIMISM_SEPOLIA',
    name: 'Optimism Sepolia',
    rpcUrl: process.env.OPTIMISM_SEPOLIA_RPC_URL || 'https://sepolia.optimism.io',
    vaultEnv: 'OPTIMISM_SEPOLIA_VAULT_ADDRESS'
  }
};

const requested = (process.env.SETTLEMENT_CHAINS || '84532,421614,11155420')
  .split(',')
  .map((item) => item.trim())
  .filter(Boolean);
const live = process.env.DEPLOY_SETTLEMENT_LIVE === '1';
const privateKey = process.env.DEPLOYER_PRIVATE_KEY || process.env.PRIVATE_KEY;

async function loadArtifact(name) {
  return JSON.parse(await readFile(`artifacts/contracts/${name}.json`, 'utf8'));
}

async function hasCode(provider, address) {
  if (!address || address === '0x0000000000000000000000000000000000000000') return false;
  return await provider.getCode(address) !== '0x';
}

async function deployVault(provider, wallet) {
  const artifact = await loadArtifact('GameSettlementVault');
  const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);
  const contract = await factory.deploy();
  const tx = contract.deploymentTransaction();
  console.log(`[deploy] GameSettlementVault tx=${tx?.hash}`);
  await contract.waitForDeployment();
  const receipt = tx ? await tx.wait() : undefined;
  return { address: await contract.getAddress(), txHash: tx?.hash, blockNumber: receipt?.blockNumber };
}

const output = {
  generatedAt: new Date().toISOString(),
  mode: live ? 'live' : 'dry-run',
  requestedChains: requested,
  contracts: {}
};

if (live && !privateKey) {
  throw new Error('DEPLOY_SETTLEMENT_LIVE=1 requires DEPLOYER_PRIVATE_KEY or PRIVATE_KEY');
}

for (const chainId of requested) {
  const config = CHAINS[chainId];
  if (!config) throw new Error(`Unsupported settlement chain ${chainId}`);
  const provider = new ethers.JsonRpcProvider(config.rpcUrl, Number(chainId));
  const network = await provider.getNetwork();
  if (network.chainId !== BigInt(chainId)) {
    throw new Error(`${config.name} RPC chain mismatch: expected ${chainId}, got ${network.chainId}`);
  }

  const existing = process.env[config.vaultEnv];
  const existingHasCode = await hasCode(provider, existing);
  const entry = {
    chainId,
    name: config.name,
    rpcUrl: config.rpcUrl,
    vaultEnv: config.vaultEnv,
    existingAddress: existing || null,
    existingHasCode,
    action: 'none'
  };

  if (existingHasCode) {
    entry.action = 'reuse-existing';
    entry.address = ethers.getAddress(existing);
  } else if (!live) {
    entry.action = 'dry-run-needs-deploy';
    entry.note = `Set DEPLOY_SETTLEMENT_LIVE=1 and ${config.vaultEnv}=<address after deploy>, or rerun this script live to deploy.`;
  } else {
    const wallet = new ethers.Wallet(privateKey, provider);
    const balance = await provider.getBalance(wallet.address);
    entry.deployer = wallet.address;
    entry.deployerBalanceEth = ethers.formatEther(balance);
    if (balance === 0n) throw new Error(`${config.name} deployer ${wallet.address} has zero gas`);
    const deployed = await deployVault(provider, wallet);
    entry.action = 'deployed';
    entry.address = deployed.address;
    entry.txHash = deployed.txHash;
    entry.blockNumber = deployed.blockNumber;
  }

  output.contracts[chainId] = entry;
}

await mkdir('deployments', { recursive: true });
await writeFile('deployments/settlement-vaults.json', `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify(output, null, 2));
console.log('[deploy] wrote deployments/settlement-vaults.json');
