import test from 'node:test';
import assert from 'node:assert/strict';
import { BlindIndex } from './blind-index.js';

test('Keyed HMAC Blind Index Engine', async (t) => {
  const secretKeyA = 'blind-index-key-secret-1234567890!';
  const secretKeyB = 'blind-index-key-secret-DIFFERENT!';

  await t.test('generates deterministic hash for identical input', () => {
    const hash1 = BlindIndex.forCnic('35201-1234567-1', secretKeyA);
    const hash2 = BlindIndex.forCnic('35201-1234567-1', secretKeyA);
    assert.equal(hash1, hash2);
    assert.equal(hash1.length, 64); // SHA-256 hex length
  });

  await t.test('normalizes formatting (dashes, spaces, case)', () => {
    const formatted = BlindIndex.forCnic('35201-1234567-1', secretKeyA);
    const unformatted = BlindIndex.forCnic('3520112345671', secretKeyA);
    const spaces = BlindIndex.forCnic('35201 1234567 1', secretKeyA);
    assert.equal(formatted, unformatted);
    assert.equal(formatted, spaces);
  });

  await t.test('context separation between CNIC and IBAN', () => {
    const val = 'PK36SCBL0000001123456701';
    const cnicHash = BlindIndex.forCnic(val, secretKeyA);
    const ibanHash = BlindIndex.forIban(val, secretKeyA);
    assert.notEqual(cnicHash, ibanHash, 'Context strings must create isolated index domains');
  });

  await t.test('key dependency ensures different keys produce different indexes', () => {
    const hashA = BlindIndex.forCnic('35201-1234567-1', secretKeyA);
    const hashB = BlindIndex.forCnic('35201-1234567-1', secretKeyB);
    assert.notEqual(hashA, hashB, 'Different keys must produce distinct blind indexes');
  });

  await t.test('handles empty or null inputs gracefully', () => {
    assert.equal(BlindIndex.compute('', secretKeyA), '');
    assert.equal(BlindIndex.compute(null, secretKeyA), '');
    assert.equal(BlindIndex.compute(undefined, secretKeyA), '');
  });
});
