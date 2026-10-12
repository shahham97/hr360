import mysql from 'mysql2/promise';
import fs from 'node:fs';
import path from 'node:path';
import { getMasterPrismaClient } from '@hr360/db-master';

export interface TenantConnectionDetails {
  host: string;
  port: number;
  database: string;
  user: string;
  password?: string;
}

// In-memory pool cache keyed by tenant database name
const tenantPools = new Map<string, mysql.Pool>();

/**
 * Loads CA certificate for TiDB Cloud if configured
 */
export function getDbSslConfig() {
  const isSsl = process.env.DB_SSL === 'true' || process.env.DB_PORT === '4000';
  if (!isSsl) return undefined;

  const caPath = process.env.DB_CA_PATH || path.resolve(process.cwd(), 'isrgrootx1.pem');
  if (fs.existsSync(caPath)) {
    return {
      ca: fs.readFileSync(caPath),
      rejectUnauthorized: true,
    };
  }
  // TiDB Cloud fallback with strict verification
  return { rejectUnauthorized: true };
}

/**
 * Resolves the tenant database connection pool for the given companyId.
 * Guarantees that queries are executed strictly against that company's dedicated database.
 */
export async function getTenantConnectionPool(companyId: string): Promise<{
  pool: mysql.Pool;
  databaseName: string;
  companySlug: string;
  companyName: string;
}> {
  const prisma = getMasterPrismaClient();

  const company = await prisma.company.findUnique({
    where: { id: companyId },
    include: { tenant: true, tenantConnection: true },
  });

  if (!company) {
    throw new Error(`Company with ID "${companyId}" not found.`);
  }

  // 1. If company has modern CLOUD_DEDICATED connection
  if (company.tenantConnection && company.tenantConnection.status === 'ACTIVE') {
    const { TenantClusterManager } = await import('./tenant-cluster-manager');
    const mgr = new TenantClusterManager();
    const payload = mgr.decryptConnectionPayload(company.tenantConnection.encryptedConnection);
    const parsed = mgr.parseUri(payload.connectionString);

    const sslConfig = payload.caCert
      ? { ca: payload.caCert, rejectUnauthorized: true }
      : parsed.ssl || parsed.port === 4000
      ? { rejectUnauthorized: true }
      : undefined;

    const cacheKey = `cluster_${company.id}`;
    if (!tenantPools.has(cacheKey)) {
      const pool = mysql.createPool({
        host: parsed.host,
        port: parsed.port,
        user: parsed.user,
        password: parsed.password,
        database: parsed.database,
        ssl: sslConfig,
        waitForConnections: true,
        connectionLimit: 15,
        queueLimit: 0,
      });
      tenantPools.set(cacheKey, pool);
    }

    return {
      pool: tenantPools.get(cacheKey)!,
      databaseName: parsed.database,
      companySlug: company.slug,
      companyName: company.name,
    };
  }

  // 2. Legacy fallback
  if (!company.tenant || company.tenant.status !== 'ACTIVE') {
    throw new Error(`Company "${company.name}" does not have an active database provisioned.`);
  }

  const databaseName = company.tenant.databaseName;

  if (tenantPools.has(databaseName)) {
    return {
      pool: tenantPools.get(databaseName)!,
      databaseName,
      companySlug: company.slug,
      companyName: company.name,
    };
  }

  const sslConfig = getDbSslConfig();

  const pool = mysql.createPool({
    host: process.env.DB_HOST || process.env.DATABASE_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || process.env.DATABASE_PORT || 3306),
    user: process.env.DB_ROOT_USER || process.env.DATABASE_USER || 'root',
    password: process.env.DB_ROOT_PASSWORD || process.env.DATABASE_PASSWORD || '',
    database: databaseName,
    ssl: sslConfig,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  });

  tenantPools.set(databaseName, pool);

  return {
    pool,
    databaseName,
    companySlug: company.slug,
    companyName: company.name,
  };
}

/**
 * Execute a query scoped strictly to the company's dedicated database
 */
export async function executeTenantQuery<T = any>(
  companyId: string,
  sql: string,
  params: any[] = []
): Promise<T[]> {
  const { pool } = await getTenantConnectionPool(companyId);
  const [rows] = await pool.query(sql, params);
  return rows as T[];
}
