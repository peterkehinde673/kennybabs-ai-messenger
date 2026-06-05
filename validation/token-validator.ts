/**
 * Token Validation Service — engine-based (v2).
 *
 * A thin, platform-independent wrapper over `ITokenEngine`: structural validity
 * via `engine.verify`, spent-status via `engine.isSpent` (with a per-state TTL
 * cache). It operates on `SphereToken` — the v1 TXF / `RequestId` / direct
 * aggregator path is gone; the engine owns the aggregator and the trust base.
 *
 * NOTE: this is a standalone public utility and is NOT on the live wallet path
 * (payments validate via the oracle). It is migrated to the engine for
 * consistency and so callers never touch the SDK.
 */

import { logger } from '../core/logger';
import { bytesToHex, sha256 } from '../core/crypto';
import type { ITokenEngine, SphereToken } from '../token-engine';
import type { ValidationIssue, TokenValidationResult } from '../types/txf';

// =============================================================================
// Types
// =============================================================================

export type ValidationAction = 'ACCEPT' | 'RETRY_LATER' | 'DISCARD_FORK';

export interface ExtendedValidationResult extends TokenValidationResult {
  action?: ValidationAction;
}

/** Identifies a spent token by its per-state id (SHA-256 of the token's CBOR). */
export interface SpentTokenInfo {
  stateId: string;
}

export interface SpentTokenResult {
  spentTokens: SpentTokenInfo[];
  errors: string[];
}

export interface ValidationResult {
  validTokens: SphereToken[];
  issues: ValidationIssue[];
}

/**
 * Per-state id: SHA-256 over the token's CBOR. Deterministic and unique per
 * state (the CBOR includes the full transfer chain), so it changes with every
 * transfer — exactly the right key for a spent-status cache.
 */
function stateIdOf(token: SphereToken): string {
  return sha256(bytesToHex(token.blob.token), 'hex');
}

// =============================================================================
// Token Validator
// =============================================================================

export class TokenValidator {
  private readonly engine: ITokenEngine;

  // Spent-status cache: SPENT is permanent (immutable), UNSPENT expires after a TTL.
  private spentStateCache = new Map<string, { isSpent: boolean; timestamp: number }>();
  private readonly UNSPENT_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

  constructor(engine: ITokenEngine) {
    this.engine = engine;
  }

  // ===========================================================================
  // Public API
  // ===========================================================================

  /** Validate all tokens (parallel, with a batch limit). */
  async validateAllTokens(
    tokens: SphereToken[],
    options?: { batchSize?: number; onProgress?: (completed: number, total: number) => void },
  ): Promise<ValidationResult> {
    const validTokens: SphereToken[] = [];
    const issues: ValidationIssue[] = [];

    const batchSize = options?.batchSize ?? 5;
    const total = tokens.length;
    let completed = 0;

    for (let i = 0; i < tokens.length; i += batchSize) {
      const batch = tokens.slice(i, i + batchSize);

      const batchResults = await Promise.all(
        batch.map(async (token) => ({ token, result: await this.validateToken(token) })),
      );

      for (const { token, result } of batchResults) {
        completed++;
        if (result.isValid) {
          validTokens.push(token);
        } else {
          issues.push({
            tokenId: stateIdOf(token),
            reason: result.reason || 'Unknown validation error',
            recoverable: false,
          });
        }
      }

      options?.onProgress?.(completed, total);
    }

    return { validTokens, issues };
  }

  /** Validate a single token's structural integrity against the trust base. */
  async validateToken(token: SphereToken): Promise<TokenValidationResult> {
    const result = await this.engine.verify(token);
    return result.ok ? { isValid: true } : { isValid: false, reason: result.reason || 'Verification failed' };
  }

  /**
   * Whether a token's current state has been spent on the network. Cached:
   * SPENT permanently, UNSPENT for `UNSPENT_CACHE_TTL_MS`. Graceful — an engine
   * error is treated as unspent (and not cached).
   */
  async isSpent(token: SphereToken): Promise<boolean> {
    const key = stateIdOf(token);

    const cached = this.spentStateCache.get(key);
    if (cached) {
      if (cached.isSpent) return true; // SPENT is immutable
      if (Date.now() - cached.timestamp < this.UNSPENT_CACHE_TTL_MS) return false;
    }

    let spent: boolean;
    try {
      spent = await this.engine.isSpent(token);
    } catch (err) {
      logger.warn('Validation', 'Error checking spent status:', err);
      return false;
    }

    this.spentStateCache.set(key, { isSpent: spent, timestamp: Date.now() });
    return spent;
  }

  /** Check which of the given tokens are spent, returning them by per-state id. */
  async checkSpentTokens(
    tokens: SphereToken[],
    options?: { batchSize?: number; onProgress?: (completed: number, total: number) => void },
  ): Promise<SpentTokenResult> {
    const spentTokens: SpentTokenInfo[] = [];
    const errors: string[] = [];

    const batchSize = options?.batchSize ?? 3;
    const total = tokens.length;
    let completed = 0;

    for (let i = 0; i < tokens.length; i += batchSize) {
      const batch = tokens.slice(i, i + batchSize);

      const batchResults = await Promise.allSettled(
        batch.map(async (token) => ({ stateId: stateIdOf(token), spent: await this.isSpent(token) })),
      );

      for (const result of batchResults) {
        completed++;
        if (result.status === 'fulfilled') {
          if (result.value.spent) spentTokens.push({ stateId: result.value.stateId });
        } else {
          errors.push(String(result.reason));
        }
      }

      options?.onProgress?.(completed, total);
    }

    return { spentTokens, errors };
  }

  /** Clear the spent-status cache. */
  clearSpentStateCache(): void {
    this.spentStateCache.clear();
  }
}

// =============================================================================
// Factory Function
// =============================================================================

/** Create a token validator backed by the given engine. */
export function createTokenValidator(engine: ITokenEngine): TokenValidator {
  return new TokenValidator(engine);
}
