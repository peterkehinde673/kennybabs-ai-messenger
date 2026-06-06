import { describe, expect, it } from 'vitest';

import { runEngineContract } from './engine-contract';
import { FakeTokenEngine } from './FakeTokenEngine';

// The fake must satisfy the shared port contract.
runEngineContract('FakeTokenEngine', () => new FakeTokenEngine({ chainPubkey: new Uint8Array(33).fill(0x02) }));

// Fake-specific guarantees beyond the shared contract.
describe('FakeTokenEngine specifics', () => {
  const COIN = 'd'.repeat(64);
  const PK = new Uint8Array(33).fill(0x07);

  it('double-spend of the same source throws', async () => {
    const e = new FakeTokenEngine();
    const t = await e.mint({ recipientPubkey: PK, value: { assets: [{ coinId: COIN, amount: 10n }] } });
    await e.transfer({ token: t, recipientPubkey: PK });
    await expect(e.transfer({ token: t, recipientPubkey: PK })).rejects.toThrow(/already spent/);
  });

  it('getIdentity reflects the configured pubkey and is copied (not aliased)', () => {
    const pubkey = new Uint8Array(33).fill(0x09);
    const e = new FakeTokenEngine({ chainPubkey: pubkey });
    const got = e.getIdentity().chainPubkey;
    expect(got).toEqual(pubkey);
    got[0] = 0xff; // mutating the returned copy must not affect the engine
    expect(e.getIdentity().chainPubkey[0]).toBe(0x09);
  });

  it('mints a value-less token when no value is given (value === null, like the real engine)', async () => {
    const e = new FakeTokenEngine();
    const t = await e.mint({ recipientPubkey: PK });
    expect(e.readValue(t)).toBeNull();
    expect(e.balanceOf(t, COIN)).toBe(0n);
  });
});
