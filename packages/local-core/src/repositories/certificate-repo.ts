import crypto from 'node:crypto';
import { DatabaseConnection } from '../database/connection';

export interface CertificateEntity {
  id: string;
  employeeId: string;
  certificateType: 'EXPERIENCE' | 'SALARY_INCREMENT' | 'SERVICE' | 'RELIEVING';
  verificationCode: string;
  issueDate: string;
  title: string;
  detailsJson: string;
  isRevoked: boolean;
  createdAt: string;
  employeeName?: string;
  employeeCode?: string;
}

export interface IssueCertificateInput {
  employeeId: string;
  certificateType: 'EXPERIENCE' | 'SALARY_INCREMENT' | 'SERVICE' | 'RELIEVING';
  title: string;
  detailsJson: string;
  issueDate?: string;
}

export class CertificateRepository {
  private readonly connection: DatabaseConnection;

  constructor(connection: DatabaseConnection) {
    this.connection = connection;
  }

  public issue(input: IssueCertificateInput): CertificateEntity {
    const raw = this.connection.getRawDb();
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const issueDate = input.issueDate || now.split('T')[0];

    // Generate unique verification code e.g. "HR360-CERT-9A8B7C"
    const randomHex = crypto.randomBytes(4).toString('hex').toUpperCase();
    const verificationCode = `HR360-${input.certificateType.substring(0, 3)}-${randomHex}`;

    raw.prepare(`
      INSERT INTO certificates (
        id, employee_id, certificate_type, verification_code,
        issue_date, title, details_json, is_revoked, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)
    `).run(
      id,
      input.employeeId,
      input.certificateType,
      verificationCode,
      issueDate,
      input.title,
      input.detailsJson,
      now
    );

    return {
      id,
      employeeId: input.employeeId,
      certificateType: input.certificateType,
      verificationCode,
      issueDate,
      title: input.title,
      detailsJson: input.detailsJson,
      isRevoked: false,
      createdAt: now,
    };
  }

  public list(options?: {
    employeeId?: string;
    certificateType?: string;
    limit?: number;
    offset?: number;
  }): { items: CertificateEntity[]; total: number } {
    const raw = this.connection.getRawDb();
    const conditions: string[] = [];
    const params: any[] = [];

    if (options?.employeeId) {
      conditions.push('c.employee_id = ?');
      params.push(options.employeeId);
    }
    if (options?.certificateType && options.certificateType !== 'ALL') {
      conditions.push('c.certificate_type = ?');
      params.push(options.certificateType);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const countRow = raw.prepare(`
      SELECT COUNT(*) as cnt
      FROM certificates c
      ${whereClause}
    `).get(...params) as { cnt: number };

    const total = countRow.cnt;
    const limit = options?.limit ?? 50;
    const offset = options?.offset ?? 0;

    const rows = raw.prepare(`
      SELECT c.*, (e.first_name || ' ' || e.last_name) as emp_name, e.employee_code as emp_code
      FROM certificates c
      LEFT JOIN employees e ON c.employee_id = e.id
      ${whereClause}
      ORDER BY c.created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, limit, offset) as any[];

    return {
      items: rows.map((r) => this.mapRow(r)),
      total,
    };
  }

  public getById(id: string): CertificateEntity | null {
    const raw = this.connection.getRawDb();
    const row = raw.prepare(`
      SELECT c.*, (e.first_name || ' ' || e.last_name) as emp_name, e.employee_code as emp_code
      FROM certificates c
      LEFT JOIN employees e ON c.employee_id = e.id
      WHERE c.id = ?
    `).get(id) as any;
    return row ? this.mapRow(row) : null;
  }

  public getByVerificationCode(code: string): CertificateEntity | null {
    const raw = this.connection.getRawDb();
    const row = raw.prepare(`
      SELECT c.*, (e.first_name || ' ' || e.last_name) as emp_name, e.employee_code as emp_code
      FROM certificates c
      LEFT JOIN employees e ON c.employee_id = e.id
      WHERE c.verification_code = ?
    `).get(code) as any;
    return row ? this.mapRow(row) : null;
  }

  public revoke(id: string): boolean {
    const raw = this.connection.getRawDb();
    const res = raw.prepare(`UPDATE certificates SET is_revoked = 1 WHERE id = ?`).run(id);
    return res.changes > 0;
  }

  private mapRow(r: any): CertificateEntity {
    return {
      id: r.id,
      employeeId: r.employee_id,
      certificateType: r.certificate_type,
      verificationCode: r.verification_code,
      issueDate: r.issue_date,
      title: r.title,
      detailsJson: r.details_json,
      isRevoked: r.is_revoked === 1,
      createdAt: r.created_at,
      employeeName: r.emp_name,
      employeeCode: r.emp_code,
    };
  }
}
