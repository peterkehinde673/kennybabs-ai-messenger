/**
 * A5 — v2 token blob storage round-trip.
 *
 * v2 tokens persist as an opaque hex CBOR blob in `sdkData` (not the v1 JSON TXF).
 * These tests pin that build → parse round-trips a v2 token. (RED before A5: the
 * legacy build path JSON.parses sdkData and silently drops v2 tokens.)
 */

import { describe, expect, it } from 'vitest';

import { bytesToHex } from '../../../core/crypto';
import { buildTxfStorageData, parseTxfStorageData } from '../../../serialization/txf-serializer';
import { encodeTokenBlob } from '../../../token-engine/token-blob';
import type { Token } from '../../../types';
import { createTestEngine } from '../token-engine/test-engine';

const COIN = 'a'.repeat(64);
const META = { version: 1, address: 'DIRECT://test', ipnsName: 'k51-test' };

async function makeV2Token(amount = 100n): Promise<Token> {
  const engine = createTestEngine();
  const sphereToken = await engine.mint({
    recipientPubkey: engine.getIdentity().chainPubkey,
    value: { assets: [{ coinId: COIN, amount }] },
  });
  const sdkData = bytesToHex(encodeTokenBlob(engine.encodeToken(sphereToken)));
  return {
    id: `v2_${engine.tokenId(sphereToken)}`,
    coinId: COIN,
    symbol: 'TST',
    name: 'Test',
    decimals: 8,
    amount: amount.toString(),
    status: 'confirmed',
    createdAt: 1,
    updatedAt: 1,
    sdkData,
  };
}

describe('TXF storage — v2 token blob round-trip', () => {
  it('persists and restores a v2 token through build/parse', async () => {
    const token = await makeV2Token();
    const doc = await buildTxfStorageData([token], META);
    const parsed = parseTxfStorageData(doc);

    expect(parsed.tokens).toHaveLength(1);
    expect(parsed.tokens[0].sdkData).toBe(token.sdkData);
    expect(parsed.tokens[0].coinId).toBe(COIN);
    expect(parsed.tokens[0].amount).toBe('100');
  });

  it('round-trips multiple v2 tokens', async () => {
    const a = await makeV2Token(10n);
    const b = await makeV2Token(20n);
    const doc = await buildTxfStorageData([a, b], META);
    const parsed = parseTxfStorageData(doc);

    expect(parsed.tokens).toHaveLength(2);
    expect(new Set(parsed.tokens.map((t) => t.sdkData))).toEqual(new Set([a.sdkData, b.sdkData]));
  });
});
