import mysql from 'mysql2/promise';
import { getMasterPrismaClient } from '@hr360/db-master';
import { ITenantServices, MysqlTenantServices, SqliteTenantServices } from '@hr360/tenant-services';
import { KmsEnvelopeService } from './kms-envelope';
import { TenantClusterManager } from './tenant-cluster-manager';

export interface TenantConnectionContext {
  companyId: string;
  companySlug: string;
  storageMode: 'CLOUD_DEDICATED' | 'LOCAL';
  services: ITenantServices;
  maxDevicesAllowed: number;
}

interface PoolEntry {
  pool: mysql.Pool;
  services: ITenantServices;
  lastUsedAt: number;
}

class TenantRuntimeResolver {
  private static instance: TenantRuntimeResolver;
  private readonly clusterPools = new Map<string, PoolEntry>();
  private readonly localAdapters = new Map<string, { conn: any; services: ITenantServices }>();
  private readonly kms: KmsEnvelopeService;
  private readonly clusterMgr: TenantClusterManager;
  private readonly MAX_POOLS = 200;

  private constructor() {
    this.kms = new KmsEnvelopeService();
    this.clusterMgr = new TenantClusterManager(this.kms);

    // Periodically clean up idle connection pools (older than 10 minutes)
    setInterval(() => this.pruneIdlePools(), 5 * 60 * 1000).unref();
  }

  public static getInstance(): TenantRuntimeResolver {
    if (!TenantRuntimeResolver.instance) {
      TenantRuntimeResolver.instance = new TenantRuntimeResolver();
    }
    return TenantRuntimeResolver.instance;
  }

  /**
   * Resolves tenant services and active connection for a given companyId
   */
  public async resolveTenant(companyId: string): Promise<TenantConnectionContext> {
    const prisma = getMasterPrismaClient();

    const company = await prisma.company.findUnique({
      where: { id: companyId },
      include: {
        tenantConnection: true,
        accessPolicy: true,
      },
    });

    if (!company) {
      throw new Error(`Company not found: ${companyId}`);
    }

    if (company.status !== 'ACTIVE') {
      throw new Error(`Company account is currently ${company.status}. Access denied.`);
    }

    const storageMode = (company.storageMode as 'CLOUD_DEDICATED' | 'LOCAL') || 'CLOUD_DEDICATED';
    const maxDevicesAllowed = company.accessPolicy?.maxDevicesAllowed ?? 10;

    if (storageMode === 'CLOUD_DEDICATED') {
      const connRecord = company.tenantConnection;
      if (!connRecord || !connRecord.encryptedConnection) {
        throw new Error(`Dedicated database connection has not been provisioned for company ${company.slug}`);
      }

      const services = await this.getOrCreateClusterServices(companyId, connRecord.encryptedConnection);
      return {
        companyId: company.id,
        companySlug: company.slug,
        storageMode: 'CLOUD_DEDICATED',
        services,
        maxDevicesAllowed,
      };
    } else {
      // LOCAL mode (managed local SQLite adapter if running server-side or explorer)
      const services = this.getOrCreateLocalServices(company.id, company.encryptedDek);
      return {
        companyId: company.id,
        companySlug: company.slug,
        storageMode: 'LOCAL',
        services,
        maxDevicesAllowed,
      };
    }
  }

  private async getOrCreateClusterServices(companyId: string, encryptedConnection: string): Promise<ITenantServices> {
    const existing = this.clusterPools.get(companyId);
    if (existing) {
      existing.lastUsedAt = Date.now();
      return existing.services;
    }

    if (this.clusterPools.size >= this.MAX_POOLS) {
      this.evictOldestPool();
    }

    // Decrypt connection string using master KEK
    const rawUri = this.clusterMgr.decryptConnectionString(encryptedConnection);
    const parsed = this.clusterMgr.parseUri(rawUri);

    // Create bounded connection pool per dedicated tenant cluster
    const pool = mysql.createPool({
      host: parsed.host,
      port: parsed.port,
      user: parsed.user,
      password: parsed.password,
      database: parsed.database,
      ssl: parsed.ssl ? { rejectUnauthorized: true } : undefined,
      connectionLimit: 15,
      queueLimit: 50,
      waitForConnections: true,
      connectTimeout: 8000,
    });

    const services = new MysqlTenantServices(pool);
    this.clusterPools.set(companyId, {
      pool,
      services,
      lastUsedAt: Date.now(),
    });

    return services;
  }

  private getOrCreateLocalServices(companyId: string, encryptedDek: string | null): ITenantServices {
    const existing = this.localAdapters.get(companyId);
    if (existing) return existing.services;

    let localCore: any = null;
    try {
      localCore = require('@hr360/local-core');
    } catch {
      // Serverless cloud environment: customer data resides solely on the local PC vault
      const emptyServices: any = {
        employee: { list: async () => [], getById: async () => null, create: async () => ({}), update: async () => ({}), delete: async () => false },
        attendance: { listRecords: async () => [], recordPunch: async () => ({}), syncBatch: async () => ({ synced: 0, deduped: 0 }) },
        payroll: { listRuns: async () => [], processRun: async () => ({}), approveRun: async () => ({}) },
        leave: { listRequests: async () => [], submitRequest: async () => ({}), updateStatus: async () => ({}) },
        certificate: { listCertificates: async () => [], generateCertificate: async () => ({}) },
        audit: { listLogs: async () => [] },
      };
      return emptyServices as ITenantServices;
    }

    const dek = encryptedDek ? this.kms.unwrapDek(encryptedDek) : 'default-local-fallback-key-32chars!';
    const path = require('node:path');
    const dbPath = path.resolve(process.cwd(), `userData/databases/${companyId}.db`);

    const conn = new localCore.DatabaseConnection({
      dbPath,
      encryptionKey: dek,
    });
    const services = new SqliteTenantServices(conn);

    this.localAdapters.set(companyId, { conn, services });
    return services;
  }

  private evictOldestPool(): void {
    let oldestId: string | null = null;
    let oldestTime = Infinity;

    for (const [id, entry] of this.clusterPools.entries()) {
      if (entry.lastUsedAt < oldestTime) {
        oldestTime = entry.lastUsedAt;
        oldestId = id;
      }
    }

    if (oldestId) {
      const entry = this.clusterPools.get(oldestId);
      if (entry) {
        entry.pool.end().catch(() => {});
        this.clusterPools.delete(oldestId);
      }
    }
  }

  private pruneIdlePools(): void {
    const maxIdleMs = 10 * 60 * 1000;
    const now = Date.now();

    for (const [id, entry] of this.clusterPools.entries()) {
      if (now - entry.lastUsedAt > maxIdleMs) {
        entry.pool.end().catch(() => {});
        this.clusterPools.delete(id);
      }
    }
  }
}

export const tenantResolver = TenantRuntimeResolver.getInstance();
