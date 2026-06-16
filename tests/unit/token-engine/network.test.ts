import { describe, expect, it } from 'vitest';

import { toNetworkId } from '../../../token-engine/network';
import { NetworkId } from '../../../token-engine/sdk';

describe('toNetworkId', () => {
  it('maps each sphere network to the SDK NetworkId id (1/2/3)', () => {
    expect(toNetworkId('mainnet').id).toBe(1);
    expect(toNetworkId('testnet').id).toBe(2);
    expect(toNetworkId('local').id).toBe(3);
  });

  it('returns the canonical NetworkId singletons', () => {
    expect(toNetworkId('mainnet')).toBe(NetworkId.MAINNET);
    expect(toNetworkId('testnet')).toBe(NetworkId.TESTNET);
    expect(toNetworkId('local')).toBe(NetworkId.LOCAL);
  });
});
