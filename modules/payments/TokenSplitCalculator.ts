/**
 * Split-plan shapes (Token Split Calculator).
 *
 * The async `TokenSplitCalculator.calculateOptimalSplit` was dead — the live
 * planner is `SpendQueue.calculateOptimalSplitSync`. Only these plan shapes
 * survive; `SpendQueue` (the planner) and `PaymentsModule` (the sender) consume
 * them. `sdkToken` is an opaque per-token handle (a v1 SDK token today, a v2
 * `SphereToken` once the engine path is wired) — never inspected here.
 */

import type { Token } from '../../types';

export interface TokenWithAmount {
  /** Opaque per-token handle (v1 SDK token or v2 SphereToken). Not inspected here. */
  sdkToken: unknown;
  amount: bigint;
  uiToken: Token;
}

export interface SplitPlan {
  /** Tokens that can be transferred directly (exact match or combination) */
  tokensToTransferDirectly: TokenWithAmount[];
  /** Token that needs to be split (if requiresSplit is true) */
  tokenToSplit: TokenWithAmount | null;
  /** Amount to send to recipient from split token */
  splitAmount: bigint | null;
  /** Amount to keep as change from split token */
  remainderAmount: bigint | null;
  /** Total amount being transferred */
  totalTransferAmount: bigint;
  /** Coin type being transferred */
  coinId: string;
  /** Whether a split operation is required */
  requiresSplit: boolean;
}
