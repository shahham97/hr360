import mysql from 'mysql2/promise';
import { getMasterPrismaClient } from '@hr360/db-master';
import { TenantClusterManager } from './tenant-cluster-manager';

export interface MigrationStep {
  version: number;
  name: string;
  sql: string;
}

export interface TenantMigrationResult {
  companyId: string;
  companySlug: string;
  success: boolean;
  appliedVersion: number;
  error?: string;
  executionTimeMs: number;
}

export class FleetMigrationRunner {
  private readonly clusterMgr: TenantClusterManager;

  constructor() {
    this.clusterMgr = new TenantClusterManager();
  }

  /**
   * Runs an ordered list of DDL migrations across all active cloud-dedicated tenant clusters
   * Concurrency: batches of N clusters in parallel
   */
  public async runFleetMigration(
    migrations: MigrationStep[],
    concurrency = 5
  ): Promise<{ total: number; successful: number; failed: number; results: TenantMigrationResult[] }> {
    const prisma = getMasterPrismaClient();

    const connections = await prisma.tenantDbConnection.findMany({
      where: {
        status: 'ACTIVE',
      },
      include: {
        company: true,
      },
    });

    const results: TenantMigrationResult[] = [];
    const queue = [...connections];

    // Process clusters with concurrency limit
    const workers = Array.from({ length: Math.min(concurrency, queue.length) }, async () => {
      while (queue.length > 0) {
        const item = queue.shift();
        if (!item) break;

        const start = Date.now();
        try {
          const appliedVer = await this.migrateSingleTenant(item.companyId, item.encryptedConnection, migrations);
          const duration = Date.now() - start;

          // Update recorded schema version
          await prisma.tenantDbConnection.update({
            where: { companyId: item.companyId },
            data: {
              schemaVersion: appliedVer,
              lastTestedAt: new Date(),
              lastError: null,
            },
          });

          results.push({
            companyId: item.companyId,
            companySlug: item.company.slug,
            success: true,
            appliedVersion: appliedVer,
            executionTimeMs: duration,
          });
        } catch (err: any) {
          const duration = Date.now() - start;
          await prisma.tenantDbConnection.update({
            where: { companyId: item.companyId },
            data: {
              lastError: err.message,
            },
          });

          results.push({
            companyId: item.companyId,
            companySlug: item.company.slug,
            success: false,
            appliedVersion: item.schemaVersion,
            error: err.message,
            executionTimeMs: duration,
          });
        }
      }
    });

    await Promise.all(workers);

    const successful = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    return {
      total: results.length,
      successful,
      failed,
      results,
    };
  }

  private async migrateSingleTenant(
    _companyId: string,
    encryptedConnection: string,
    migrations: MigrationStep[]
  ): Promise<number> {
    const rawUri = this.clusterMgr.decryptConnectionString(encryptedConnection);
    const parsed = this.clusterMgr.parseUri(rawUri);

    const conn = await mysql.createConnection({
      host: parsed.host,
      port: parsed.port,
      user: parsed.user,
      password: parsed.password,
      database: parsed.database,
      ssl: parsed.ssl ? { rejectUnauthorized: true } : undefined,
      connectTimeout: 8000,
    });

    try {
      // Ensure schema_migrations table exists
      await conn.query(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
          version INT PRIMARY KEY,
          name VARCHAR(128) NOT NULL,
          applied_at VARCHAR(64) NOT NULL,
          checksum VARCHAR(128) NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

      const [appliedRows] = await conn.query('SELECT version FROM schema_migrations') as any[];
      const appliedSet = new Set<number>(appliedRows.map((r: any) => Number(r.version)));

      let highestVersion = appliedSet.size > 0 ? Math.max(...Array.from(appliedSet)) : 0;

      for (const m of migrations.sort((a, b) => a.version - b.version)) {
        if (!appliedSet.has(m.version)) {
          // Execute DDL statements
          const statements = m.sql.split(';').map((s) => s.trim()).filter(Boolean);
          for (const stmt of statements) {
            await conn.query(stmt);
          }

          const now = new Date().toISOString();
          await conn.query(
            'INSERT INTO schema_migrations (version, name, applied_at, checksum) VALUES (?, ?, ?, ?)',
            [m.version, m.name, now, 'hash_migration']
          );

          highestVersion = Math.max(highestVersion, m.version);
        }
      }

      return highestVersion;
    } finally {
      await conn.end();
    }
  }
}
