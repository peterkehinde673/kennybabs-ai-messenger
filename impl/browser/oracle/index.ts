/**
 * Browser Oracle Exports
 * Re-exports shared oracle with browser-specific TrustBaseLoader
 */

import {
  UnicityAggregatorProvider,
  type UnicityAggregatorProviderConfig,
} from '../../../oracle/UnicityAggregatorProvider';
import type { TrustBaseLoader } from '../../../oracle/oracle-provider';
import { BaseTrustBaseLoader } from '../../shared/trustbase-loader';
import type { NetworkType } from '../../../constants';
import { SphereError } from '../../../core/errors';

// Re-export shared types and classes
export {
  UnicityAggregatorProvider,
  type UnicityAggregatorProviderConfig,
  UnicityOracleProvider,
  type UnicityOracleProviderConfig,
} from '../../../oracle/UnicityAggregatorProvider';

export type { TrustBaseLoader } from '../../../oracle/oracle-provider';

// =============================================================================
// Browser TrustBase Loader
// =============================================================================

/**
 * Browser TrustBase loader - fetches from URL or uses embedded data
 */
export class BrowserTrustBaseLoader extends BaseTrustBaseLoader {
  private url?: string;

  /**
   * @param networkOrUrl - a NetworkType, or a URL to fetch the trust base from
   * @param fallbackNetwork - network used for the embedded fallback when a URL is
   *   supplied (and the fetch fails). Required when networkOrUrl is a URL — we must
   *   never silently fall back to testnet on a different network.
   */
  constructor(networkOrUrl?: NetworkType | string, fallbackNetwork?: NetworkType) {
    if (!networkOrUrl) {
      throw new SphereError('BrowserTrustBaseLoader: network or trustBaseUrl is required.', 'INVALID_CONFIG');
    }
    if (networkOrUrl.startsWith('/') || networkOrUrl.startsWith('http')) {
      if (!fallbackNetwork) {
        throw new SphereError(
          'BrowserTrustBaseLoader: fallbackNetwork is required when a trustBaseUrl is supplied.',
          'INVALID_CONFIG',
        );
      }
      super(fallbackNetwork);
      this.url = networkOrUrl;
    } else {
      super(networkOrUrl as NetworkType);
    }
  }

  protected async loadFromExternal(): Promise<unknown | null> {
    if (!this.url) return null;

    try {
      const response = await fetch(this.url);
      if (response.ok) {
        return await response.json();
      }
    } catch {
      // Fall through to embedded
    }
    return null;
  }
}

/**
 * Create browser TrustBase loader
 */
export function createBrowserTrustBaseLoader(
  networkOrUrl?: NetworkType | string,
  fallbackNetwork?: NetworkType,
): TrustBaseLoader {
  return new BrowserTrustBaseLoader(networkOrUrl, fallbackNetwork);
}

// =============================================================================
// Browser Factory
// =============================================================================

/**
 * Create UnicityAggregatorProvider with browser TrustBase loader
 */
export function createUnicityAggregatorProvider(
  config: Omit<UnicityAggregatorProviderConfig, 'trustBaseLoader'> & {
    trustBaseUrl?: string;
    network?: NetworkType;
  }
): UnicityAggregatorProvider {
  const { trustBaseUrl, network, ...restConfig } = config;
  // Fail loud: without a network we cannot pick the right embedded trust base.
  if (!trustBaseUrl && !network) {
    throw new SphereError(
      'createUnicityAggregatorProvider: network or trustBaseUrl required.',
      'INVALID_CONFIG',
    );
  }
  return new UnicityAggregatorProvider({
    ...restConfig,
    // When a URL is supplied, `network` (if any) is the embedded-fallback network.
    trustBaseLoader: createBrowserTrustBaseLoader(trustBaseUrl ?? network, network),
  });
}

/** @deprecated Use createUnicityAggregatorProvider instead */
export const createUnicityOracleProvider = createUnicityAggregatorProvider;
