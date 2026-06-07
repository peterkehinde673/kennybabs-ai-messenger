/**
 * Token key extraction — dual-format (B1, path B).
 *
 * extractTokenIdFromSdkData / extractStateHashFromSdkData / extractTokenStateKey
 * accept BOTH the legacy v1 TXF JSON and the v2 engine blob (hex of CBOR(TokenBlob)).
 * The blob self-describes its keys — tokenId is carried on the blob and the
 * per-state hash is SHA-256 of the token bytes — so no engine is needed to
 * extract them (tombstones / dedup / spent-tracking work on blobs directly).
 */
import { describe, it, expect } from 'vitest';
import {
  extractTokenIdFromSdkData,
  extractStateHashFromSdkData,
  extractTokenStateKey,
  createTokenStateKey,
} from '../../../modules/payments/PaymentsModule';
import { FakeTokenEngine } from '../token-engine/FakeTokenEngine';
import { encodeTokenBlob } from '../../../token-engine/token-blob';
import { bytesToHex, sha256 } from '../../../core/crypto';
import type { Token } from '../../../types';

const PUBKEY = new Uint8Array([0x02, ...new Array<number>(32).fill(9)]); // 33 bytes
const UCT = '11'.repeat(32); // v2 coin ids are lowercase hex

async function blobToken(
  fake: FakeTokenEngine,
  amount: bigint,
): Promise<{ sdkData: string; tokenId: string; token: Uint8Array }> {
  const st = await fake.mint({ recipientPubkey: PUBKEY, value: { assets: [{ coinId: UCT, amount }] } });
  const blob = fake.encodeToken(st);
  return { sdkData: bytesToHex(encodeTokenBlob(blob)), tokenId: blob.tokenId, token: blob.token };
}

function uiToken(sdkData: string): Token {
  return {
    id: 'x', coinId: UCT, symbol: 'UCT', name: 'n', decimals: 0,
    amount: '100', status: 'confirmed', createdAt: 0, updatedAt: 0, sdkData,
  };
}

describe('token key extraction — v2 engine blob (B1)', () => {
  it('extractTokenIdFromSdkData reads the genesis-stable id off the blob', async () => {
    const fake = new FakeTokenEngine();
    const { sdkData, tokenId } = await blobToken(fake, 100n);
    expect(extractTokenIdFromSdkData(sdkData)).toBe(tokenId);
    expect(tokenId).toMatch(/^[0-9a-f]{64}$/);
  });

  it('extractStateHashFromSdkData is the SHA-256 of the token bytes', async () => {
    const fake = new FakeTokenEngine();
    const { sdkData, token } = await blobToken(fake, 100n);
    expect(extractStateHashFromSdkData(sdkData)).toBe(sha256(bytesToHex(token), 'hex'));
  });

  it('extractTokenStateKey composes tokenId_stateHash for a blob token', async () => {
    const fake = new FakeTokenEngine();
    const { sdkData, tokenId, token } = await blobToken(fake, 100n);
    expect(extractTokenStateKey(uiToken(sdkData))).toBe(
      createTokenStateKey(tokenId, sha256(bytesToHex(token), 'hex')),
    );
  });

  it('distinct token states yield distinct keys (per-state hash changes on transfer)', async () => {
    const fake = new FakeTokenEngine();
    const a = await blobToken(fake, 100n);
    const b = await blobToken(fake, 100n);
    // different mints → different stateId bytes → different keys
    expect(extractTokenStateKey(uiToken(a.sdkData))).not.toBe(extractTokenStateKey(uiToken(b.sdkData)));
  });

  it('still extracts the genesis tokenId from legacy v1 TXF JSON', () => {
    const txf = JSON.stringify({ genesis: { data: { tokenId: 'abc123' } }, state: { hash: 'deadbeef' } });
    expect(extractTokenIdFromSdkData(txf)).toBe('abc123');
    expect(typeof extractStateHashFromSdkData(txf)).toBe('string');
  });
});
