import fs from 'node:fs';
import path from 'node:path';
import DatabaseConstructor, { Database as DatabaseType } from 'better-sqlite3-multiple-ciphers';

export interface DatabaseConnectionOptions {
  dbPath: string;
  encryptionKey: string;
  readonly?: boolean;
}

export class DatabaseConnection {
  private db: DatabaseType | null = null;
  private readonly dbPath: string;
  private keyBuffer: Buffer | null = null;

  constructor(options: DatabaseConnectionOptions) {
    this.dbPath = options.dbPath;

    // Ensure directory exists
    const dir = path.dirname(this.dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Open database
    this.db = new DatabaseConstructor(this.dbPath, {
      readonly: options.readonly ?? false,
      fileMustExist: false,
      timeout: 5000,
    });

    // Store key in memory buffer for wipe capability
    this.keyBuffer = Buffer.from(options.encryptionKey, 'utf8');

    // Apply SQLCipher encryption key
    // Using hex/raw string format
    this.db.pragma(`key = '${options.encryptionKey}'`);
    this.db.pragma("cipher = 'sqlcipher'");

    // Apply enterprise performance and ACID durability pragmas
    this.db.pragma('foreign_keys = ON');
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('synchronous = NORMAL'); // ACID safe with WAL mode, non-blocking
    this.db.pragma('busy_timeout = 5000');
    this.db.pragma('temp_store = MEMORY');
  }

  public getRawDb(): DatabaseType {
    if (!this.db) {
      throw new Error('Database is closed or cryptographically locked.');
    }
    return this.db;
  }

  public checkIntegrity(): { ok: boolean; message: string } {
    if (!this.db) return { ok: false, message: 'Database closed' };
    try {
      const result = this.db.pragma('integrity_check') as Array<{ integrity_check: string }>;
      const first = result[0]?.integrity_check;
      if (first === 'ok') {
        return { ok: true, message: 'ok' };
      }
      return { ok: false, message: JSON.stringify(result) };
    } catch (err: any) {
      return { ok: false, message: err.message };
    }
  }

  public vacuumInto(targetBackupPath: string): void {
    if (!this.db) throw new Error('Database is closed.');
    if (fs.existsSync(targetBackupPath)) {
      fs.unlinkSync(targetBackupPath);
    }
    // Clean, consistent online backup snapshot
    this.db.prepare(`VACUUM INTO ?`).run(targetBackupPath);
  }

  public transaction<T>(fn: () => T): T {
    if (!this.db) throw new Error('Database is closed.');
    return this.db.transaction(fn)();
  }

  /**
   * Closes database handle and cryptographically zeroes key material from memory
   */
  public close(): void {
    if (this.db) {
      try {
        this.db.close();
      } catch {}
      this.db = null;
    }

    if (this.keyBuffer) {
      this.keyBuffer.fill(0); // Zero memory buffer
      this.keyBuffer = null;
    }
  }

  public isOpen(): boolean {
    return this.db !== null;
  }

  public getPath(): string {
    return this.dbPath;
  }
}
