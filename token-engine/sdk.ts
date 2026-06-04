/**
 * token-engine/sdk.ts — the SINGLE place that imports @unicitylabs/state-transition-sdk (v2).
 *
 * During the migration the v2 SDK is installed under the npm alias `state-transition-sdk-v2`
 * (see package.json; v1 stays as `@unicitylabs/state-transition-sdk` for not-yet-migrated callers).
 * At the final cut-over, replace `state-transition-sdk-v2/lib/...` here with the canonical
 * `@unicitylabs/state-transition-sdk/lib/...` — this is the ONLY file that needs editing.
 *
 * Everything else in token-engine/ imports SDK symbols from `./sdk`, never from the package directly.
 * ESLint `no-restricted-imports` forbids importing the SDK anywhere except this file.
 *
 * Import path note (fixed in SDK b20e560): subpaths are `…/lib/<path>.js` (no `/src/`); no root barrel.
 */

// ── client / aggregator / proof / network / trust base ──────────────────────
export { StateTransitionClient } from 'state-transition-sdk-v2/lib/StateTransitionClient.js';
export { AggregatorClient } from 'state-transition-sdk-v2/lib/api/AggregatorClient.js';
export type { IAggregatorClient } from 'state-transition-sdk-v2/lib/api/IAggregatorClient.js';
export { NetworkId } from 'state-transition-sdk-v2/lib/api/NetworkId.js';
export { CertificationData } from 'state-transition-sdk-v2/lib/api/CertificationData.js';
export { CertificationResponse, CertificationStatus } from 'state-transition-sdk-v2/lib/api/CertificationResponse.js';
export { StateId } from 'state-transition-sdk-v2/lib/api/StateId.js';
export { InclusionProof } from 'state-transition-sdk-v2/lib/api/InclusionProof.js';
export { InclusionProofResponse } from 'state-transition-sdk-v2/lib/api/InclusionProofResponse.js';
export { RootTrustBase } from 'state-transition-sdk-v2/lib/api/bft/RootTrustBase.js';
export { waitInclusionProof } from 'state-transition-sdk-v2/lib/util/InclusionProofUtils.js';

// ── token / transactions ────────────────────────────────────────────────────
export { Token } from 'state-transition-sdk-v2/lib/transaction/Token.js';
export { MintTransaction } from 'state-transition-sdk-v2/lib/transaction/MintTransaction.js';
export { TransferTransaction } from 'state-transition-sdk-v2/lib/transaction/TransferTransaction.js';
export { CertifiedMintTransaction } from 'state-transition-sdk-v2/lib/transaction/CertifiedMintTransaction.js';
export { CertifiedTransferTransaction } from 'state-transition-sdk-v2/lib/transaction/CertifiedTransferTransaction.js';
export { TokenId } from 'state-transition-sdk-v2/lib/transaction/TokenId.js';
export { TokenType } from 'state-transition-sdk-v2/lib/transaction/TokenType.js';
export { TokenSalt } from 'state-transition-sdk-v2/lib/transaction/TokenSalt.js';
export type { ITransaction } from 'state-transition-sdk-v2/lib/transaction/ITransaction.js';
export { MintJustificationVerifierService } from 'state-transition-sdk-v2/lib/transaction/verification/MintJustificationVerifierService.js';

// ── predicates / unlock scripts ─────────────────────────────────────────────
export type { IPredicate } from 'state-transition-sdk-v2/lib/predicate/IPredicate.js';
export type { IUnlockScript } from 'state-transition-sdk-v2/lib/predicate/IUnlockScript.js';
export { EncodedPredicate } from 'state-transition-sdk-v2/lib/predicate/EncodedPredicate.js';
export { SignaturePredicate } from 'state-transition-sdk-v2/lib/predicate/builtin/SignaturePredicate.js';
export { SignaturePredicateUnlockScript } from 'state-transition-sdk-v2/lib/predicate/builtin/SignaturePredicateUnlockScript.js';
export { BurnPredicate } from 'state-transition-sdk-v2/lib/predicate/builtin/BurnPredicate.js';
export { PredicateVerifierService } from 'state-transition-sdk-v2/lib/predicate/verification/PredicateVerifierService.js';

// ── crypto / hashing ────────────────────────────────────────────────────────
export { SigningService } from 'state-transition-sdk-v2/lib/crypto/secp256k1/SigningService.js';
export { Signature } from 'state-transition-sdk-v2/lib/crypto/secp256k1/Signature.js';
export { MintSigningService } from 'state-transition-sdk-v2/lib/crypto/MintSigningService.js';
export { HashAlgorithm } from 'state-transition-sdk-v2/lib/crypto/hash/HashAlgorithm.js';
export { DataHash } from 'state-transition-sdk-v2/lib/crypto/hash/DataHash.js';
export { DataHasher } from 'state-transition-sdk-v2/lib/crypto/hash/DataHasher.js';
export { DataHasherFactory } from 'state-transition-sdk-v2/lib/crypto/hash/DataHasherFactory.js';

// ── CBOR serialization ──────────────────────────────────────────────────────
export { CborSerializer } from 'state-transition-sdk-v2/lib/serialization/cbor/CborSerializer.js';
export { CborDeserializer } from 'state-transition-sdk-v2/lib/serialization/cbor/CborDeserializer.js';
export { CborError } from 'state-transition-sdk-v2/lib/serialization/cbor/CborError.js';

// ── payment / value / split ─────────────────────────────────────────────────
export type { IPaymentData } from 'state-transition-sdk-v2/lib/payment/IPaymentData.js';
export { Asset } from 'state-transition-sdk-v2/lib/payment/asset/Asset.js';
export { AssetId } from 'state-transition-sdk-v2/lib/payment/asset/AssetId.js';
export { PaymentAssetCollection } from 'state-transition-sdk-v2/lib/payment/asset/PaymentAssetCollection.js';
export { TokenSplit } from 'state-transition-sdk-v2/lib/payment/TokenSplit.js';
export { SplitTokenRequest } from 'state-transition-sdk-v2/lib/payment/SplitTokenRequest.js';
export { SplitToken } from 'state-transition-sdk-v2/lib/payment/SplitToken.js';
export { SplitAssetProof } from 'state-transition-sdk-v2/lib/payment/SplitAssetProof.js';
export { SplitMintJustification } from 'state-transition-sdk-v2/lib/payment/SplitMintJustification.js';
export { SplitMintJustificationVerifier } from 'state-transition-sdk-v2/lib/payment/SplitMintJustificationVerifier.js';

// ── verification result types ───────────────────────────────────────────────
export { VerificationStatus } from 'state-transition-sdk-v2/lib/verification/VerificationStatus.js';
export { VerificationResult } from 'state-transition-sdk-v2/lib/verification/VerificationResult.js';

// ── util ────────────────────────────────────────────────────────────────────
export { HexConverter } from 'state-transition-sdk-v2/lib/util/HexConverter.js';
export { BigintConverter } from 'state-transition-sdk-v2/lib/util/BigintConverter.js';
export { BitString } from 'state-transition-sdk-v2/lib/util/BitString.js';
