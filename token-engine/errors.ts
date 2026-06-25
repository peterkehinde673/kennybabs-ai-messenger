/**
 * token-engine/errors.ts — the engine's typed error surface (Part E.2).
 */

import { SphereError } from '../core/errors';

/**
 * The source state was already consumed by a *different* transaction — the
 * fetched inclusion proof does not match the rebuilt transaction
 * (`TRANSACTION_HASH_MISMATCH`). Typically the owner's other device raced the
 * same source under a different `transferId` (ARCHITECTURE §7).
 *
 * This is a lost race, **not** an interrupted resume: the engine never applies
 * the foreign proof and never retries. The caller's recovery is to abort the
 * intent, drop the lost source from its plan, and re-plan the remainder under
 * a NEW `transferId` (never reusing the old realization) — sdk-changes E.2.
 */
export class TransferConflictError extends SphereError {
  /**
   * #625: the source token id (the caller's id, e.g. `v2_<genesis>`) whose state was already spent.
   * Set by PaymentsModule at the engine call site so the self-healing retry can demote it and re-plan.
   */
  conflictedSourceId?: string;

  constructor(message: string, cause?: unknown) {
    super(message, 'TRANSFER_CONFLICT', cause);
    this.name = 'TransferConflictError';
  }
}
