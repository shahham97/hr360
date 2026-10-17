import fs from 'node:fs';
import path from 'node:path';
import { getMasterPrismaClient } from '@hr360/db-master';
import { SqliteTenantServices, MysqlTenantServices } from '@hr360/tenant-services';
import { TenantClusterManager } from './tenant-cluster-manager';

export interface MigrationProgressCallback {
  (currentStep: string, itemsDone: number, itemsTotal: number): void;
}

export class StorageModeMigrator {
  private readonly clusterMgr: TenantClusterManager;

  constructor() {
    this.clusterMgr = new TenantClusterManager();
  }

  /**
   * Migrates all data from a local encrypted SQLite database into a dedicated cloud cluster
   */
  public async migrateLocalToCloud(
    companyId: string,
    cloudConnectionString: string,
    onProgress?: MigrationProgressCallback
  ): Promise<{ success: boolean; migratedCounts: Record<string, number> }> {
    const prisma = getMasterPrismaClient();
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      include: { tenantConnection: true },
    });

    if (!company) {
      throw new Error(`Company not found: ${companyId}`);
    }

    // 1. Provision target cloud cluster
    onProgress?.('Provisioning target cloud database schema', 0, 1);
    const initialAdmin = {
      email: 'admin@hr360.local',
      fullName: 'System Administrator',
      passwordHash: 'argon2id_placeholder',
    };
    const { hostFingerprint } = await this.clusterMgr.provisionDedicatedCluster(cloudConnectionString, initialAdmin);

    // 2. Open source SQLite database
    onProgress?.('Reading source local encrypted store', 0, 1);
    const dbPath = path.resolve(process.cwd(), `userData/databases/${companyId}.db`);
    if (!fs.existsSync(dbPath)) {
      throw new Error(`Local SQLite database not found at ${dbPath}`);
    }

    const dek = company.encryptedDek ? this.clusterMgr.decryptConnectionString(company.encryptedDek) : 'default-key';
    const localCore = require('@hr360/local-core');
    const sqliteConn = new localCore.DatabaseConnection({ dbPath, encryptionKey: dek });
    const sqliteServices = new SqliteTenantServices(sqliteConn);

    // 3. Connect to target cloud cluster
    const parsed = this.clusterMgr.parseUri(cloudConnectionString);
    const mysql = require('mysql2/promise');
    const cloudPool = mysql.createPool({
      host: parsed.host,
      port: parsed.port,
      user: parsed.user,
      password: parsed.password,
      database: parsed.database,
      ssl: parsed.ssl ? { rejectUnauthorized: true } : undefined,
    });
    const cloudServices = new MysqlTenantServices(cloudPool);

    const ctx = { companyId, userId: 'MIGRATOR', role: 'SYSTEM' };
    const migratedCounts: Record<string, number> = {};

    try {
      // 4. Migrate Employees
      const employees = await sqliteServices.employee.list(ctx);
      migratedCounts['employees'] = employees.length;
      for (let i = 0; i < employees.length; i++) {
        const emp = employees[i];
        await cloudServices.employee.create(ctx, emp);
        onProgress?.('Migrating Employees', i + 1, employees.length);
      }

      // 5. Migrate Attendance
      const attendance = await sqliteServices.attendance.listRecords(ctx);
      migratedCounts['attendance'] = attendance.length;
      for (let i = 0; i < attendance.length; i++) {
        const punch = attendance[i];
        await cloudServices.attendance.recordPunch(ctx, punch);
        onProgress?.('Migrating Attendance', i + 1, attendance.length);
      }

      // 6. Update Company storageMode in Master Database
      const encryptedConn = this.clusterMgr.encryptConnectionString(cloudConnectionString);
      await prisma.$transaction([
        prisma.company.update({
          where: { id: companyId },
          data: { storageMode: 'CLOUD_DEDICATED' },
        }),
        prisma.tenantDbConnection.upsert({
          where: { companyId },
          create: {
            companyId,
            encryptedConnection: encryptedConn,
            hostFingerprint,
            status: 'ACTIVE',
            schemaVersion: 1,
            provisionedAt: new Date(),
          },
          update: {
            encryptedConnection: encryptedConn,
            hostFingerprint,
            status: 'ACTIVE',
            lastTestedAt: new Date(),
          },
        }),
      ]);

      return { success: true, migratedCounts };
    } finally {
      sqliteConn.close();
      await cloudPool.end();
    }
  }

  /**
   * Migrates from cloud cluster to local encrypted SQLite file (Export / Offline activation)
   */
  public async migrateCloudToLocal(
    companyId: string,
    targetDbPath: string,
    encryptionKey: string
  ): Promise<{ success: boolean; totalExported: number }> {
    const prisma = getMasterPrismaClient();
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      include: { tenantConnection: true },
    });

    if (!company?.tenantConnection?.encryptedConnection) {
      throw new Error(`Cloud connection not found for company ${companyId}`);
    }

    const rawUri = this.clusterMgr.decryptConnectionString(company.tenantConnection.encryptedConnection);
    const parsed = this.clusterMgr.parseUri(rawUri);
    const mysql = require('mysql2/promise');
    const cloudPool = mysql.createPool({
      host: parsed.host,
      port: parsed.port,
      user: parsed.user,
      password: parsed.password,
      database: parsed.database,
      ssl: parsed.ssl ? { rejectUnauthorized: true } : undefined,
    });
    const cloudServices = new MysqlTenantServices(cloudPool);

    // Initialize target SQLite database
    const localCore = require('@hr360/local-core');
    const sqliteConn = new localCore.DatabaseConnection({ dbPath: targetDbPath, encryptionKey });
    const migrator = new localCore.DatabaseMigrator(sqliteConn);
    migrator.migrate({ companyId, appVersion: '1.0.0' });
    const sqliteServices = new SqliteTenantServices(sqliteConn);

    const ctx = { companyId, userId: 'MIGRATOR', role: 'SYSTEM' };
    let totalExported = 0;

    try {
      const employees = await cloudServices.employee.list(ctx);
      for (const emp of employees) {
        await sqliteServices.employee.create(ctx, emp);
        totalExported++;
      }

      return { success: true, totalExported };
    } finally {
      sqliteConn.close();
      await cloudPool.end();
    }
  }
}
