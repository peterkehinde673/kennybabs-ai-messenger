/**
 * createInvoice — v2 engine path (B2, path B).
 *
 * An invoice IS a data token: when a tokenEngine is injected, createInvoice mints
 * it via engine.mintDataToken (one call replacing the hand-rolled v1 mint) and
 * the invoice id is the engine's genesis-stable tokenId (64-char). Clean harness
 * (no SDK vi.mock) so FakeTokenEngine runs unmocked.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi } from 'vitest';
import { createTestAccountingModule, createTestInvoice } from './accounting-test-helpers.js';
import { FakeTokenEngine } from '../token-engine/FakeTokenEngine';
import { decodeTokenBlob } from '../../../token-engine/token-blob';
import { hexToBytes } from '../../../core/crypto';
import { INVOICE_TOKEN_TYPE_HEX } from '../../../constants';

function setup() {
  const engine = new FakeTokenEngine();
  const { module, mocks } = createTestAccountingModule({ tokenEngine: engine });
  // addToken is not part of the base mock — add it (mirrors createInvoice.test.ts).
  (mocks.payments as any).addToken = vi.fn().mockResolvedValue(undefined);
  return { module, mocks, engine };
}

describe('createInvoice — v2 engine path (B2)', () => {
  it('mints the invoice as a data token and stores the blob (64-char engine id)', async () => {
    const { module, mocks, engine } = setup();

    const result = await module.createInvoice(createTestInvoice());

    expect(result.success).toBe(true);
    expect(result.invoiceId).toMatch(/^[0-9a-f]{64}$/);

    // Stored via payments.addToken with the engine blob as sdkData + INVOICE coinId.
    const added = (mocks.payments as any).addToken.mock.calls.at(-1)[0];
    expect(added.id).toBe(result.invoiceId);
    expect(added.coinId).toBe(INVOICE_TOKEN_TYPE_HEX);

    // sdkData is the engine blob; its genesis-stable tokenId === the invoice id.
    const blob = decodeTokenBlob(hexToBytes(added.sdkData));
    expect(blob.tokenId).toBe(result.invoiceId);

    // mintDataToken was used (not a value mint) — the engine actually produced it.
    const token = await engine.decodeToken(blob);
    expect(engine.readValue(token)).toBeNull();          // value-less ⇒ data token
    expect(engine.readTokenData(token)).not.toBeNull();  // carries the invoice terms
  });

  it('reports the same invoice id it stored', async () => {
    const { module, mocks } = setup();
    const result = await module.createInvoice(createTestInvoice({ memo: 'order #42' }));
    const added = (mocks.payments as any).addToken.mock.calls.at(-1)[0];
    expect(added.id).toBe(result.invoiceId);
    expect(result.token).toBeDefined();
  });
});
