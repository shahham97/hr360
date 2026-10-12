import crypto from 'node:crypto';
import { DatabaseConnection } from '../database/connection';
import { MoneyMinor } from '../domain/money';

export interface EmployeeEntity {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  department: string;
  designation: string;
  branch: string;
  employmentType: 'FULL_TIME' | 'CONTRACT' | 'PROBATION' | 'INTERN';
  baseSalaryMinor: number;
  nationalId: string;
  dateOfBirth: string;
  gender: string;
  joiningDate: string;
  probationEndDate?: string | null;
  contractEndDate?: string | null;
  status: 'ACTIVE' | 'ON_LEAVE' | 'TERMINATED' | 'RESIGNED';
  address?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  bankAccountNumber?: string | null;
  bankName?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEmployeeInput {
  employeeCode: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  department: string;
  designation: string;
  branch: string;
  employmentType?: 'FULL_TIME' | 'CONTRACT' | 'PROBATION' | 'INTERN';
  baseSalaryPkr?: number;
  baseSalaryMinor?: number;
  nationalId: string;
  dateOfBirth: string;
  gender: string;
  joiningDate: string;
  probationEndDate?: string;
  contractEndDate?: string;
  address?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  bankAccountNumber?: string;
  bankName?: string;
}

export class EmployeeRepository {
  private readonly connection: DatabaseConnection;

  constructor(connection: DatabaseConnection) {
    this.connection = connection;
  }

  public count(status?: string): number {
    const raw = this.connection.getRawDb();
    if (status) {
      const row = raw.prepare(`SELECT COUNT(*) as c FROM employees WHERE status = ?`).get(status) as { c: number };
      return row.c;
    }
    const row = raw.prepare(`SELECT COUNT(*) as c FROM employees`).get() as { c: number };
    return row.c;
  }

  public create(input: CreateEmployeeInput, maxLimit?: number): EmployeeEntity {
    const raw = this.connection.getRawDb();

    // Check employee limit if specified
    if (maxLimit !== undefined && maxLimit > 0) {
      const currentCount = this.count('ACTIVE');
      if (currentCount >= maxLimit) {
        throw new Error(`Headcount quota reached (${currentCount}/${maxLimit}). Upgrade plan to add more employees.`);
      }
    }

    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const baseSalaryMinor = input.baseSalaryMinor ?? (input.baseSalaryPkr ? MoneyMinor.fromPkr(input.baseSalaryPkr) : 0);

    const emp: EmployeeEntity = {
      id,
      employeeCode: input.employeeCode,
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email.toLowerCase(),
      phone: input.phone,
      department: input.department,
      designation: input.designation,
      branch: input.branch,
      employmentType: input.employmentType ?? 'FULL_TIME',
      baseSalaryMinor,
      nationalId: input.nationalId,
      dateOfBirth: input.dateOfBirth,
      gender: input.gender,
      joiningDate: input.joiningDate,
      probationEndDate: input.probationEndDate ?? null,
      contractEndDate: input.contractEndDate ?? null,
      status: 'ACTIVE',
      address: input.address ?? null,
      emergencyContactName: input.emergencyContactName ?? null,
      emergencyContactPhone: input.emergencyContactPhone ?? null,
      bankAccountNumber: input.bankAccountNumber ?? null,
      bankName: input.bankName ?? null,
      createdAt: now,
      updatedAt: now,
    };

    raw.prepare(`
      INSERT INTO employees (
        id, employee_code, first_name, last_name, email, phone,
        department, designation, branch, employment_type, base_salary_minor,
        national_id, date_of_birth, gender, joining_date, probation_end_date,
        contract_end_date, status, address, emergency_contact_name,
        emergency_contact_phone, bank_account_number, bank_name, created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?, ?
      )
    `).run(
      emp.id, emp.employeeCode, emp.firstName, emp.lastName, emp.email, emp.phone,
      emp.department, emp.designation, emp.branch, emp.employmentType, emp.baseSalaryMinor,
      emp.nationalId, emp.dateOfBirth, emp.gender, emp.joiningDate, emp.probationEndDate,
      emp.contractEndDate, emp.status, emp.address, emp.emergencyContactName,
      emp.emergencyContactPhone, emp.bankAccountNumber, emp.bankName, emp.createdAt, emp.updatedAt
    );

    return emp;
  }

  public getById(id: string): EmployeeEntity | null {
    const raw = this.connection.getRawDb();
    const row = raw.prepare(`SELECT * FROM employees WHERE id = ?`).get(id) as any;
    return row ? this.mapRow(row) : null;
  }

  public getByCode(code: string): EmployeeEntity | null {
    const raw = this.connection.getRawDb();
    const row = raw.prepare(`SELECT * FROM employees WHERE employee_code = ?`).get(code) as any;
    return row ? this.mapRow(row) : null;
  }

  public list(options?: {
    department?: string;
    status?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): { items: EmployeeEntity[]; total: number } {
    const raw = this.connection.getRawDb();
    const conditions: string[] = [];
    const params: any[] = [];

    if (options?.department && options.department !== 'ALL') {
      conditions.push(`department = ?`);
      params.push(options.department);
    }

    if (options?.status && options.status !== 'ALL') {
      conditions.push(`status = ?`);
      params.push(options.status);
    }

    if (options?.search) {
      conditions.push(`(first_name LIKE ? OR last_name LIKE ? OR employee_code LIKE ? OR email LIKE ?)`);
      const s = `%${options.search}%`;
      params.push(s, s, s, s);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRow = raw.prepare(`SELECT COUNT(*) as total FROM employees ${whereClause}`).get(...params) as { total: number };
    const total = countRow.total;

    const limit = options?.limit ?? 50;
    const offset = options?.offset ?? 0;

    const rows = raw.prepare(`
      SELECT * FROM employees
      ${whereClause}
      ORDER BY employee_code ASC
      LIMIT ? OFFSET ?
    `).all(...params, limit, offset) as any[];

    return {
      items: rows.map((r) => this.mapRow(r)),
      total,
    };
  }

  public delete(id: string): boolean {
    const raw = this.connection.getRawDb();
    const res = raw.prepare(`DELETE FROM employees WHERE id = ?`).run(id);
    return res.changes > 0;
  }

  public bulkImport(employees: CreateEmployeeInput[], maxLimit?: number): { imported: number; errors: string[] } {
    const errors: string[] = [];
    let imported = 0;

    this.connection.transaction(() => {
      for (const input of employees) {
        try {
          this.create(input, maxLimit);
          imported++;
        } catch (err: any) {
          errors.push(`Row ${input.employeeCode || input.email}: ${err.message}`);
        }
      }
    });

    return { imported, errors };
  }

  private mapRow(r: any): EmployeeEntity {
    return {
      id: r.id,
      employeeCode: r.employee_code,
      firstName: r.first_name,
      lastName: r.last_name,
      email: r.email,
      phone: r.phone,
      department: r.department,
      designation: r.designation,
      branch: r.branch,
      employmentType: r.employment_type,
      baseSalaryMinor: r.base_salary_minor,
      nationalId: r.national_id,
      dateOfBirth: r.date_of_birth,
      gender: r.gender,
      joiningDate: r.joining_date,
      probationEndDate: r.probation_end_date,
      contractEndDate: r.contract_end_date,
      status: r.status,
      address: r.address,
      emergencyContactName: r.emergency_contact_name,
      emergencyContactPhone: r.emergency_contact_phone,
      bankAccountNumber: r.bank_account_number,
      bankName: r.bank_name,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    };
  }
}
