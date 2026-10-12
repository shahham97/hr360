import mysql, { Pool, Connection } from 'mysql2/promise';
import { generateSafeSlug, TenantSlugSchema } from '@hr360/schema';

export interface TenantDbConfig {
  databaseName: string;
  dbUser: string;
  dbPassword: string;
  host: string;
  port: number;
}

/**
 * Validates and safely quotes MySQL / TiDB identifiers (database names, user names).
 * Prevents SQL injection by forbidding unvalidated string interpolation.
 */
export function quoteIdentifier(identifier: string): string {
  if (!/^[a-zA-Z0-9_]+$/.test(identifier)) {
    throw new Error(`Invalid identifier: "${identifier}". Must match [a-zA-Z0-9_]+.`);
  }
  return `\`${identifier}\``;
}

/**
 * LRU Connection Pool Manager for Tenant DBs (Bounded concurrency & memory control)
 */
export class TenantPoolManager {
  private pools: Map<string, { pool: Pool; lastUsed: number }> = new Map();
  private maxPools: number;

  constructor(maxPools: number = 20) {
    this.maxPools = maxPools;
  }

  public getPool(tenantSlug: string, config: TenantDbConfig): Pool {
    const existing = this.pools.get(tenantSlug);
    if (existing) {
      existing.lastUsed = Date.now();
      return existing.pool;
    }

    // Evict oldest if reached capacity
    if (this.pools.size >= this.maxPools) {
      this.evictOldest();
    }

    const pool = mysql.createPool({
      host: config.host,
      port: config.port,
      user: config.dbUser,
      password: config.dbPassword,
      database: config.databaseName,
      waitForConnections: true,
      connectionLimit: 5,
      maxIdle: 2,
      idleTimeout: 30000,
      queueLimit: 0,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: true } : undefined,
    });

    this.pools.set(tenantSlug, { pool, lastUsed: Date.now() });
    return pool;
  }

  private evictOldest(): void {
    let oldestSlug: string | null = null;
    let oldestTime = Infinity;

    for (const [slug, entry] of this.pools.entries()) {
      if (entry.lastUsed < oldestTime) {
        oldestTime = entry.lastUsed;
        oldestSlug = slug;
      }
    }

    if (oldestSlug) {
      const entry = this.pools.get(oldestSlug);
      if (entry) {
        entry.pool.end().catch(() => {});
        this.pools.delete(oldestSlug);
      }
    }
  }

  public async closeAll(): Promise<void> {
    for (const entry of this.pools.values()) {
      await entry.pool.end().catch(() => {});
    }
    this.pools.clear();
  }
}

/**
 * TiDB Dynamic Provisioning Harness
 * Executes safe DDL:
 * 1. CREATE DATABASE `tenant_<slug>`
 * 2. CREATE USER `user_<slug>`@'%' IDENTIFIED BY ...
 * 3. GRANT ALL PRIVILEGES ON `tenant_<slug>`.* TO `user_<slug>`@'%'
 */
export class TiDbProvisioner {
  private adminConnection: Connection;

  constructor(adminConnection: Connection) {
    this.adminConnection = adminConnection;
  }

  public async provisionTenant(
    companyName: string,
    host: string,
    port: number,
    generatedPassword: string
  ): Promise<TenantDbConfig> {
    const slug = generateSafeSlug(companyName);
    TenantSlugSchema.parse(slug);

    const dbName = `tenant_${slug}`;
    const dbUser = `usr_${slug}`;

    const quotedDbName = quoteIdentifier(dbName);
    const quotedDbUser = quoteIdentifier(dbUser);

    // 1. Create dedicated tenant database
    await this.adminConnection.query(`CREATE DATABASE IF NOT EXISTS ${quotedDbName};`);

    // 2. Create dedicated user and grant permissions exclusively to this database
    await this.adminConnection.query(
      `CREATE USER IF NOT EXISTS ${quotedDbUser}@'%' IDENTIFIED BY ?;`,
      [generatedPassword]
    );

    await this.adminConnection.query(
      `GRANT ALL PRIVILEGES ON ${quotedDbName}.* TO ${quotedDbUser}@'%';`
    );

    await this.adminConnection.query(`FLUSH PRIVILEGES;`);

    return {
      databaseName: dbName,
      dbUser,
      dbPassword: generatedPassword,
      host,
      port,
    };
  }
}
