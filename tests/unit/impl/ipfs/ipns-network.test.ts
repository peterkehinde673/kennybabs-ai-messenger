/**
 * IPNS identity is per-network: the same wallet key derives a DISTINCT IPNS name per network,
 * so a v2 (testnet2) wallet cannot re-pull v1 (testnet) tokens from the old shared IPNS record.
 * The network is baked into the HKDF info (`${IPNS_HKDF_INFO}:${network}`).
 */

import { describe, it, expect } from 'vitest';
import { deriveIpnsName } from '../../../../impl/shared/ipfs/ipns-key-derivation';

const PK = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

describe('deriveIpnsName — per-network IPNS', () => {
  it('differs per network for the same wallet key (closes v1-via-IPFS re-pull)', async () => {
    const t2 = await deriveIpnsName(PK, 'testnet2');
    const t1 = await deriveIpnsName(PK, 'testnet');
    expect(t2).not.toBe(t1);
  });

  it('is deterministic per (key, network)', async () => {
    const a = await deriveIpnsName(PK, 'testnet2');
    const b = await deriveIpnsName(PK, 'testnet2');
    expect(a).toBe(b);
  });

  it('no-network (legacy) is deterministic and differs from any network-scoped name', async () => {
    const legacy = await deriveIpnsName(PK);
    const legacy2 = await deriveIpnsName(PK);
    const scoped = await deriveIpnsName(PK, 'testnet2');
    expect(legacy).toBe(legacy2);
    expect(legacy).not.toBe(scoped);
  });
});
