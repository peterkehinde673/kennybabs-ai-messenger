/**
 * token-engine/payment-data.ts — the sphere value model.
 *
 * v2 `Token` carries no coins; value is app-defined and stored in
 * `MintTransaction.data`. `SpherePaymentData` is that payload: it implements the
 * SDK's `IPaymentData` (so `TokenSplit` can read it for value conservation) and
 * encodes a `PaymentAssetCollection` inside a versioned, tagged CBOR envelope.
 *
 * The SDK never inspects our raw bytes — it only calls `decodePaymentData(data)`
 * and reads `.assets` — so the envelope (tag + version) is ours, chosen for
 * forward-compatible storage. `fromValue`/`toValue` bridge sphere-domain values
 * (hex coin id + bigint amount) to/from the SDK asset collection.
 */

import {
  Asset,
  AssetId,
  CborDeserializer,
  CborError,
  CborSerializer,
  HexConverter,
  type IPaymentData,
  PaymentAssetCollection,
} from './sdk';
import type { CoinId, SphereValue } from './types';

export class SpherePaymentData implements IPaymentData {
  /** Sphere-private CBOR tag (verified free in the v2 SDK tag space). */
  public static readonly CBOR_TAG = 39050n;
  /** Envelope version; bump when the structure changes. */
  public static readonly VERSION = 1n;

  private constructor(public readonly assets: PaymentAssetCollection) {}

  /** Wrap an existing SDK asset collection. */
  public static create(assets: PaymentAssetCollection): SpherePaymentData {
    return new SpherePaymentData(assets);
  }

  /** Build from a sphere-domain value (hex coin id → bigint amount). */
  public static fromValue(value: SphereValue): SpherePaymentData {
    const assets = value.assets.map(
      (a) => new Asset(new AssetId(HexConverter.decode(a.coinId)), a.amount),
    );
    return new SpherePaymentData(PaymentAssetCollection.create(...assets));
  }

  /** Decode from the CBOR envelope produced by {@link encode}. */
  public static fromCBOR(bytes: Uint8Array): SpherePaymentData {
    const tag = CborDeserializer.decodeTag(bytes);
    if (tag.tag !== SpherePaymentData.CBOR_TAG) {
      throw new CborError(`Invalid SpherePaymentData tag: ${tag.tag}`);
    }
    const fields = CborDeserializer.decodeArray(tag.data, 2);
    const version = CborDeserializer.decodeUnsignedInteger(fields[0]);
    if (version !== SpherePaymentData.VERSION) {
      throw new CborError(`Unsupported SpherePaymentData version: ${version}`);
    }
    return new SpherePaymentData(PaymentAssetCollection.fromCBOR(fields[1]));
  }

  /** Deterministic, versioned, tagged CBOR: `tag(39050)[ version, assets ]`. */
  public encode(): Promise<Uint8Array> {
    return Promise.resolve(
      CborSerializer.encodeTag(
        SpherePaymentData.CBOR_TAG,
        CborSerializer.encodeArray(
          CborSerializer.encodeUnsignedInteger(SpherePaymentData.VERSION),
          this.assets.toCBOR(),
        ),
      ),
    );
  }

  /** Project to a sphere-domain value (hex coin id + bigint amount), preserving order. */
  public toValue(): SphereValue {
    return {
      assets: this.assets.toArray().map((a) => ({
        coinId: HexConverter.encode(a.id.bytes) as CoinId,
        amount: a.value,
      })),
    };
  }

  /** Balance of a single coin within this payload (0n when absent). */
  public balanceOf(coinId: CoinId): bigint {
    const asset = this.assets.get(new AssetId(HexConverter.decode(coinId)));
    return asset ? asset.value : 0n;
  }
}
