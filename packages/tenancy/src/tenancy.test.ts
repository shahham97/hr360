import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { TenantMigrationRunner } from './migration-runner.js';

const migrationsDir = path.resolve(process.cwd(), '../../migrations/tenant');

describe('Tenancy & Migration Engine', () => {
  it('loads valid tenant migrations with deterministic SHA-256 checksums', async () => {
    const runner = new TenantMigrationRunner(migrationsDir);
    const files = await runner.loadMigrationFiles();

    assert.ok(files.length > 0);
    const initMigration = files.find((f) => f.version === 1);
    assert.ok(initMigration);
    assert.equal(initMigration.name, 'init');
    assert.equal(initMigration.checksum.length, 64);
  });

  it('rejects tampered migration contents during execution', async () => {
    const runner = new TenantMigrationRunner(migrationsDir);

    // Mock connection simulating existing schema_migrations table with a different checksum
    const mockConn = {
      async query(sql: string) {
        if (sql.includes('SELECT version, name, checksum')) {
          return [
            [
              {
                version: 1,
                name: 'init',
                checksum: '0000000000000000000000000000000000000000000000000000000000000000', // tampered
              },
            ],
          ];
        }
        return [[]];
      },
    } as any;

    await assert.rejects(
      async () => {
        await runner.runMigrations(mockConn, { tenantSlug: 'test_slug' });
      },
      {
        message: /TAMPER_DETECTED/,
      }
    );
  });
});
