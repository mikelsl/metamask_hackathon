import { spawnSync } from 'node:child_process';

const terms = [
  '0' + 'g',
  'zero' + 'g',
  'zero' + '-g',
  'gali' + 'leo',
  'arist' + 'otle',
  'chainscan\\.' + '0' + 'g',
  '0' + 'glabs',
  '0' + 'gfoundation',
  'Game' + 'Registry',
  'STORAGE_' + 'BACKEND',
  'COMPUTE_' + 'BACKEND',
  '0' + 'G Storage',
  '0' + 'G Compute',
  '0' + 'G Chain',
  'tur' + 'ing',
  'TUR' + 'ING'
];

const pattern = terms.join('|');
const result = spawnSync('grep', [
  '-RInEi',
  pattern,
  '.',
  '--exclude=package-lock.json',
  '--exclude-dir=node_modules',
  '--exclude-dir=artifacts'
], { stdio: 'inherit' });

if (result.status === 1) process.exit(0);
if (result.status === 0) process.exit(1);
process.exit(result.status ?? 1);
