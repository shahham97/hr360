import crypto from 'node:crypto';
import { DatabaseConnection } from '../database/connection';

export interface LocalUserEntity {
  id: string;
  email: string;
  fullName: string;
  role: 'COMPANY_ADMIN' | 'HR_MANAGER' | 'PAYROLL_OFFICER' | 'RECRUITER' | 'LINE_MANAGER' | 'READ_ONLY';
  passwordHash: string;
  isActive: boolean;
  failedLoginAttempts: number;
  lockedUntil?: string | null;
  createdAt: string;
  updatedAt: string;
}

export class LocalUserRepository {
  private readonly connection: DatabaseConnection;

  constructor(connection: DatabaseConnection) {
    this.connection = connection;
  }

  public findByEmail(email: string): LocalUserEntity | null {
    const raw = this.connection.getRawDb();
    const row = raw.prepare(`SELECT * FROM local_users WHERE email = ?`).get(email.toLowerCase()) as any;
    return row ? this.mapRow(row) : null;
  }

  public findById(id: string): LocalUserEntity | null {
    const raw = this.connection.getRawDb();
    const row = raw.prepare(`SELECT * FROM local_users WHERE id = ?`).get(id) as any;
    return row ? this.mapRow(row) : null;
  }

  public createUser(input: {
    email: string;
    fullName: string;
    role: LocalUserEntity['role'];
    passwordHash: string;
  }): LocalUserEntity {
    const raw = this.connection.getRawDb();
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    raw.prepare(`
      INSERT INTO local_users (
        id, email, full_name, role, password_hash, is_active,
        failed_login_attempts, locked_until, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, 1, 0, NULL, ?, ?)
    `).run(
      id,
      input.email.toLowerCase(),
      input.fullName,
      input.role,
      input.passwordHash,
      now,
      now
    );

    return {
      id,
      email: input.email.toLowerCase(),
      fullName: input.fullName,
      role: input.role,
      passwordHash: input.passwordHash,
      isActive: true,
      failedLoginAttempts: 0,
      lockedUntil: null,
      createdAt: now,
      updatedAt: now,
    };
  }

  public recordFailedLogin(id: string): { attempts: number; isLocked: boolean; lockedUntil?: string } {
    const raw = this.connection.getRawDb();
    const user = raw.prepare(`SELECT failed_login_attempts FROM local_users WHERE id = ?`).get(id) as any;
    if (!user) throw new Error('User not found');

    const attempts = user.failed_login_attempts + 1;
    let lockedUntil: string | null = null;
    let isLocked = false;

    // Lock for 15 minutes after 5 failed attempts
    if (attempts >= 5) {
      isLocked = true;
      lockedUntil = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    }

    const now = new Date().toISOString();
    raw.prepare(`
      UPDATE local_users
      SET failed_login_attempts = ?, locked_until = ?, updated_at = ?
      WHERE id = ?
    `).run(attempts, lockedUntil, now, id);

    return { attempts, isLocked, lockedUntil: lockedUntil ?? undefined };
  }

  public recordSuccessfulLogin(id: string): void {
    const raw = this.connection.getRawDb();
    const now = new Date().toISOString();
    raw.prepare(`
      UPDATE local_users
      SET failed_login_attempts = 0, locked_until = NULL, updated_at = ?
      WHERE id = ?
    `).run(now, id);
  }

  public listUsers(): LocalUserEntity[] {
    const raw = this.connection.getRawDb();
    const rows = raw.prepare(`SELECT * FROM local_users ORDER BY full_name ASC`).all() as any[];
    return rows.map((r) => this.mapRow(r));
  }

  public count(): number {
    const raw = this.connection.getRawDb();
    const row = raw.prepare(`SELECT COUNT(*) as c FROM local_users`).get() as { c: number };
    return row.c;
  }

  private mapRow(r: any): LocalUserEntity {
    return {
      id: r.id,
      email: r.email,
      fullName: r.full_name,
      role: r.role,
      passwordHash: r.password_hash,
      isActive: r.is_active === 1,
      failedLoginAttempts: r.failed_login_attempts,
      lockedUntil: r.locked_until,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    };
  }
}
