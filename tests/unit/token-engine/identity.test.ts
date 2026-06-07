import { describe, expect, it } from 'vitest';

import { deriveDirectAddress } from '../../../token-engine/identity';

function hex(h: string): Uint8Array {
  const bytes = new Uint8Array(h.length / 2);
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(h.slice(i * 2, i * 2 + 2), 16);
  return bytes;
}

// GOLDEN VECTORS — lock the legacy DIRECT:// derivation byte-for-byte, recorded
// from the v1 UnmaskedPredicateReference path for fixed compressed secp256k1
// pubkeys (k = 1..5). Quest XP is keyed on this address (Path A); if it ever
// changes, users silently lose XP. At final v1 removal the vendored byte-exact
// recipe MUST still reproduce EVERY one of these (one vector is too weak to
// catch a subtly-wrong reimplementation).
const GOLDEN: ReadonlyArray<readonly [pubkey: string, address: string]> = [
  ['0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798', 'DIRECT://00001386dc2547e656f7041444e3ef3772f374305551724ef9fe86cf004a118d917dd4192a29'],
  ['02c6047f9441ed7d6d3045406e95c07cd85c778e4b8cef3ca7abac09b95c709ee5', 'DIRECT://00008c78a0ae2467f58cc704161707d0a830a5876dd7afc04c57f1118b4315b661d503a6b643'],
  ['02f9308a019258c31049344f85f89d5229b531c845836f99b08601f113bce036f9', 'DIRECT://0000fc62fc14511ed96fdbd081b73d6ac4188dd6d5ef995b43fb82ea45fcd75726af0e6a98cf'],
  ['02e493dbf1c10d80f3581e4904930b1404cc6c13900ee0758474fa94abe8c4cd13', 'DIRECT://00001f218f10059b25fe6dc244573fdf58e97d14c013d1c2a9285aaf15ee57bd586132586630'],
  ['022f8bde4d1a07209355b4a7250a5c5128e88b84bddc619ab7cba8d569b240efe4', 'DIRECT://000053984f8e9a7c56f94fae7ecd31c625f0602b9b5105d19edd9af7ca51f359c3205e93f43a'],
];

describe('deriveDirectAddress (legacy DIRECT:// — Path A)', () => {
  it.each(GOLDEN)('matches the golden vector for pubkey %s (XP-invariant lock)', async (pubkey, address) => {
    expect(await deriveDirectAddress(hex(pubkey))).toBe(address);
  });

  it('is deterministic (same pubkey → same address)', async () => {
    const pk = hex(GOLDEN[0][0]);
    expect(await deriveDirectAddress(pk)).toBe(await deriveDirectAddress(pk));
  });

  it('produces a DIRECT:// address', async () => {
    expect(await deriveDirectAddress(hex(GOLDEN[0][0]))).toMatch(/^DIRECT:\/\//);
  });

  it('different pubkeys → different addresses', async () => {
    expect(await deriveDirectAddress(hex(GOLDEN[0][0]))).not.toBe(await deriveDirectAddress(hex(GOLDEN[1][0])));
  });
});
