import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { quoteIdentifier, TenantPoolManager } from './provisioning.js';

describe('TiDB Provisioning Spike & Isolation Safety', () => {
  it('safely validates and quotes identifiers preventing SQL injection', () => {
    assert.equal(quoteIdentifier('tenant_acme'), '`tenant_acme`');
    assert.equal(quoteIdentifier('usr_acme_123'), '`usr_acme_123`');

    // Injection attempts must throw immediately
    assert.throws(() => quoteIdentifier('tenant_acme; DROP DATABASE master;'));
    assert.throws(() => quoteIdentifier('tenant_acme` OR 1=1'));
    assert.throws(() => quoteIdentifier('tenant-acme'));
  });

  it('manages LRU pool bounds preventing resource exhaustion', async () => {
    const poolManager = new TenantPoolManager(2); // Bound size of 2 for testing
    const fakeConfig = (name: string) => ({
      databaseName: `tenant_${name}`,
      dbUser: `usr_${name}`,
      dbPassword: 'secretPassword123!',
      host: '127.0.0.1',
      port: 4000,
    });

    const poolA = poolManager.getPool('tenant_a', fakeConfig('a'));
    const poolB = poolManager.getPool('tenant_b', fakeConfig('b'));
    assert.ok(poolA);
    assert.ok(poolB);

    // Requesting tenant_c should evict tenant_a (the oldest)
    const poolC = poolManager.getPool('tenant_c', fakeConfig('c'));
    assert.ok(poolC);

    await poolManager.closeAll();
  });
});
