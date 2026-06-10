/**
 * VENDORED (test-only) from @unicitylabs/state-transition-sdk v2
 * tests/functional/TestAggregatorClient.ts. The v2 npm package ships only lib/,
 * not its test helpers, so this in-memory aggregator is copied verbatim with
 * imports re-pointed at the installed lib/ (and the two fixtures to ./). It
 * orchestrates installed SDK classes — a faithful relocation, not reimplemented
 * logic. Lets the engine's contract suite run the REAL adapter without a live
 * aggregator. Keep in sync with upstream.
 */

import { RootTrustBase } from '@unicitylabs/state-transition-sdk/lib/api/bft/RootTrustBase.js';
import { CertificationData } from '@unicitylabs/state-transition-sdk/lib/api/CertificationData.js';
import {
  CertificationResponse,
  CertificationStatus,
} from '@unicitylabs/state-transition-sdk/lib/api/CertificationResponse.js';
import { IAggregatorClient } from '@unicitylabs/state-transition-sdk/lib/api/IAggregatorClient.js';
import { InclusionCertificate } from '@unicitylabs/state-transition-sdk/lib/api/InclusionCertificate.js';
import { InclusionProof } from '@unicitylabs/state-transition-sdk/lib/api/InclusionProof.js';
import { InclusionProofResponse } from '@unicitylabs/state-transition-sdk/lib/api/InclusionProofResponse.js';
import { StateId } from '@unicitylabs/state-transition-sdk/lib/api/StateId.js';
import { DataHasher } from '@unicitylabs/state-transition-sdk/lib/crypto/hash/DataHasher.js';
import { DataHasherFactory } from '@unicitylabs/state-transition-sdk/lib/crypto/hash/DataHasherFactory.js';
import { HashAlgorithm } from '@unicitylabs/state-transition-sdk/lib/crypto/hash/HashAlgorithm.js';
import { SigningService } from '@unicitylabs/state-transition-sdk/lib/crypto/secp256k1/SigningService.js';
import { PredicateVerifierService } from '@unicitylabs/state-transition-sdk/lib/predicate/verification/PredicateVerifierService.js';
import { SparseMerkleTree } from '@unicitylabs/state-transition-sdk/lib/smt/radix/SparseMerkleTree.js';
import { BitString } from '@unicitylabs/state-transition-sdk/lib/util/BitString.js';
import { VerificationStatus } from '@unicitylabs/state-transition-sdk/lib/verification/VerificationStatus.js';

import { createRootTrustBase } from './RootTrustBaseFixture';
import { createUnicityCertificate } from './UnicityCertificateFixture';

/**
 * Test aggregator client implementation that stores all submitted certification requests in memory.
 */
export class TestAggregatorClient implements IAggregatorClient {
  public readonly rootTrustBase: RootTrustBase;
  private readonly predicateVerifier: PredicateVerifierService;
  private readonly requests: Map<bigint, CertificationData> = new Map();

  private constructor(
    private readonly smt: SparseMerkleTree,
    private readonly signingService: SigningService,
  ) {
    this.rootTrustBase = createRootTrustBase(this.signingService.publicKey);
    this.predicateVerifier = PredicateVerifierService.create();
  }

  /**
   * Creates a new TestAggregatorClient instance with optional private key.
   * If no private key is provided, a new one is generated.
   */
  public static create(privateKey: Uint8Array = SigningService.generatePrivateKey()): TestAggregatorClient {
    return new TestAggregatorClient(
      new SparseMerkleTree(new DataHasherFactory(HashAlgorithm.SHA256, DataHasher)),
      new SigningService(privateKey),
    );
  }

  /**
   * @inheritDoc
   */
  public async getInclusionProof(stateId: StateId): Promise<InclusionProofResponse> {
    const path = BitString.fromBytesReversedLSB(stateId.data).toBigInt();
    const root = await this.smt.calculateRoot();

    if (!this.requests.has(path)) {
      return Promise.resolve(
        new InclusionProofResponse(
          1n,
          new InclusionProof(null, null, await createUnicityCertificate(root.hash, this.signingService)),
        ),
      );
    }

    const certificationData = this.requests.get(path);

    return Promise.resolve(
      new InclusionProofResponse(
        1n,
        new InclusionProof(
          certificationData ?? null,
          InclusionCertificate.create(root, stateId.data),
          await createUnicityCertificate(root.hash, this.signingService),
        ),
      ),
    );
  }

  /**
   * @inheritDoc
   */
  public async submitCertificationRequest(certificationData: CertificationData): Promise<CertificationResponse> {
    const stateId = await StateId.fromCertificationData(certificationData);

    const result = await this.predicateVerifier.verify(
      certificationData.lockScript,
      certificationData.sourceStateHash,
      certificationData.transactionHash,
      certificationData.unlockScript,
    );

    if (result.status !== VerificationStatus.OK) {
      return CertificationResponse.create(CertificationStatus.SIGNATURE_VERIFICATION_FAILED);
    }

    const path = BitString.fromBytesReversedLSB(stateId.data).toBigInt();
    if (!this.requests.has(path)) {
      const leafValue = certificationData.transactionHash;
      await this.smt.addLeaf(stateId.data, leafValue.data);
      this.requests.set(path, certificationData);
    }

    return CertificationResponse.create(CertificationStatus.SUCCESS);
  }
}
