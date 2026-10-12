import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { DatabaseConnection } from './connection';
import { DatabaseMigrator } from './migrator';

export interface BackupMetadata {
  backupId: string;
  companyId: string;
  schemaVersion: number;
  sizeBytes: number;
  checksumSha256: string;
  filePath: string;
  createdAt: string;
}

export interface RestoreResult {
  success: boolean;
  backupId?: string;
  restoredAt: string;
  error?: string;
}

const BACKUP_SALT = Buffer.from('HR360_OFFLINE_BACKUP_SALT_v1', 'utf8');
const BACKUP_INFO = Buffer.from('HR360_BACKUP_ENCRYPTION_KEY', 'utf8');
const MAGIC_HEADER = Buffer.from('HR360BAK1', 'utf8'); // 9 bytes magic header

export class BackupManager {
  private readonly connection: DatabaseConnection;
  private readonly encryptionKey: string;
  private readonly companyId: string;

  constructor(connection: DatabaseConnection, encryptionKey: string, companyId: string) {
    this.connection = connection;
    this.encryptionKey = encryptionKey;
    this.companyId = companyId;
  }

  /**
   * Derives a dedicated 256-bit backup encryption key from the DEK using HKDF
   */
  private deriveBackupKey(): Buffer {
    const rawDek = Buffer.from(this.encryptionKey, 'utf8');
    return Buffer.from(crypto.hkdfSync('sha256', rawDek, BACKUP_SALT, BACKUP_INFO, 32));
  }

  /**
   * Creates an encrypted, atomic backup snapshot (.sql.hr360bak)
   */
  public createBackup(targetDirectory: string, customName?: string): BackupMetadata {
    if (!fs.existsSync(targetDirectory)) {
      fs.mkdirSync(targetDirectory, { recursive: true });
    }

    // 1. Verify integrity of live database before backup
    const integrity = this.connection.checkIntegrity();
    if (!integrity.ok) {
      throw new Error(`Integrity check failed prior to backup: ${integrity.message}`);
    }

    const backupId = crypto.randomUUID();
    const timestampStr = new Date().toISOString().replace(/[:.]/g, '-');
    const baseName = customName || `backup_${this.companyId}_${timestampStr}`;
    const finalBackupPath = path.join(targetDirectory, `${baseName}.sql.hr360bak`);
    const tempVacuumPath = path.join(targetDirectory, `${baseName}.tmp.db`);

    try {
      // 2. Perform online frozen snapshot via VACUUM INTO
      this.connection.vacuumInto(tempVacuumPath);

      // 3. Read snapshot bytes
      const rawSnapshotBytes = fs.readFileSync(tempVacuumPath);
      const snapshotChecksum = crypto.createHash('sha256').update(rawSnapshotBytes).digest('hex');

      // 4. Encrypt snapshot with HKDF-derived backup key using AES-256-GCM
      const backupKey = this.deriveBackupKey();
      const iv = crypto.randomBytes(12);
      const cipher = crypto.createCipheriv('aes-256-gcm', backupKey, iv);

      const encryptedData = Buffer.concat([cipher.update(rawSnapshotBytes), cipher.final()]);
      const authTag = cipher.getAuthTag();

      // File structure:
      // [9 bytes MAGIC_HEADER] + [12 bytes IV] + [16 bytes AUTH_TAG] + [ENCRYPTED_DATA]
      const finalBuffer = Buffer.concat([
        MAGIC_HEADER,
        iv,
        authTag,
        encryptedData,
      ]);

      fs.writeFileSync(finalBackupPath, finalBuffer);

      // 5. Clean up temporary unencrypted vacuum file
      if (fs.existsSync(tempVacuumPath)) {
        fs.unlinkSync(tempVacuumPath);
      }

      const migrator = new DatabaseMigrator(this.connection);
      const schemaVersion = migrator.getCurrentSchemaVersion();

      return {
        backupId,
        companyId: this.companyId,
        schemaVersion,
        sizeBytes: finalBuffer.length,
        checksumSha256: snapshotChecksum,
        filePath: finalBackupPath,
        createdAt: new Date().toISOString(),
      };
    } catch (err: any) {
      if (fs.existsSync(tempVacuumPath)) {
        try { fs.unlinkSync(tempVacuumPath); } catch {}
      }
      throw new Error(`Backup failed: ${err.message}`);
    }
  }

  /**
   * Restores an encrypted .sql.hr360bak file into the target database path
   */
  public static restoreBackup(
    backupFilePath: string,
    targetDbPath: string,
    encryptionKey: string
  ): RestoreResult {
    if (!fs.existsSync(backupFilePath)) {
      return { success: false, restoredAt: new Date().toISOString(), error: 'Backup file does not exist.' };
    }

    const backupBytes = fs.readFileSync(backupFilePath);
    if (backupBytes.length < MAGIC_HEADER.length + 12 + 16) {
      return { success: false, restoredAt: new Date().toISOString(), error: 'Corrupt or incomplete backup file.' };
    }

    // 1. Verify Magic Header
    const magic = backupBytes.subarray(0, MAGIC_HEADER.length);
    if (!magic.equals(MAGIC_HEADER)) {
      return { success: false, restoredAt: new Date().toISOString(), error: 'Invalid backup format (unknown magic header).' };
    }

    const iv = backupBytes.subarray(MAGIC_HEADER.length, MAGIC_HEADER.length + 12);
    const authTag = backupBytes.subarray(MAGIC_HEADER.length + 12, MAGIC_HEADER.length + 12 + 16);
    const ciphertext = backupBytes.subarray(MAGIC_HEADER.length + 12 + 16);

    try {
      // 2. Decrypt with derived key
      const rawDek = Buffer.from(encryptionKey, 'utf8');
      const backupKey = Buffer.from(crypto.hkdfSync('sha256', rawDek, BACKUP_SALT, BACKUP_INFO, 32));

      const decipher = crypto.createDecipheriv('aes-256-gcm', backupKey, iv);
      decipher.setAuthTag(authTag);
      const decryptedDbBytes = Buffer.concat([decipher.update(ciphertext), decipher.final()]);

      // 3. Write to temporary verification file
      const tempRestorePath = `${targetDbPath}.tmp_verify.db`;
      fs.writeFileSync(tempRestorePath, decryptedDbBytes);

      // 4. Verify integrity of the restored database with SQLCipher
      const testConn = new DatabaseConnection({
        dbPath: tempRestorePath,
        encryptionKey,
      });

      const integrity = testConn.checkIntegrity();
      testConn.close();

      if (!integrity.ok) {
        if (fs.existsSync(tempRestorePath)) fs.unlinkSync(tempRestorePath);
        return { success: false, restoredAt: new Date().toISOString(), error: `Restored database failed integrity check: ${integrity.message}` };
      }

      // 5. Create safety copy of existing DB if present
      if (fs.existsSync(targetDbPath)) {
        const safetyBakPath = `${targetDbPath}.pre-restore-${Date.now()}.bak`;
        fs.copyFileSync(targetDbPath, safetyBakPath);
      }

      // 6. Overwrite target database with verified restored file
      fs.copyFileSync(tempRestorePath, targetDbPath);
      fs.unlinkSync(tempRestorePath);

      return {
        success: true,
        restoredAt: new Date().toISOString(),
      };
    } catch (err: any) {
      return {
        success: false,
        restoredAt: new Date().toISOString(),
        error: `Decryption or restore failed: ${err.message}`,
      };
    }
  }
}
