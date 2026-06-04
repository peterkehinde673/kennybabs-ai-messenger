/**
 * VENDORED (test-only) from @unicitylabs/state-transition-sdk v2
 * tests/utils/RootTrustBaseFixture.ts. The v2 npm package ships only lib/, not
 * its test helpers, so this is copied verbatim with imports re-pointed at the
 * installed lib/ — a faithful relocation, not reimplemented logic. It only
 * orchestrates installed SDK classes. Keep in sync with upstream.
 */

import { RootTrustBase } from 'state-transition-sdk-v2/lib/api/bft/RootTrustBase.js';
import { NetworkId } from 'state-transition-sdk-v2/lib/api/NetworkId.js';
import { HexConverter } from 'state-transition-sdk-v2/lib/util/HexConverter.js';

export function createRootTrustBase(publicKey: Uint8Array): RootTrustBase {
  return RootTrustBase.fromJSON({
    changeRecordHash: null,
    epoch: '0',
    epochStartRound: '0',
    networkId: NetworkId.LOCAL.id,
    previousEntryHash: null,
    quorumThreshold: '1',
    rootNodes: [
      {
        nodeId: 'NODE',
        sigKey: HexConverter.encode(publicKey),
        stake: '1',
      },
    ],
    signatures: {},
    stateHash: '00',
    version: '0',
  });
}
