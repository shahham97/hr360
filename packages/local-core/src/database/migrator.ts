import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { DatabaseConnection } from './connection';

export interface MigrationFile {
  version: number;
  name: string;
  sql: string;
  checksum: string;
}

export class DatabaseMigrator {
  private readonly connection: DatabaseConnection;

  constructor(connection: DatabaseConnection) {
    this.connection = connection;
  }

  public getAvailableMigrations(): MigrationFile[] {
    let migrationsDir = path.join(__dirname, 'migrations');
    if (!fs.existsSync(migrationsDir)) {
      const srcFallback = path.resolve(__dirname, '../../src/database/migrations');
      if (fs.existsSync(srcFallback)) {
        migrationsDir = srcFallback;
      } else {
        return this.getBuiltinMigrations();
      }
    }

    const files = fs.readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    return files.map((fileName) => {
      const match = fileName.match(/^(\d+)_(.+)\.sql$/);
      const version = match ? parseInt(match[1], 10) : 1;
      const fullPath = path.join(migrationsDir, fileName);
      const sql = fs.readFileSync(fullPath, 'utf8');
      const checksum = crypto.createHash('sha256').update(sql).digest('hex');

      return {
        version,
        name: fileName,
        sql,
        checksum,
      };
    });
  }

  private getBuiltinMigrations(): MigrationFile[] {
    // Builtin migration 1 in case of packaged ASAR where raw SQL files might be compiled
    const sql = `
CREATE TABLE IF NOT EXISTS db_header_record (
    company_id TEXT PRIMARY KEY,
    schema_version INTEGER NOT NULL,
    created_by_build TEXT NOT NULL,
    activated_at TEXT NOT NULL,
    last_integrity_check TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS schema_migrations (
    version INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    applied_at TEXT NOT NULL,
    checksum TEXT NOT NULL
);
    `;
    return [{
      version: 1,
      name: '0001_init.sql',
      sql,
      checksum: crypto.createHash('sha256').update(sql).digest('hex'),
    }];
  }

  public getCurrentSchemaVersion(): number {
    const raw = this.connection.getRawDb();
    try {
      const row = raw.prepare(`SELECT MAX(version) as maxVersion FROM schema_migrations`).get() as { maxVersion: number | null };
      return row?.maxVersion ?? 0;
    } catch {
      return 0;
    }
  }

  public migrate(options?: {
    companyId?: string;
    appVersion?: string;
  }): { currentVersion: number; appliedCount: number } {
    const raw = this.connection.getRawDb();
    const migrations = this.getAvailableMigrations();

    let appliedCount = 0;

    this.connection.transaction(() => {
      // 1. Ensure migrations table exists
      raw.exec(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
          version INTEGER PRIMARY KEY,
          name TEXT NOT NULL,
          applied_at TEXT NOT NULL,
          checksum TEXT NOT NULL
        );
      `);

      const appliedRows = raw.prepare(`SELECT version, checksum FROM schema_migrations`).all() as Array<{
        version: number;
        checksum: string;
      }>;
      const appliedMap = new Map<number, string>(appliedRows.map((r) => [r.version, r.checksum]));

      for (const migration of migrations) {
        if (!appliedMap.has(migration.version)) {
          // Execute migration SQL
          raw.exec(migration.sql);

          // Record in schema_migrations
          raw.prepare(`
            INSERT INTO schema_migrations (version, name, applied_at, checksum)
            VALUES (?, ?, ?, ?)
          `).run(migration.version, migration.name, new Date().toISOString(), migration.checksum);

          appliedCount++;
        }
      }

      // Update or insert db_header_record if companyId is provided
      if (options?.companyId) {
        const latestVersion = this.getCurrentSchemaVersion();
        raw.prepare(`
          INSERT INTO db_header_record (company_id, schema_version, created_by_build, activated_at, last_integrity_check)
          VALUES (?, ?, ?, ?, ?)
          ON CONFLICT(company_id) DO UPDATE SET
            schema_version = excluded.schema_version,
            last_integrity_check = excluded.last_integrity_check
        `).run(
          options.companyId,
          latestVersion,
          options.appVersion || '1.0.0',
          new Date().toISOString(),
          new Date().toISOString()
        );
      }
    });

    return {
      currentVersion: this.getCurrentSchemaVersion(),
      appliedCount,
    };
  }

  public verifyHeaderRecord(expectedCompanyId: string): { valid: boolean; reason?: string } {
    const raw = this.connection.getRawDb();
    try {
      const header = raw.prepare(`SELECT * FROM db_header_record LIMIT 1`).get() as {
        company_id: string;
        schema_version: number;
      } | undefined;

      if (!header) {
        return { valid: false, reason: 'Missing database header record' };
      }

      if (header.company_id !== expectedCompanyId) {
        return { valid: false, reason: `Database company header mismatch: expected ${expectedCompanyId}, found ${header.company_id}` };
      }

      return { valid: true };
    } catch (err: any) {
      return { valid: false, reason: err.message };
    }
  }
}
