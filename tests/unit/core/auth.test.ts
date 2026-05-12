import { describe, it, expect } from 'vitest';
import { computeDirectAddressFromChainPubkey } from '../../../core/address-derivation';
import { verifySphereAuth, AuthVerificationError } from '../../../core/auth';
import { signMessage, getPublicKey } from '../../../core/crypto';

const PRIVKEY_HEX = '0000000000000000000000000000000000000000000000000000000000000001';
const OTHER_PRIVKEY_HEX = '0000000000000000000000000000000000000000000000000000000000000002';

function pubkeyForPrivkey(privkeyHex: string): string {
  return getPublicKey(privkeyHex);
}

describe('computeDirectAddressFromChainPubkey', () => {
  it('produces a DIRECT:// formatted string', async () => {
    const pubkey = pubkeyForPrivkey(PRIVKEY_HEX);
    const addr = await computeDirectAddressFromChainPubkey(pubkey);
    expect(addr).toMatch(/^DIRECT:\/\/[0-9a-f]+$/);
  });

  it('is deterministic', async () => {
    const pubkey = pubkeyForPrivkey(PRIVKEY_HEX);
    const a = await computeDirectAddressFromChainPubkey(pubkey);
    const b = await computeDirectAddressFromChainPubkey(pubkey);
    expect(a).toBe(b);
  });

  it('different pubkeys produce different addresses', async () => {
    const pkA = pubkeyForPrivkey(PRIVKEY_HEX);
    const pkB = pubkeyForPrivkey(OTHER_PRIVKEY_HEX);
    expect(await computeDirectAddressFromChainPubkey(pkA))
      .not.toBe(await computeDirectAddressFromChainPubkey(pkB));
  });

  it('rejects wrong length', async () => {
    await expect(computeDirectAddressFromChainPubkey('02ab')).rejects.toThrow(/66|length|hex/i);
  });

  it('rejects non-hex characters', async () => {
    await expect(computeDirectAddressFromChainPubkey('02' + 'zz'.repeat(32))).rejects.toThrow(/hex/i);
  });

  it('rejects bad prefix', async () => {
    await expect(computeDirectAddressFromChainPubkey('04' + 'ab'.repeat(32))).rejects.toThrow(/02|03|prefix/i);
  });
});

describe('verifySphereAuth', () => {
  const challenge = 'Sign in to Test\nNonce: abc123';

  it('returns trusted pair for a valid signature', async () => {
    const pubkey = pubkeyForPrivkey(PRIVKEY_HEX);
    const signature = signMessage(PRIVKEY_HEX, challenge);

    const result = await verifySphereAuth({ challenge, signature, chainPubkey: pubkey });

    expect(result.chainPubkey).toBe(pubkey);
    expect(result.directAddress).toMatch(/^DIRECT:\/\/[0-9a-f]+$/);
    expect(result.directAddress).toBe(await computeDirectAddressFromChainPubkey(pubkey));
  });

  it('throws SIGNATURE_INVALID when signature is for a different challenge', async () => {
    const pubkey = pubkeyForPrivkey(PRIVKEY_HEX);
    const signature = signMessage(PRIVKEY_HEX, 'a different challenge');

    await expect(verifySphereAuth({ challenge, signature, chainPubkey: pubkey }))
      .rejects.toMatchObject({ name: 'AuthVerificationError', code: 'SIGNATURE_INVALID' });
  });

  it('throws SIGNATURE_INVALID when signature is from a different privkey', async () => {
    const claimedPubkey = pubkeyForPrivkey(PRIVKEY_HEX);
    const signature = signMessage(OTHER_PRIVKEY_HEX, challenge);

    await expect(verifySphereAuth({ challenge, signature, chainPubkey: claimedPubkey }))
      .rejects.toMatchObject({ name: 'AuthVerificationError', code: 'SIGNATURE_INVALID' });
  });

  it('throws PUBKEY_MALFORMED when chainPubkey is invalid', async () => {
    await expect(verifySphereAuth({ challenge, signature: 'abcd', chainPubkey: 'nope' }))
      .rejects.toMatchObject({ name: 'AuthVerificationError', code: 'PUBKEY_MALFORMED' });
  });

  it('AuthVerificationError instances are instanceof Error', async () => {
    try {
      await verifySphereAuth({ challenge, signature: 'abcd', chainPubkey: 'nope' });
      throw new Error('should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(AuthVerificationError);
      expect(e).toBeInstanceOf(Error);
    }
  });
});
