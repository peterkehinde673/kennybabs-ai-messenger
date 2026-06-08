import { describe, it, expect } from 'vitest';
import { getNetworkConfig } from '../../../../impl/shared/resolvers';
import { getEmbeddedTrustBase } from '../../../../impl/shared/trustbase-loader';

describe('testnet2 network preset', () => {
  it('NETWORKS.testnet2 points at the testnet2 gateway + registry', () => {
    const cfg = getNetworkConfig('testnet2');
    expect(cfg.aggregatorUrl).toBe('https://gateway.testnet2.unicity.network');
    expect(cfg.tokenRegistryUrl).toContain('unicity-ids.testnet2.json');
  });

  it('embeds a testnet2 trust base with networkId 4', () => {
    const tb = getEmbeddedTrustBase('testnet2') as { networkId?: number } | null;
    expect(tb).not.toBeNull();
    expect(tb?.networkId).toBe(4);
  });
});
