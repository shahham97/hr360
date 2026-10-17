import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { KmsEnvelopeService } from './kms-envelope.ts';

test('KMS Key Versioning & DEK Rotation', async (t) => {
  const kekV1 = crypto.randomBytes(32).toString('hex');
  const kekV2 = crypto.randomBytes(32).toString('hex');

  const kms = new KmsEnvelopeService(kekV1, 'kek-2025-v1');
  kms.registerKey('kek-2026-v2', kekV2);

  const rawDek = kms.generateDek();
  assert.equal(rawDek.length, 64);

  let wrappedV1 = '';
  await t.test('wraps DEK under initial key version (v1)', () => {
    wrappedV1 = kms.wrapDek(rawDek, 'kek-2025-v1');
    const parsed = JSON.parse(wrappedV1);
    assert.equal(parsed.kid, 'kek-2025-v1');
    assert.equal(parsed.v, 2);

    const decrypted = kms.unwrapDek(wrappedV1);
    assert.equal(decrypted, rawDek);
  });

  await t.test('re-wraps DEK to new key version (v2) without modifying raw DEK', () => {
    const wrappedV2 = kms.rewrapDek(wrappedV1, 'kek-2026-v2');
    const parsed = JSON.parse(wrappedV2);
    assert.equal(parsed.kid, 'kek-2026-v2');

    // Both envelopes unwrap to the exact same raw DEK
    assert.equal(kms.unwrapDek(wrappedV2), rawDek);
    assert.equal(kms.unwrapDek(wrappedV1), rawDek);
  });
});
