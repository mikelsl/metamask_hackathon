import { createMantleArenaAdapter } from '../mantle/createMantleArenaAdapter.js';
import type { DelegatedActionAdapter } from './DelegatedActionAdapter.js';

export function createDelegatedActionAdapter(): DelegatedActionAdapter {
  return createMantleArenaAdapter();
}
