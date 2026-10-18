import mysql from 'mysql2/promise';
import crypto from 'node:crypto';
import dns from 'node:dns/promises';
import { KmsEnvelopeService } from './kms-envelope';
import { initMysqlTenantSchema } from './tenant-mysql-schema';

export interface ConnectionTestResult {
  ok: boolean;
  error?: string;
  hostFingerprint?: string;
  isTargetEmpty?: boolean;
}

export interface ParsedDbUri {
  protocol: string;
  user: string;
  password?: string;
  host: string;
  port: number;
  database: string;
  ssl: boolean;
}

export class TenantClusterManager {
  private readonly kms: KmsEnvelopeService;

  constructor(kms?: KmsEnvelopeService) {
    this.kms = kms || new KmsEnvelopeService();
  }

  /**
   * Parses connection string (e.g. mysql://user:pass@host:port/database?ssl=true)
   */
  public parseUri(uri: string): ParsedDbUri {
    const trimmed = uri.trim();
    const url = new URL(trimmed);
    const protocol = url.protocol.replace(':', '');
    const user = decodeURIComponent(url.username);
    const password = url.password ? decodeURIComponent(url.password) : undefined;
    const host = url.hostname;
    const port = url.port ? parseInt(url.port, 10) : 3306;
    const database = url.pathname.replace(/^\//, '');
    const sslParam = url.searchParams.get('ssl');
    const ssl = sslParam === 'true' || sslParam === '1' || url.searchParams.has('sslaccept');

    return { protocol, user, password, host, port, database, ssl };
  }

  /**
   * SSRF and loopback validation: blocks loopback, private ranges, link-local, AWS metadata
   */
  public async validateSsrf(host: string): Promise<void> {
    if (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '0.0.0.0' ||
      host === '::1' ||
      host.endsWith('.internal') ||
      host.endsWith('.local')
    ) {
      throw new Error('Host connection to internal/loopback network targets is strictly prohibited.');
    }

    try {
      const addresses = await dns.lookup(host, { all: true });
      for (const addr of addresses) {
        const ip = addr.address;
        if (
          ip.startsWith('127.') ||
          ip.startsWith('10.') ||
          ip.startsWith('192.168.') ||
          ip.startsWith('169.254.') || // AWS/cloud metadata address
          (ip.startsWith('172.') && this.is172Private(ip))
        ) {
          throw new Error('Database host resolved to private or restricted network address.');
        }
      }
    } catch (err: any) {
      if (err.message.includes('restricted network') || err.message.includes('prohibited')) {
        throw err;
      }
      // DNS lookup failure
      throw new Error(`Unable to resolve database hostname: ${err.message}`);
    }
  }

  private is172Private(ip: string): boolean {
    const parts = ip.split('.').map(Number);
    return parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31;
  }

  /**
   * Computes non-reversible host fingerprint: SHA256(host:port:database)
   */
  public computeFingerprint(host: string, port: number, database: string): string {
    return crypto.createHash('sha256').update(`${host.toLowerCase()}:${port}:${database}`).digest('hex');
  }

  /**
   * Tests connection, verifies TLS/network, checks DDL capabilities, and checks if schema is empty
   */
  public async testConnection(connectionString: string, caCert?: string): Promise<ConnectionTestResult> {
    try {
      const parsed = this.parseUri(connectionString);
      await this.validateSsrf(parsed.host);

      if (!parsed.database) {
        return { ok: false, error: 'Database name must be specified in connection URI.' };
      }

      const sslConfig = caCert
        ? { ca: caCert, rejectUnauthorized: true }
        : parsed.ssl || parsed.port === 4000
        ? { rejectUnauthorized: true }
        : undefined;

      const connection = await mysql.createConnection({
        host: parsed.host,
        port: parsed.port,
        user: parsed.user,
        password: parsed.password,
        database: parsed.database,
        ssl: sslConfig,
        connectTimeout: 10000,
      });

      try {
        // 1. Verify basic query execution
        const [rows] = await connection.query('SELECT 1 as ping') as any[];
        if (!rows || rows[0]?.ping !== 1) {
          return { ok: false, error: 'Database query execution test failed.' };
        }

        // 2. Check if target database is empty or already provisioned
        const [tableRows] = await connection.query(
          `SELECT COUNT(*) as cnt FROM information_schema.tables WHERE table_schema = ?`,
          [parsed.database]
        ) as any[];
        const tableCount = Number(tableRows[0]?.cnt || 0);

        // 3. Test DDL capability with a transient check table
        await connection.query('CREATE TABLE IF NOT EXISTS _hr360_ddl_test (id INT PRIMARY KEY)');
        await connection.query('DROP TABLE IF EXISTS _hr360_ddl_test');

        const hostFingerprint = this.computeFingerprint(parsed.host, parsed.port, parsed.database);

        return {
          ok: true,
          hostFingerprint,
          isTargetEmpty: tableCount === 0,
        };
      } finally {
        await connection.end();
      }
    } catch (err: any) {
      return { ok: false, error: err.message || 'Connection test failed.' };
    }
  }

  /**
   * Idempotently provisions a dedicated cloud schema and initializes default admin user
   */
  public async provisionDedicatedCluster(
    connectionString: string,
    initialAdmin: { email: string; fullName: string; passwordHash: string },
    caCert?: string
  ): Promise<{ hostFingerprint: string; schemaVersion: number }> {
    const parsed = this.parseUri(connectionString);
    await this.validateSsrf(parsed.host);

    const sslConfig = caCert
      ? { ca: caCert, rejectUnauthorized: true }
      : parsed.ssl || parsed.port === 4000
      ? { rejectUnauthorized: true }
      : undefined;

    const connection = await mysql.createConnection({
      host: parsed.host,
      port: parsed.port,
      user: parsed.user,
      password: parsed.password,
      database: parsed.database,
      ssl: sslConfig,
      connectTimeout: 12000,
    });

    try {
      // 1. Run full idempotent DDL migration
      await initMysqlTenantSchema(connection);

      // 2. Seed initial admin user if not exists
      const [existingUsers] = await connection.query(
        `SELECT id FROM local_users WHERE email = ?`,
        [initialAdmin.email.toLowerCase()]
      ) as any[];

      const now = new Date().toISOString();
      if (!existingUsers || existingUsers.length === 0) {
        const adminId = crypto.randomUUID();
        await connection.query(
          `INSERT INTO local_users (id, email, full_name, role, password_hash, is_active, failed_login_attempts, created_at, updated_at)
           VALUES (?, ?, ?, 'COMPANY_ADMIN', ?, 1, 0, ?, ?)`,
          [adminId, initialAdmin.email.toLowerCase(), initialAdmin.fullName, initialAdmin.passwordHash, now, now]
        );
      }

      // 3. Initialize default company settings if empty
      const [settingsRows] = await connection.query(`SELECT id FROM company_settings LIMIT 1`) as any[];
      if (!settingsRows || settingsRows.length === 0) {
        const settingsId = crypto.randomUUID();
        await connection.query(
          `INSERT INTO company_settings (id, company_name, contact_email, country, fiscal_year_start_month, standard_working_hours_per_day, probation_duration_months, updated_at)
           VALUES (?, 'My Organization', ?, 'PK', 7, 8, 3, ?)`,
          [settingsId, initialAdmin.email.toLowerCase(), now]
        );
      }

      const hostFingerprint = this.computeFingerprint(parsed.host, parsed.port, parsed.database);
      return { hostFingerprint, schemaVersion: 1 };
    } finally {
      await connection.end();
    }
  }

  /**
   * Encrypts the connection string and optional CA cert with master KEK
   */
  public encryptConnectionString(connectionString: string, caCert?: string): string {
    if (caCert && caCert.trim()) {
      return this.kms.wrapDek(JSON.stringify({ connectionString, caCert: caCert.trim() }));
    }
    return this.kms.wrapDek(connectionString);
  }

  /**
   * Decrypts the raw connection string using master KEK (backward compatible)
   */
  public decryptConnectionString(encryptedConnection: string): string {
    const raw = this.kms.unwrapDek(encryptedConnection);
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.connectionString === 'string') {
        return parsed.connectionString;
      }
    } catch {}
    return raw;
  }

  /**
   * Decrypts both connection string and optional CA cert
   */
  public decryptConnectionPayload(encryptedConnection: string): { connectionString: string; caCert?: string } {
    const raw = this.kms.unwrapDek(encryptedConnection);
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.connectionString === 'string') {
        return { connectionString: parsed.connectionString, caCert: parsed.caCert };
      }
    } catch {}
    return { connectionString: raw };
  }
}
