import { describe, it, expect } from 'vitest';

import { CborError, CborSerializer } from '../../../token-engine/sdk';
import { decodeTokenBlob, encodeTokenBlob, TOKEN_BLOB_VERSION } from '../../../token-engine/token-blob';
import type { TokenBlob } from '../../../token-engine/types';

describe('TokenBlob codec', () => {
  it('round-trips a blob through encode/decode', () => {
    const blob: TokenBlob = { v: TOKEN_BLOB_VERSION, network: 2, token: new Uint8Array([1, 2, 3, 4]) };
    expect(decodeTokenBlob(encodeTokenBlob(blob))).toEqual(blob);
  });

  it('preserves raw token bytes and network exactly', () => {
    const token = new Uint8Array([0, 255, 128, 7, 42]);
    const back = decodeTokenBlob(encodeTokenBlob({ v: TOKEN_BLOB_VERSION, network: 1, token }));
    expect(back.token).toEqual(token);
    expect(back.network).toBe(1);
  });

  it('rejects bytes with the wrong CBOR tag', () => {
    const wrong = CborSerializer.encodeTag(40000n, CborSerializer.encodeArray());
    expect(() => decodeTokenBlob(wrong)).toThrow(CborError);
  });

  it('rejects an unsupported version', () => {
    const future = CborSerializer.encodeTag(
      39051n,
      CborSerializer.encodeArray(
        CborSerializer.encodeUnsignedInteger(999n),
        CborSerializer.encodeUnsignedInteger(2n),
        CborSerializer.encodeByteString(new Uint8Array([1])),
      ),
    );
    expect(() => decodeTokenBlob(future)).toThrow(CborError);
  });
});
