/**
 * token-engine — public entry point.
 *
 * The wallet's anti-corruption layer over the v2 state-transition SDK. Everything
 * outside this module imports the token engine from here (the ITokenEngine port
 * and sphere-domain types), never the SDK directly.
 *
 * The concrete adapter (`createSphereTokenEngine`) and the in-memory test double
 * (`FakeTokenEngine`) are exported here as they land in Phase 0 / Track A.
 */

// Frozen contract
export type {
  ITokenEngine,
  EngineConfig,
  EngineOpOptions,
  CreateTokenEngine,
} from './engine';

export type {
  EngineIdentity,
  SphereNetwork,
  CoinId,
  SphereAsset,
  SphereValue,
  TokenBlob,
  SphereToken,
  MintParams,
  TransferParams,
  SplitOutput,
  SplitParams,
  SplitResult,
  EngineVerifyResult,
} from './types';
