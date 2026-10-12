import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { TenantSlugSchema, generateSafeSlug, CompanyRegistrationRequestSchema } from './index.js';

describe('Schema & Validation Contracts', () => {
  it('validates correct tenant slugs', () => {
    const valid = TenantSlugSchema.safeParse('acme_corp_pk');
    assert.equal(valid.success, true);
  });

  it('rejects invalid or reserved tenant slugs', () => {
    const reserved = TenantSlugSchema.safeParse('admin');
    assert.equal(reserved.success, false);

    const withHyphen = TenantSlugSchema.safeParse('acme-corp');
    assert.equal(withHyphen.success, false);

    const withLeadingUnderscore = TenantSlugSchema.safeParse('_acme');
    assert.equal(withLeadingUnderscore.success, false);
  });

  it('generates safe slugs sanitizing arbitrary input', () => {
    const slug1 = generateSafeSlug('Acme Corporation (PVT) Ltd.');
    assert.equal(slug1, 'acme_corporation_pvt_ltd');

    const slug2 = generateSafeSlug('Admin', '01');
    assert.equal(slug2, 'org_admin_01');
    assert.equal(TenantSlugSchema.safeParse(slug2).success, true);
  });

  it('enforces strong password validation on company registration', () => {
    const weakPass = CompanyRegistrationRequestSchema.safeParse({
      companyName: 'Acme',
      adminEmail: 'admin@acme.com',
      adminPassword: 'weakpassword',
      adminFullName: 'John Doe',
      phone: '+923001234567',
      country: 'PK',
    });
    assert.equal(weakPass.success, false);

    const strongPass = CompanyRegistrationRequestSchema.safeParse({
      companyName: 'Acme Corp',
      adminEmail: 'admin@acme.com',
      adminPassword: 'SecurePassword123!',
      adminFullName: 'John Doe',
      phone: '+923001234567',
      country: 'PK',
    });
    assert.equal(strongPass.success, true);
  });
});
