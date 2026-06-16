/**
 * Node.js Oracle Exports
 * Re-exports shared oracle with Node.js-specific TrustBaseLoader
 */

import * as fs from 'fs';
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
// Node.js TrustBase Loader
// =============================================================================

/**
 * Node.js TrustBase loader - loads from file or uses embedded data
 */
export class NodeTrustBaseLoader extends BaseTrustBaseLoader {
  private filePath?: string;

  /**
   * @param filePathOrNetwork - a NetworkType, or a file path to load the trust base from
   * @param fallbackNetwork - network used for the embedded fallback when a file path is
   *   supplied (and the file is missing/unreadable). Required when filePathOrNetwork is a
   *   path — we must never silently fall back to testnet on a different network.
   */
  constructor(filePathOrNetwork?: string | NetworkType, fallbackNetwork?: NetworkType) {
    if (!filePathOrNetwork) {
      throw new SphereError('NodeTrustBaseLoader: network or trustBasePath is required.', 'INVALID_CONFIG');
    } else if (filePathOrNetwork.includes('/') || filePathOrNetwork.includes('.')) {
      if (!fallbackNetwork) {
        throw new SphereError(
          'NodeTrustBaseLoader: fallbackNetwork is required when a trustBasePath is supplied.',
          'INVALID_CONFIG',
        );
      }
      super(fallbackNetwork);
      this.filePath = filePathOrNetwork;
    } else {
      super(filePathOrNetwork as NetworkType);
    }
  }

  protected async loadFromExternal(): Promise<unknown | null> {
    if (!this.filePath) return null;

    try {
      if (fs.existsSync(this.filePath)) {
        const content = fs.readFileSync(this.filePath, 'utf-8');
        return JSON.parse(content);
      }
    } catch {
      // Fall through to embedded
    }
    return null;
  }
}

/**
 * Create Node.js TrustBase loader
 */
export function createNodeTrustBaseLoader(
  filePathOrNetwork?: string | NetworkType,
  fallbackNetwork?: NetworkType,
): TrustBaseLoader {
  return new NodeTrustBaseLoader(filePathOrNetwork, fallbackNetwork);
}

// =============================================================================
// Node.js Factory
// =============================================================================

/**
 * Create UnicityAggregatorProvider with Node.js TrustBase loader
 */
export function createUnicityAggregatorProvider(
  config: Omit<UnicityAggregatorProviderConfig, 'trustBaseLoader'> & {
    trustBasePath?: string;
    network?: NetworkType;
  }
): UnicityAggregatorProvider {
  const { trustBasePath, network, ...restConfig } = config;
  // Fail loud: without a network we cannot pick the right embedded trust base.
  if (!trustBasePath && !network) {
    throw new SphereError(
      'createUnicityAggregatorProvider: network or trustBaseUrl required.',
      'INVALID_CONFIG',
    );
  }
  return new UnicityAggregatorProvider({
    ...restConfig,
    // When a path is supplied, `network` (if any) is the embedded-fallback network.
    trustBaseLoader: createNodeTrustBaseLoader(trustBasePath ?? network, network),
  });
}

/** @deprecated Use createUnicityAggregatorProvider instead */
export const createUnicityOracleProvider = createUnicityAggregatorProvider;
