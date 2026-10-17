import test from 'node:test';
import assert from 'node:assert';
import { PasswordHasher } from './password';

test('PasswordHasher tests', async (t) => {
  await t.test('verifies existing known Argon2id hash', async () => {
    // Known hash produced previously by native Argon2id
    const existingHash = '$argon2id$v=19$m=65536,t=3,p=4$WU138DVG0xwBxdMmrvDZ8A$qfPOhXb/lDg4de1uTNeKq85PNwokTgz3xr6qYEJPT/w';
    const valid = await PasswordHasher.verifyPassword(existingHash, 'Admin123!Secure2026');
    assert.strictEqual(valid, true, 'Existing hash should verify successfully');

    const invalid = await PasswordHasher.verifyPassword(existingHash, 'WrongPassword123');
    assert.strictEqual(invalid, false, 'Invalid password should be rejected');
  });

  await t.test('hashes and verifies new password', async () => {
    const password = 'TestCompanyPassword2026!';
    const hash = await PasswordHasher.hashPassword(password);
    assert.ok(hash.startsWith('$argon2id$'), 'Hash should be standard Argon2id encoded');

    const valid = await PasswordHasher.verifyPassword(hash, password);
    assert.strictEqual(valid, true, 'New hash should verify with correct candidate');

    const invalid = await PasswordHasher.verifyPassword(hash, 'IncorrectPassword999');
    assert.strictEqual(invalid, false, 'New hash should reject wrong candidate');
  });

  await t.test('rejects short passwords', async () => {
    await assert.rejects(async () => {
      await PasswordHasher.hashPassword('short');
    }, /minimal length constraints/);
  });
});
