const { encrypt, decrypt, isEncrypted, PREFIX } = require('../encryption');

describe('encryption lib (AES-256-GCM)', () => {
  test('round-trips a plaintext value', () => {
    const cipher = encrypt('12345678901');
    expect(cipher).not.toBe('12345678901');
    expect(isEncrypted(cipher)).toBe(true);
    expect(cipher.startsWith(PREFIX)).toBe(true);
    expect(decrypt(cipher)).toBe('12345678901');
  });

  test('produces a different ciphertext each time (random IV)', () => {
    expect(encrypt('hello')).not.toBe(encrypt('hello'));
  });

  test('passes through empty / nullish values unchanged', () => {
    expect(encrypt('')).toBe('');
    expect(encrypt(null)).toBe(null);
    expect(encrypt(undefined)).toBe(undefined);
  });

  test('does not double-encrypt an already-encrypted value', () => {
    const once = encrypt('secret');
    expect(encrypt(once)).toBe(once);
  });

  test('decrypt leaves plaintext (non-prefixed) values as-is', () => {
    expect(decrypt('plain-legacy-value')).toBe('plain-legacy-value');
  });

  test('fails closed (returns empty) on tampered ciphertext', () => {
    const cipher = encrypt('sensitive');
    const tampered = cipher.slice(0, -4) + 'AAAA';
    expect(decrypt(tampered)).toBe('');
  });
});
