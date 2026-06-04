/**
 * token-engine/token-blob.ts — storage/transport codec for a wallet token.
 *
 * A {@link TokenBlob} is `{ v, network, token }` where `token` is the v2
 * `Token.toCBOR()` bytes. This codec wraps it in a sphere-private CBOR envelope
 * so the wallet's own storage format can version independently of the SDK's
 * token CBOR. The decoded value is re-derivable from `token`, so it is NOT
 * stored here.
 */

import { CborDeserializer, CborError, CborSerializer } from './sdk';
import type { TokenBlob } from './types';

/** Sphere-private CBOR tag (distinct from SpherePaymentData's 39050). */
const TOKEN_BLOB_TAG = 39051n;
/** Current blob envelope version. */
export const TOKEN_BLOB_VERSION = 1;

/** Encode a blob as `tag(39051)[ v, network, token ]`. */
export function encodeTokenBlob(blob: TokenBlob): Uint8Array {
  return CborSerializer.encodeTag(
    TOKEN_BLOB_TAG,
    CborSerializer.encodeArray(
      CborSerializer.encodeUnsignedInteger(BigInt(blob.v)),
      CborSerializer.encodeUnsignedInteger(BigInt(blob.network)),
      CborSerializer.encodeByteString(blob.token),
    ),
  );
}

/** Decode a blob produced by {@link encodeTokenBlob}. */
export function decodeTokenBlob(bytes: Uint8Array): TokenBlob {
  const tag = CborDeserializer.decodeTag(bytes);
  if (tag.tag !== TOKEN_BLOB_TAG) {
    throw new CborError(`Invalid TokenBlob tag: ${tag.tag}`);
  }
  const fields = CborDeserializer.decodeArray(tag.data, 3);
  const v = Number(CborDeserializer.decodeUnsignedInteger(fields[0]));
  if (v !== TOKEN_BLOB_VERSION) {
    throw new CborError(`Unsupported TokenBlob version: ${v}`);
  }
  return {
    v,
    network: Number(CborDeserializer.decodeUnsignedInteger(fields[1])),
    token: CborDeserializer.decodeByteString(fields[2]),
  };
}
