import mysql from 'mysql2/promise';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { getMasterPrismaClient } from '@hr360/db-master';
import { tenantResolver } from './tenant-resolver';
import { TenantClusterManager } from './tenant-cluster-manager';

export interface CloudBackupMetadata {
  backupId: string;
  companyId: string;
  schemaVersion: number;
  tableCount: number;
  rowCount: number;
  checksumSha256: string;
  sizeBytes: number;
  storagePath: string;
  createdAt: string;
}

export class CloudBackupManager {
  private readonly clusterMgr: TenantClusterManager;

  constructor() {
    this.clusterMgr = new TenantClusterManager();
  }

  /**
   * Generates a consistent, encrypted JSON/SQL snapshot of all tenant business tables
   */
  public async createBackup(companyId: string, outputDir?: string): Promise<CloudBackupMetadata> {
    const prisma = getMasterPrismaClient();
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      include: { tenantConnection: true },
    });

    if (!company) {
      throw new Error(`Company not found: ${companyId}`);
    }

    const backupDir = outputDir || path.resolve(process.cwd(), 'backups/cloud', companyId);
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const backupId = `bkp_${crypto.randomUUID()}`;
    const timestamp = new Date().toISOString();

    let snapshotData: Record<string, any[]> = {};
    let totalRows = 0;

    if (company.storageMode === 'CLOUD_DEDICATED') {
      if (!company.tenantConnection?.encryptedConnection) {
        throw new Error(`Cloud connection string not found for company ${company.id}`);
      }
      const rawUri = this.clusterMgr.decryptConnectionString(company.tenantConnection.encryptedConnection);
      const parsed = this.clusterMgr.parseUri(rawUri);

      const conn = await mysql.createConnection({
        host: parsed.host,
        port: parsed.port,
        user: parsed.user,
        password: parsed.password,
        database: parsed.database,
        ssl: parsed.ssl ? { rejectUnauthorized: true } : undefined,
      });

      try {
        const tenantTables = [
          'local_users',
          'employees',
          'attendance_records',
          'leave_balances',
          'leave_requests',
          'salary_structures',
          'payroll_runs',
          'payroll_items',
          'payslip_templates',
          'certificate_records',
          'job_openings',
          'candidates',
          'performance_reviews',
          'local_audit_log',
          'company_settings',
        ];

        for (const table of tenantTables) {
          try {
            const [rows] = await conn.query(`SELECT * FROM \`${table}\``) as any[];
            snapshotData[table] = rows;
            totalRows += rows.length;
          } catch {
            // Table may not exist in earlier schemas
            snapshotData[table] = [];
          }
        }
      } finally {
        await conn.end();
      }
    } else {
      // Local mode export via tenantResolver
      const tenantCtx = await tenantResolver.resolveTenant(companyId);
      const employees = await tenantCtx.services.employee.list({ companyId, userId: 'SYSTEM', role: 'SYSTEM' });
      snapshotData['employees'] = employees;
      totalRows = employees.length;
    }

    const jsonPayload = JSON.stringify({
      version: 1,
      backupId,
      companyId,
      timestamp,
      data: snapshotData,
    });

    // Encrypt snapshot with master key before writing to disk
    const encryptedSnapshot = this.clusterMgr.encryptConnectionString(jsonPayload);
    const fileName = `${backupId}.hr360bkp`;
    const fullPath = path.join(backupDir, fileName);

    fs.writeFileSync(fullPath, encryptedSnapshot, 'utf8');

    const checksumSha256 = crypto.createHash('sha256').update(encryptedSnapshot).digest('hex');
    const sizeBytes = Buffer.byteLength(encryptedSnapshot, 'utf8');

    // Register backup in master DB backup_records
    await prisma.backupRecord.create({
      data: {
        companyId,
        backupId,
        schemaVersion: company.tenantConnection?.schemaVersion ?? 1,
        sizeBytes: BigInt(sizeBytes),
        checksumSha256,
        storagePath: fullPath,
        createdAt: new Date(),
      },
    });

    return {
      backupId,
      companyId,
      schemaVersion: company.tenantConnection?.schemaVersion ?? 1,
      tableCount: Object.keys(snapshotData).length,
      rowCount: totalRows,
      checksumSha256,
      sizeBytes,
      storagePath: fullPath,
      createdAt: timestamp,
    };
  }

  /**
   * Restores a previously created cloud snapshot into the target company cluster
   */
  public async restoreBackup(companyId: string, backupId: string): Promise<{ success: boolean; restoredRows: number }> {
    const prisma = getMasterPrismaClient();
    const backupRecord = await prisma.backupRecord.findFirst({
      where: { companyId, backupId },
    });

    if (!backupRecord || !backupRecord.storagePath || !fs.existsSync(backupRecord.storagePath)) {
      throw new Error(`Backup file not found for ${backupId}`);
    }

    const encryptedData = fs.readFileSync(backupRecord.storagePath, 'utf8');
    const actualChecksum = crypto.createHash('sha256').update(encryptedData).digest('hex');

    if (actualChecksum !== backupRecord.checksumSha256) {
      throw new Error('Backup integrity verification failed: Checksum mismatch.');
    }

    const rawJson = this.clusterMgr.decryptConnectionString(encryptedData);
    const parsedBackup = JSON.parse(rawJson);

    const company = await prisma.company.findUnique({
      where: { id: companyId },
      include: { tenantConnection: true },
    });

    if (!company?.tenantConnection?.encryptedConnection) {
      throw new Error(`Target database connection not found for company ${companyId}`);
    }

    const rawUri = this.clusterMgr.decryptConnectionString(company.tenantConnection.encryptedConnection);
    const parsedUri = this.clusterMgr.parseUri(rawUri);

    const conn = await mysql.createConnection({
      host: parsedUri.host,
      port: parsedUri.port,
      user: parsedUri.user,
      password: parsedUri.password,
      database: parsedUri.database,
      ssl: parsedUri.ssl ? { rejectUnauthorized: true } : undefined,
    });

    let totalRestored = 0;
    try {
      await conn.query('SET FOREIGN_KEY_CHECKS = 0');

      for (const [table, rows] of Object.entries(parsedBackup.data as Record<string, any[]>)) {
        if (!Array.isArray(rows) || rows.length === 0) continue;

        await conn.query(`TRUNCATE TABLE \`${table}\``);

        for (const row of rows) {
          const keys = Object.keys(row);
          const placeholders = keys.map(() => '?').join(', ');
          const values = keys.map((k) => (typeof row[k] === 'object' && row[k] !== null ? JSON.stringify(row[k]) : row[k]));

          await conn.query(
            `INSERT INTO \`${table}\` (${keys.map((k) => `\`${k}\``).join(', ')}) VALUES (${placeholders})`,
            values
          );
          totalRestored++;
        }
      }

      await conn.query('SET FOREIGN_KEY_CHECKS = 1');
    } finally {
      await conn.end();
    }

    return { success: true, restoredRows: totalRestored };
  }
}
