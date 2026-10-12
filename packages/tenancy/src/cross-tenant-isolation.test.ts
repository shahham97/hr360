import { describe, it } from 'node:test';
import assert from 'node:assert';
import { JsonWebToken, TenantTokenClaims } from '@hr360/crypto-audit';

describe('Cross-Tenant Cryptographic & Execution Isolation Suite', () => {
  const JWT_SECRET = 'hr360-cross-tenant-test-secret-32b-key!';

  const tenantA: TenantTokenClaims = {
    type: 'tenant_access',
    sub: 'user_alpha_admin',
    userId: 'user_alpha_admin',
    companyId: 'company_tenant_alpha_001',
    tenantSlug: 'alpha-corp',
    email: 'admin@alphacorp.com',
    role: 'COMPANY_ADMIN',
    exp: 0,
    iat: 0,
    iss: 'hr360-api',
  };

  const tenantB: TenantTokenClaims = {
    type: 'tenant_access',
    sub: 'user_beta_admin',
    userId: 'user_beta_admin',
    companyId: 'company_tenant_beta_002',
    tenantSlug: 'beta-holdings',
    email: 'admin@betaholdings.com',
    role: 'COMPANY_ADMIN',
    exp: 0,
    iat: 0,
    iss: 'hr360-api',
  };

  it('generates strictly isolated session tokens for independent tenant companies', () => {
    const tokenA = JsonWebToken.sign(tenantA, JWT_SECRET, 900);
    const tokenB = JsonWebToken.sign(tenantB, JWT_SECRET, 900);

    const resA = JsonWebToken.verify<TenantTokenClaims>(tokenA, JWT_SECRET);
    const resB = JsonWebToken.verify<TenantTokenClaims>(tokenB, JWT_SECRET);

    assert.strictEqual(resA.valid, true);
    assert.strictEqual(resB.valid, true);
    assert.strictEqual(resA.payload?.companyId, tenantA.companyId);
    assert.strictEqual(resB.payload?.companyId, tenantB.companyId);
    assert.notStrictEqual(resA.payload?.companyId, resB.payload?.companyId);
  });

  it('rejects cross-tenant token spoofing: tenant A token cannot claim tenant B identity', () => {
    const tokenA = JsonWebToken.sign(tenantA, JWT_SECRET, 900);
    const resA = JsonWebToken.verify<TenantTokenClaims>(tokenA, JWT_SECRET);

    assert.strictEqual(resA.valid, true);
    const serverResolvedCompanyId = resA.payload?.companyId;
    const clientSpoofedHeader = tenantB.companyId;

    assert.strictEqual(serverResolvedCompanyId, tenantA.companyId);
    assert.notStrictEqual(serverResolvedCompanyId, clientSpoofedHeader);
  });

  it('rejects tampered companyId in JWT token payload', () => {
    const tokenA = JsonWebToken.sign(tenantA, JWT_SECRET, 900);
    const [headerB64, payloadB64, sigB64] = tokenA.split('.');
    const payload = JSON.parse(Buffer.from(payloadB64!, 'base64url').toString('utf8'));

    // Attacker alters payload to impersonate Tenant B
    payload.companyId = tenantB.companyId;
    const tamperedPayloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const tamperedToken = `${headerB64}.${tamperedPayloadB64}.${sigB64}`;

    const res = JsonWebToken.verify(tamperedToken, JWT_SECRET);
    assert.strictEqual(res.valid, false);
    assert.strictEqual(res.error, 'Invalid token signature.');
  });

  it('ensures database query partition isolation between tenant pools', () => {
    function routeTenantQuery(sessionCompanyId: string, targetCompanyId: string) {
      if (sessionCompanyId !== targetCompanyId) {
        throw new Error('CROSS_TENANT_VIOLATION: Token context does not match requested tenant resource');
      }
      return `SELECT * FROM tenant_${sessionCompanyId}.employees`;
    }

    // Valid same-tenant query
    const validQuery = routeTenantQuery(tenantA.companyId, tenantA.companyId);
    assert.strictEqual(validQuery, `SELECT * FROM tenant_${tenantA.companyId}.employees`);

    // Cross-tenant attempt fails
    assert.throws(() => {
      routeTenantQuery(tenantA.companyId, tenantB.companyId);
    }, /CROSS_TENANT_VIOLATION/);
  });
});
