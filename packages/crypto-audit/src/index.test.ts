import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  EnvelopeCrypto,
  AuditChain,
  GENESIS_HASH,
  PasswordHasher,
  canonicalizeJSON,
  JsonWebToken,
  EntitlementCrypto
} from './index.js';

describe('Crypto & Audit Engine', () => {
  const testKey = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

  describe('EnvelopeCrypto (AES-256-GCM)', () => {
    it('encrypts and decrypts strings correctly', () => {
      const cryptoEngine = new EnvelopeCrypto(testKey);
      const secret = 'mysql://tenant_acme:SecurePass99@tidb.prod:4000/tenant_acme';

      const encrypted = cryptoEngine.encrypt(secret);
      assert.notEqual(encrypted.ciphertext, secret);
      assert.ok(encrypted.iv);
      assert.ok(encrypted.authTag);

      const decrypted = cryptoEngine.decrypt(encrypted);
      assert.equal(decrypted, secret);
    });

    it('rejects tampered ciphertext', () => {
      const cryptoEngine = new EnvelopeCrypto(testKey);
      const secret = 'super-confidential-payroll-rate';
      const encrypted = cryptoEngine.encrypt(secret);

      // Tamper ciphertext
      const tampered = {
        ...encrypted,
        ciphertext: Buffer.from('corrupted_bytes_data').toString('base64'),
      };

      assert.throws(() => cryptoEngine.decrypt(tampered));
    });

    it('serializes and deserializes payloads cleanly', () => {
      const cryptoEngine = new EnvelopeCrypto(testKey);
      const payload = cryptoEngine.encrypt('plain_data');
      const serialized = cryptoEngine.serialize(payload);
      const recovered = cryptoEngine.deserializeAndDecrypt(serialized);
      assert.equal(recovered, 'plain_data');
    });
  });

  describe('Canonical JSON & AuditChain', () => {
    it('produces identical canonical JSON strings regardless of key ordering', () => {
      const obj1 = { b: 2, a: 1, c: { y: 'test', x: true } };
      const obj2 = { a: 1, c: { x: true, y: 'test' }, b: 2 };
      assert.equal(canonicalizeJSON(obj1), canonicalizeJSON(obj2));
    });

    it('builds a cryptographically valid audit chain and detects tampering', () => {
      const row1Data = {
        id: 'aud_1',
        actorId: 'usr_1',
        actorType: 'TENANT_USER' as const,
        action: 'EMPLOYEE_CREATE',
        entityType: 'Employee',
        entityId: 'emp_1',
        timestamp: '2026-10-10T00:00:00.000Z',
      };
      const row1 = AuditChain.createRecord(GENESIS_HASH, row1Data);

      const row2Data = {
        id: 'aud_2',
        actorId: 'usr_1',
        actorType: 'TENANT_USER' as const,
        action: 'SALARY_REVISE',
        entityType: 'SalaryRevision',
        entityId: 'sal_1',
        timestamp: '2026-10-10T00:05:00.000Z',
      };
      const row2 = AuditChain.createRecord(row1.hash, row2Data);

      const chain = [row1, row2];
      const verification = AuditChain.verifyChain(chain);
      assert.equal(verification.isValid, true);

      // Attempt tampering with row 1's action
      const tamperedChain = [
        { ...row1, action: 'EMPLOYEE_DELETE' },
        row2,
      ];
      const tamperedVerification = AuditChain.verifyChain(tamperedChain);
      assert.equal(tamperedVerification.isValid, false);
      assert.equal(tamperedVerification.brokenIndex, 0);
    });
  });

  describe('PasswordHasher (Argon2id)', () => {
    it('hashes and securely verifies passwords', async () => {
      const password = 'StrongPassword!2026';
      const hashStr = await PasswordHasher.hashPassword(password);

      assert.ok(hashStr.startsWith('$argon2id$'));
      const isValid = await PasswordHasher.verifyPassword(hashStr, password);
      assert.equal(isValid, true);

      const isInvalid = await PasswordHasher.verifyPassword(hashStr, 'WrongPassword!');
      assert.equal(isInvalid, false);
    });
  });

  describe('JsonWebToken & EntitlementCrypto', () => {
    const jwtSecret = 'test-secret-at-least-32-characters-long-123456';

    it('signs and verifies JWT access tokens', () => {
      const payload = {
        userId: 'u_123',
        companyId: 'comp_456',
        tenantSlug: 'acme',
        email: 'admin@acme.com',
        role: 'COMPANY_ADMIN',
        type: 'tenant_access' as const,
      };

      const token = JsonWebToken.sign(payload, jwtSecret, 900);
      assert.ok(token.includes('.'));

      const res = JsonWebToken.verify<typeof payload>(token, jwtSecret);
      assert.equal(res.valid, true);
      assert.equal(res.payload?.userId, 'u_123');
      assert.equal(res.payload?.companyId, 'comp_456');
    });

    it('rejects tampered JWT signature', () => {
      const token = JsonWebToken.sign({ userId: 'u_123' }, jwtSecret, 900);
      const parts = token.split('.');
      const tamperedPayload = Buffer.from(JSON.stringify({ userId: 'hacker' })).toString('base64url');
      const tamperedToken = `${parts[0]}.${tamperedPayload}.${parts[2]}`;

      const res = JsonWebToken.verify(tamperedToken, jwtSecret);
      assert.equal(res.valid, false);
      assert.ok(res.error?.includes('signature'));
    });

    it('asymmetrically signs and verifies entitlement tokens (Ed25519)', () => {
      const { publicKey, privateKey } = EntitlementCrypto.generateKeyPair();

      const entitlementPayload = {
        companyId: 'comp_456',
        planCode: 'GROWTH',
        status: 'ACTIVE',
        limits: {
          employees: 250,
          terminals: 1,
          adminUsers: 5,
          storageMb: 5000,
        },
        modules: {
          dashboard: true,
          employees: true,
          attendance: true,
          leaves: true,
          payroll: true,
          payslipTemplate: true,
          certificates: true,
          performance: true,
          recruitment: true,
          system: true,
        },
        serverTime: new Date().toISOString(),
        expiresAt: '2027-10-10T00:00:00.000Z',
        graceUntil: '2027-10-24T00:00:00.000Z',
      };

      const signedToken = EntitlementCrypto.signEntitlement(entitlementPayload, privateKey);
      const verified = EntitlementCrypto.verifyEntitlement(signedToken, publicKey);

      assert.equal(verified.valid, true);
      assert.equal(verified.payload?.planCode, 'GROWTH');
      assert.equal(verified.payload?.limits.employees, 250);
    });

    it('rejects tampered entitlement payload', () => {
      const { publicKey, privateKey } = EntitlementCrypto.generateKeyPair();

      const entitlementPayload = {
        companyId: 'comp_456',
        planCode: 'STARTER',
        status: 'ACTIVE',
        limits: { employees: 50, terminals: 1, adminUsers: 2, storageMb: 1000 },
        modules: {
          dashboard: true,
          employees: true,
          attendance: true,
          leaves: true,
          payroll: true,
          payslipTemplate: true,
          certificates: true,
          performance: false,
          recruitment: false,
          system: true,
        },
        serverTime: new Date().toISOString(),
        expiresAt: '2027-10-10T00:00:00.000Z',
        graceUntil: '2027-10-24T00:00:00.000Z',
      };

      const signedToken = EntitlementCrypto.signEntitlement(entitlementPayload, privateKey);
      const parts = signedToken.split('.');
      // Tamper limits
      const tampered = { ...entitlementPayload, limits: { ...entitlementPayload.limits, employees: 999999 } };
      const tamperedToken = `${Buffer.from(JSON.stringify(tampered)).toString('base64url')}.${parts[1]}`;

      const res = EntitlementCrypto.verifyEntitlement(tamperedToken, publicKey);
      assert.equal(res.valid, false);
      assert.ok(res.error?.includes('verification failed'));
    });
  });
});
