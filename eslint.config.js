import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    ignores: ['dist/', 'node_modules/', '*.js', '*.cjs', '*.mjs'],
  },
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['warn', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
        destructuredArrayIgnorePattern: '^_',
      }],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-non-null-assertion': 'off',
    },
  },
  // ── token-engine boundary (state-transition v2 migration) ──────────────────
  // The v2 token SDK is an isolated dependency. Only token-engine/sdk.ts (the
  // anti-corruption barrel) may import it; everything else imports from ./sdk
  // re-exports. This keeps the SDK swap (npm alias -> canonical at cut-over) a
  // one-file change and prevents v2 types leaking across the codebase.
  {
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [
          {
            group: ['state-transition-sdk-v2', 'state-transition-sdk-v2/*'],
            message:
              'Import the v2 state-transition SDK only via token-engine/sdk.ts. ' +
              'Other modules must import from token-engine (the ITokenEngine port), not the SDK directly.',
          },
        ],
      }],
    },
  },
  {
    // The single allowed SDK import surface.
    files: ['token-engine/sdk.ts'],
    rules: {
      'no-restricted-imports': 'off',
    },
  },
  {
    // Vendored v2 test infrastructure (TestAggregatorClient + BFT fixtures).
    // Copied verbatim from the v2 SDK's own tests (not shipped in its package),
    // so it imports SDK internals not on the engine barrel. Test-only.
    files: ['tests/**/token-engine/support/**/*.ts'],
    rules: {
      'no-restricted-imports': 'off',
    },
  }
);
