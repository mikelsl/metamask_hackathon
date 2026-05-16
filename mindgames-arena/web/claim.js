const params = new URLSearchParams(location.search);
const cfg = {
  gameId: params.get('gameId') || '',
  gameKey: params.get('gameKey') || '',
  vault: params.get('vault') || '',
  expectedAddress: (params.get('address') || '').toLowerCase(),
  chainId: params.get('chainId') || '5003',
  chainName: params.get('chainName') || 'Mantle Sepolia Testnet',
  nativeSymbol: params.get('nativeSymbol') || 'MNT',
  rpcUrl: params.get('rpcUrl') || 'https://rpc.sepolia.mantle.xyz',
  explorerTxBase: params.get('explorerTxBase') || 'https://sepolia.mantlescan.xyz/tx/'
};

const $ = (id) => document.getElementById(id);
$('gameId').textContent = cfg.gameId;
$('address').textContent = cfg.expectedAddress || 'Connected winner wallet';
$('vault').textContent = cfg.vault;
$('gameKey').textContent = cfg.gameKey;

const chain = {
  chainId: `0x${Number(cfg.chainId).toString(16)}`,
  chainName: cfg.chainName,
  nativeCurrency: { name: cfg.nativeSymbol, symbol: cfg.nativeSymbol, decimals: 18 },
  rpcUrls: [cfg.rpcUrl],
  blockExplorerUrls: [cfg.explorerTxBase.replace(/\/tx\/?$/, '')]
};

function setStatus(text, cls = 'warn') {
  $('status').className = cls;
  $('status').textContent = text;
}

async function request(method, params) {
  if (!window.ethereum) throw new Error('MetaMask/EIP-1193 wallet not found');
  return window.ethereum.request({ method, params });
}

async function connect() {
  const accounts = await request('eth_requestAccounts');
  const account = accounts[0];
  if (!account) throw new Error('No account selected');
  if (cfg.expectedAddress && account.toLowerCase() !== cfg.expectedAddress) {
    setStatus(`Connected ${account}, but Telegram expects ${cfg.expectedAddress}. Switch account.`, 'err');
    return account;
  }
  setStatus(`Connected ${account}`, 'ok');
  return account;
}

async function switchChain() {
  try {
    await request('wallet_switchEthereumChain', [{ chainId: chain.chainId }]);
  } catch (err) {
    if (err?.code === 4902) await request('wallet_addEthereumChain', [chain]);
    else throw err;
  }
  setStatus(`${cfg.chainName} selected.`, 'ok');
}

function encodeClaim(gameKey) {
  // claim(bytes32) selector = first 4 bytes of keccak256("claim(bytes32)").
  const selector = '0xbd66528a';
  return selector + gameKey.replace(/^0x/, '').padStart(64, '0');
}

async function claim() {
  const [account] = await request('eth_requestAccounts');
  if (cfg.expectedAddress && account.toLowerCase() !== cfg.expectedAddress) throw new Error(`Wrong wallet. Expected ${cfg.expectedAddress}`);
  await switchChain();
  const txHash = await request('eth_sendTransaction', [{
    from: account,
    to: cfg.vault,
    value: '0x0',
    data: encodeClaim(cfg.gameKey)
  }]);
  const url = `${cfg.explorerTxBase}${txHash}`;
  $('txLine').innerHTML = `Claim tx sent: <a href="${url}" target="_blank" rel="noreferrer">${txHash.slice(0, 10)}…${txHash.slice(-6)}</a>`;
  setStatus(`Claim submitted. You can inspect it on ${cfg.chainName}.`, 'ok');
}

$('connectBtn').onclick = () => connect().catch((e) => setStatus(e.message, 'err'));
$('switchBtn').onclick = () => switchChain().catch((e) => setStatus(e.message, 'err'));
$('claimBtn').onclick = () => claim().catch((e) => setStatus(e.message, 'err'));

if (!/^0x[0-9a-fA-F]{64}$/.test(cfg.gameKey) || !/^0x[0-9a-fA-F]{40}$/.test(cfg.vault)) {
  setStatus('Invalid claim link. Return to Telegram and use the latest game result message.', 'err');
}
