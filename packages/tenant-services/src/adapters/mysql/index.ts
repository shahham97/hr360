import mysql from 'mysql2/promise';
import crypto from 'node:crypto';
import {
  computeLocalPayrollItem,
  deduplicatePunches,
} from '@hr360/local-core';
import { AuditChain, GENESIS_HASH } from '@hr360/crypto-audit';
import {
  ITenantServices,
  IEmployeeService,
  IAttendanceService,
  ILeaveService,
  IPayrollService,
  IPayslipTemplateService,
  ICertificateService,
  IPerformanceService,
  IRecruitmentService,
  IAuditService,
  ISettingsService,
  IUserService,
  ActorContext,
  EmployeeDTO,
  CreateEmployeeDTO,
  AttendanceRecordDTO,
  PunchInput,
  LeaveBalanceDTO,
  LeaveRequestDTO,
  CreateLeaveRequestDTO,
  SalaryStructureDTO,
  PayrollRunDTO,
  PayrollItemDTO,
  PayslipTemplateDTO,
  CertificateDTO,
  PerformanceReviewDTO,
  JobOpeningDTO,
  CandidateDTO,
  AuditRecordDTO,
  CompanySettingsDTO,
  UserDTO,
} from '../../types';

export class MysqlTenantServices implements ITenantServices {
  private readonly pool: mysql.Pool | mysql.Connection;
  public readonly employee: IEmployeeService;
  public readonly attendance: IAttendanceService;
  public readonly leave: ILeaveService;
  public readonly payroll: IPayrollService;
  public readonly payslipTemplate: IPayslipTemplateService;
  public readonly certificate: ICertificateService;
  public readonly performance: IPerformanceService;
  public readonly recruitment: IRecruitmentService;
  public readonly audit: IAuditService;
  public readonly settings: ISettingsService;
  public readonly user: IUserService;

  constructor(pool: mysql.Pool | mysql.Connection) {
    this.pool = pool;

    this.employee = {
      async list(_ctx: ActorContext, options?: any): Promise<EmployeeDTO[]> {
        let sql = `SELECT * FROM employees WHERE 1=1`;
        const params: any[] = [];
        if (options?.department) {
          sql += ` AND department = ?`;
          params.push(options.department);
        }
        if (options?.status) {
          sql += ` AND status = ?`;
          params.push(options.status);
        }
        if (options?.search) {
          sql += ` AND (first_name LIKE ? OR last_name LIKE ? OR employee_code LIKE ? OR email LIKE ?)`;
          const term = `%${options.search}%`;
          params.push(term, term, term, term);
        }
        sql += ` ORDER BY created_at DESC`;
        if (options?.limit) {
          sql += ` LIMIT ?`;
          params.push(Number(options.limit));
          if (options?.offset) {
            sql += ` OFFSET ?`;
            params.push(Number(options.offset));
          }
        }
        const [rows] = await pool.query(sql, params) as any[];
        return rows.map((r: any) => ({
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
          baseSalaryMinor: Number(r.base_salary_minor),
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
        }));
      },

      async getById(_ctx: ActorContext, id: string): Promise<EmployeeDTO | null> {
        const [rows] = await pool.query(`SELECT * FROM employees WHERE id = ?`, [id]) as any[];
        if (!rows.length) return null;
        const r = rows[0];
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
          baseSalaryMinor: Number(r.base_salary_minor),
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
      },

      async create(_ctx: ActorContext, data: CreateEmployeeDTO): Promise<EmployeeDTO> {
        const id = crypto.randomUUID();
        const now = new Date().toISOString();
        const status = data.status || 'ACTIVE';

        await pool.query(
          `INSERT INTO employees (
            id, employee_code, first_name, last_name, email, phone, department,
            designation, branch, employment_type, base_salary_minor, national_id,
            date_of_birth, gender, joining_date, probation_end_date, contract_end_date,
            status, address, emergency_contact_name, emergency_contact_phone,
            bank_account_number, bank_name, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            id,
            data.employeeCode,
            data.firstName,
            data.lastName,
            data.email,
            data.phone,
            data.department,
            data.designation,
            data.branch,
            data.employmentType,
            data.baseSalaryMinor,
            data.nationalId,
            data.dateOfBirth,
            data.gender,
            data.joiningDate,
            data.probationEndDate || null,
            data.contractEndDate || null,
            status,
            data.address || null,
            data.emergencyContactName || null,
            data.emergencyContactPhone || null,
            data.bankAccountNumber || null,
            data.bankName || null,
            now,
            now,
          ]
        );

        return {
          id,
          employeeCode: data.employeeCode,
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          phone: data.phone,
          department: data.department,
          designation: data.designation,
          branch: data.branch,
          employmentType: data.employmentType,
          baseSalaryMinor: data.baseSalaryMinor,
          nationalId: data.nationalId,
          dateOfBirth: data.dateOfBirth,
          gender: data.gender,
          joiningDate: data.joiningDate,
          probationEndDate: data.probationEndDate || null,
          contractEndDate: data.contractEndDate || null,
          status,
          address: data.address || null,
          emergencyContactName: data.emergencyContactName || null,
          emergencyContactPhone: data.emergencyContactPhone || null,
          bankAccountNumber: data.bankAccountNumber || null,
          bankName: data.bankName || null,
          createdAt: now,
          updatedAt: now,
        };
      },

      async update(_ctx: ActorContext, id: string, data: Partial<CreateEmployeeDTO>): Promise<EmployeeDTO> {
        const existing = await this.getById(_ctx, id);
        if (!existing) throw new Error(`Employee with ID ${id} not found.`);

        const now = new Date().toISOString();
        const updated = { ...existing, ...data, updatedAt: now };

        await pool.query(
          `UPDATE employees SET
            first_name = ?, last_name = ?, email = ?, phone = ?, department = ?,
            designation = ?, branch = ?, employment_type = ?, base_salary_minor = ?,
            national_id = ?, date_of_birth = ?, gender = ?, joining_date = ?,
            probation_end_date = ?, contract_end_date = ?, status = ?, address = ?,
            emergency_contact_name = ?, emergency_contact_phone = ?,
            bank_account_number = ?, bank_name = ?, updated_at = ?
          WHERE id = ?`,
          [
            updated.firstName,
            updated.lastName,
            updated.email,
            updated.phone,
            updated.department,
            updated.designation,
            updated.branch,
            updated.employmentType,
            updated.baseSalaryMinor,
            updated.nationalId,
            updated.dateOfBirth,
            updated.gender,
            updated.joiningDate,
            updated.probationEndDate || null,
            updated.contractEndDate || null,
            updated.status,
            updated.address || null,
            updated.emergencyContactName || null,
            updated.emergencyContactPhone || null,
            updated.bankAccountNumber || null,
            updated.bankName || null,
            now,
            id,
          ]
        );

        return updated;
      },

      async terminate(_ctx: ActorContext, id: string, reason?: string): Promise<boolean> {
        const now = new Date().toISOString();
        const [result] = await pool.query(
          `UPDATE employees SET status = 'TERMINATED', contract_end_date = ?, updated_at = ? WHERE id = ?`,
          [now, now, id]
        ) as any[];
        return result.affectedRows > 0;
      },

      async count(_ctx: ActorContext): Promise<number> {
        const [rows] = await pool.query(
          `SELECT COUNT(*) as total FROM employees WHERE status != 'TERMINATED'`
        ) as any[];
        return Number(rows[0]?.total || 0);
      },
    };

    this.attendance = {
      async recordPunch(_ctx: ActorContext, punch: PunchInput): Promise<AttendanceRecordDTO> {
        const id = crypto.randomUUID();
        const now = new Date().toISOString();
        const punchTime = punch.punchTime;
        const verifiedMode = punch.verifiedMode || 'FINGERPRINT';

        // Deterministic status based on standard check-in threshold (09:15)
        let status: AttendanceRecordDTO['status'] = 'ON_TIME';
        let lateMinutes = 0;
        if (punch.punchType === 'CHECK_IN') {
          const punchDate = new Date(punchTime);
          const hour = punchDate.getUTCHours();
          const minute = punchDate.getUTCMinutes();
          const totalMinutes = hour * 60 + minute;
          const shiftStartMinutes = 9 * 60; // 09:00 UTC
          if (totalMinutes > shiftStartMinutes + 15) {
            status = 'LATE';
            lateMinutes = totalMinutes - shiftStartMinutes;
          }
        }

        await pool.query(
          `INSERT INTO attendance_records (
            id, employee_id, punch_time, punch_type, terminal_id, verified_mode,
            status, late_minutes, overtime_minutes, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [id, punch.employeeId, punchTime, punch.punchType, punch.terminalId, verifiedMode, status, lateMinutes, 0, now]
        );

        return {
          id,
          employeeId: punch.employeeId,
          punchTime,
          punchType: punch.punchType,
          terminalId: punch.terminalId,
          verifiedMode,
          status,
          lateMinutes,
          overtimeMinutes: 0,
          createdAt: now,
        };
      },

      async syncBatch(_ctx: ActorContext, punches: PunchInput[]): Promise<{ synced: number; deduped: number }> {
        const formatted = punches.map((p) => ({
          employeeId: p.employeeId,
          punchTimeIso: p.punchTime,
          terminalId: p.terminalId,
          original: p,
        }));
        const dedupedFormatted = deduplicatePunches(formatted);
        const deduped = dedupedFormatted.map((d: { original: PunchInput }) => d.original);
        for (const p of deduped) {
          await this.recordPunch(_ctx, p);
        }
        return { synced: deduped.length, deduped: punches.length - deduped.length };
      },

      async listRecords(_ctx: ActorContext, employeeId?: string, startDate?: string, endDate?: string): Promise<AttendanceRecordDTO[]> {
        let sql = `SELECT * FROM attendance_records WHERE 1=1`;
        const params: any[] = [];
        if (employeeId) {
          sql += ` AND employee_id = ?`;
          params.push(employeeId);
        }
        if (startDate) {
          sql += ` AND punch_time >= ?`;
          params.push(startDate);
        }
        if (endDate) {
          sql += ` AND punch_time <= ?`;
          params.push(endDate);
        }
        sql += ` ORDER BY punch_time DESC`;
        const [rows] = await pool.query(sql, params) as any[];
        return rows.map((r: any) => ({
          id: r.id,
          employeeId: r.employee_id,
          punchTime: r.punch_time,
          punchType: r.punch_type,
          terminalId: r.terminal_id,
          verifiedMode: r.verified_mode,
          status: r.status,
          lateMinutes: Number(r.late_minutes),
          overtimeMinutes: Number(r.overtime_minutes),
          notes: r.notes,
          createdAt: r.created_at,
        }));
      },
    };

    this.leave = {
      async getBalances(_ctx: ActorContext, employeeId: string, year: number): Promise<LeaveBalanceDTO[]> {
        const [rows] = await pool.query(
          `SELECT * FROM leave_balances WHERE employee_id = ? AND year = ? ORDER BY leave_type ASC`,
          [employeeId, year]
        ) as any[];
        return rows.map((r: any) => ({
          id: r.id,
          employeeId: r.employee_id,
          leaveType: r.leave_type,
          year: Number(r.year),
          allocatedDays: Number(r.allocated_days),
          usedDays: Number(r.used_days),
          availableDays: Number(r.allocated_days) - Number(r.used_days),
          createdAt: r.created_at,
          updatedAt: r.updated_at,
        }));
      },

      async setBalance(_ctx: ActorContext, data: any): Promise<void> {
        const now = new Date().toISOString();
        const id = crypto.randomUUID();
        await pool.query(
          `INSERT INTO leave_balances (id, employee_id, leave_type, year, allocated_days, used_days, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, 0, ?, ?)
           ON DUPLICATE KEY UPDATE allocated_days = VALUES(allocated_days), updated_at = VALUES(updated_at)`,
          [id, data.employeeId, data.leaveType, data.year, data.allocatedDays, now, now]
        );
      },

      async createRequest(_ctx: ActorContext, data: CreateLeaveRequestDTO): Promise<LeaveRequestDTO> {
        const id = crypto.randomUUID();
        const now = new Date().toISOString();
        await pool.query(
          `INSERT INTO leave_requests (id, employee_id, leave_type, start_date, end_date, days_count, reason, status, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING', ?, ?)`,
          [id, data.employeeId, data.leaveType, data.startDate, data.endDate, data.daysCount, data.reason, now, now]
        );
        return {
          id,
          employeeId: data.employeeId,
          leaveType: data.leaveType,
          startDate: data.startDate,
          endDate: data.endDate,
          daysCount: data.daysCount,
          reason: data.reason,
          status: 'PENDING',
          createdAt: now,
          updatedAt: now,
        };
      },

      async listRequests(_ctx: ActorContext, status?: string): Promise<LeaveRequestDTO[]> {
        let sql = `SELECT * FROM leave_requests WHERE 1=1`;
        const params: any[] = [];
        if (status) {
          sql += ` AND status = ?`;
          params.push(status);
        }
        sql += ` ORDER BY created_at DESC`;
        const [rows] = await pool.query(sql, params) as any[];
        return rows.map((r: any) => ({
          id: r.id,
          employeeId: r.employee_id,
          leaveType: r.leave_type,
          startDate: r.start_date,
          endDate: r.end_date,
          daysCount: Number(r.days_count),
          reason: r.reason,
          status: r.status,
          approvedBy: r.approved_by,
          actionNotes: r.action_notes,
          createdAt: r.created_at,
          updatedAt: r.updated_at,
        }));
      },

      async reviewRequest(_ctx: ActorContext, id: string, action: 'APPROVED' | 'REJECTED', notes?: string): Promise<LeaveRequestDTO> {
        const now = new Date().toISOString();
        const [reqRows] = await pool.query(`SELECT * FROM leave_requests WHERE id = ?`, [id]) as any[];
        if (!reqRows.length) throw new Error(`Leave request ${id} not found.`);
        const req = reqRows[0];

        if (action === 'APPROVED') {
          const year = new Date(req.start_date).getFullYear();
          await pool.query(
            `UPDATE leave_balances SET used_days = used_days + ?, updated_at = ? WHERE employee_id = ? AND leave_type = ? AND year = ?`,
            [req.days_count, now, req.employee_id, req.leave_type, year]
          );
        }

        await pool.query(
          `UPDATE leave_requests SET status = ?, approved_by = ?, action_notes = ?, updated_at = ? WHERE id = ?`,
          [action, _ctx.userId, notes || null, now, id]
        );

        return {
          id,
          employeeId: req.employee_id,
          leaveType: req.leave_type,
          startDate: req.start_date,
          endDate: req.end_date,
          daysCount: Number(req.days_count),
          reason: req.reason,
          status: action,
          approvedBy: _ctx.userId,
          actionNotes: notes || null,
          createdAt: req.created_at,
          updatedAt: now,
        };
      },
    };

    this.payroll = {
      async getSalaryStructure(_ctx: ActorContext, employeeId: string): Promise<SalaryStructureDTO | null> {
        const [rows] = await pool.query(`SELECT * FROM salary_structures WHERE employee_id = ?`, [employeeId]) as any[];
        if (!rows.length) return null;
        const r = rows[0];
        return {
          id: r.id,
          employeeId: r.employee_id,
          baseSalaryMinor: Number(r.base_salary_minor),
          houseRentMinor: Number(r.house_rent_minor),
          medicalAllowanceMinor: Number(r.medical_allowance_minor),
          conveyanceMinor: Number(r.conveyance_minor),
          specialAllowanceMinor: Number(r.special_allowance_minor),
          providentFundRate: Number(r.provident_fund_rate),
          taxExemptMinor: Number(r.tax_exempt_minor),
          effectiveFrom: r.effective_from,
          createdAt: r.created_at,
          updatedAt: r.updated_at,
        };
      },

      async setSalaryStructure(_ctx: ActorContext, data: any): Promise<SalaryStructureDTO> {
        const id = crypto.randomUUID();
        const now = new Date().toISOString();
        await pool.query(
          `INSERT INTO salary_structures (
            id, employee_id, base_salary_minor, house_rent_minor, medical_allowance_minor,
            conveyance_minor, special_allowance_minor, provident_fund_rate, tax_exempt_minor,
            effective_from, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            base_salary_minor = VALUES(base_salary_minor),
            house_rent_minor = VALUES(house_rent_minor),
            medical_allowance_minor = VALUES(medical_allowance_minor),
            conveyance_minor = VALUES(conveyance_minor),
            special_allowance_minor = VALUES(special_allowance_minor),
            provident_fund_rate = VALUES(provident_fund_rate),
            tax_exempt_minor = VALUES(tax_exempt_minor),
            effective_from = VALUES(effective_from),
            updated_at = VALUES(updated_at)`,
          [
            id,
            data.employeeId,
            data.baseSalaryMinor,
            data.houseRentMinor || 0,
            data.medicalAllowanceMinor || 0,
            data.conveyanceMinor || 0,
            data.specialAllowanceMinor || 0,
            data.providentFundRate || 0.0833,
            data.taxExemptMinor || 0,
            data.effectiveFrom || now,
            now,
            now,
          ]
        );
        return {
          id,
          employeeId: data.employeeId,
          baseSalaryMinor: data.baseSalaryMinor,
          houseRentMinor: data.houseRentMinor || 0,
          medicalAllowanceMinor: data.medicalAllowanceMinor || 0,
          conveyanceMinor: data.conveyanceMinor || 0,
          specialAllowanceMinor: data.specialAllowanceMinor || 0,
          providentFundRate: data.providentFundRate || 0.0833,
          taxExemptMinor: data.taxExemptMinor || 0,
          effectiveFrom: data.effectiveFrom || now,
          createdAt: now,
          updatedAt: now,
        };
      },

      async executePayrollRun(_ctx: ActorContext, month: number, year: number): Promise<PayrollRunDTO> {
        const runId = crypto.randomUUID();
        const now = new Date().toISOString();

        const [employees] = await pool.query(
          `SELECT id, base_salary_minor FROM employees WHERE status = 'ACTIVE'`
        ) as any[];

        let totalGross = 0;
        let totalDeductions = 0;
        let totalNet = 0;
        let totalTax = 0;
        let totalEobi = 0;
        let totalPf = 0;

        for (const emp of employees) {
          const itemId = crypto.randomUUID();
          const baseSalary = Number(emp.base_salary_minor);

          const [structRows] = await pool.query(
            `SELECT * FROM salary_structures WHERE employee_id = ?`,
            [emp.id]
          ) as any[];
          const struct = structRows[0];

          const allowancesMinor = struct
            ? Number(struct.house_rent_minor || 0) +
              Number(struct.medical_allowance_minor || 0) +
              Number(struct.conveyance_minor || 0) +
              Number(struct.special_allowance_minor || 0)
            : 0;

          const pfRate = struct ? Number(struct.provident_fund_rate) : 0;
          const pfMinor = pfRate > 0 ? Math.round(baseSalary * pfRate) : 0;

          const computed = computeLocalPayrollItem({
            baseSalaryMinor: baseSalary,
            allowancesMinor,
            daysWorked: 30,
            daysInMonth: 30,
            providentFundMinor: pfMinor,
          });

          await pool.query(
            `INSERT INTO payroll_items (
              id, payroll_run_id, employee_id, base_salary_minor, allowances_minor,
              gross_salary_minor, tax_deduction_minor, eobi_employee_minor, eobi_employer_minor,
              provident_fund_employee_minor, provident_fund_employer_minor,
              unpaid_leave_deduction_minor, other_deductions_minor, net_salary_minor,
              status, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, 'PENDING', ?)`,
            [
              itemId,
              runId,
              emp.id,
              baseSalary,
              allowancesMinor,
              computed.grossPayMinor,
              computed.monthlyTaxMinor,
              computed.eobiEmployeeMinor,
              computed.eobiEmployerMinor,
              computed.providentFundMinor,
              computed.providentFundMinor,
              computed.netPayMinor,
              now,
            ]
          );

          totalGross += computed.grossPayMinor;
          totalDeductions += computed.totalDeductionsMinor;
          totalNet += computed.netPayMinor;
          totalTax += computed.monthlyTaxMinor;
          totalEobi += computed.eobiEmployeeMinor;
          totalPf += computed.providentFundMinor;
        }

        await pool.query(
          `INSERT INTO payroll_runs (
            id, month, year, status, total_gross_minor, total_deductions_minor,
            total_net_minor, total_tax_minor, total_eobi_minor, total_provident_fund_minor,
            employee_count, processed_by, created_at, updated_at
          ) VALUES (?, ?, ?, 'APPROVED', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            runId,
            month,
            year,
            totalGross,
            totalDeductions,
            totalNet,
            totalTax,
            totalEobi,
            totalPf,
            employees.length,
            _ctx.userId,
            now,
            now,
          ]
        );

        return {
          id: runId,
          month,
          year,
          status: 'APPROVED',
          totalGrossMinor: totalGross,
          totalDeductionsMinor: totalDeductions,
          totalNetMinor: totalNet,
          totalTaxMinor: totalTax,
          totalEobiMinor: totalEobi,
          totalProvidentFundMinor: totalPf,
          employeeCount: employees.length,
          processedBy: _ctx.userId,
          createdAt: now,
          updatedAt: now,
        };
      },

      async listRuns(_ctx: ActorContext): Promise<PayrollRunDTO[]> {
        const [rows] = await pool.query(`SELECT * FROM payroll_runs ORDER BY year DESC, month DESC`) as any[];
        return rows.map((r: any) => ({
          id: r.id,
          month: Number(r.month),
          year: Number(r.year),
          status: r.status,
          totalGrossMinor: Number(r.total_gross_minor),
          totalDeductionsMinor: Number(r.total_deductions_minor),
          totalNetMinor: Number(r.total_net_minor),
          totalTaxMinor: Number(r.total_tax_minor),
          totalEobiMinor: Number(r.total_eobi_minor),
          totalProvidentFundMinor: Number(r.total_provident_fund_minor),
          employeeCount: Number(r.employee_count),
          processedBy: r.processed_by,
          approvedBy: r.approved_by,
          lockedAt: r.locked_at,
          createdAt: r.created_at,
          updatedAt: r.updated_at,
        }));
      },

      async getRunItems(_ctx: ActorContext, runId: string): Promise<PayrollItemDTO[]> {
        const [rows] = await pool.query(
          `SELECT * FROM payroll_items WHERE payroll_run_id = ? ORDER BY created_at ASC`,
          [runId]
        ) as any[];
        return rows.map((r: any) => ({
          id: r.id,
          payrollRunId: r.payroll_run_id,
          employeeId: r.employee_id,
          baseSalaryMinor: Number(r.base_salary_minor),
          allowancesMinor: Number(r.allowances_minor),
          grossSalaryMinor: Number(r.gross_salary_minor),
          taxDeductionMinor: Number(r.tax_deduction_minor),
          eobiEmployeeMinor: Number(r.eobi_employee_minor),
          eobiEmployerMinor: Number(r.eobi_employer_minor),
          providentFundEmployeeMinor: Number(r.provident_fund_employee_minor),
          providentFundEmployerMinor: Number(r.provident_fund_employer_minor),
          unpaidLeaveDeductionMinor: Number(r.unpaid_leave_deduction_minor),
          otherDeductionsMinor: Number(r.other_deductions_minor),
          netSalaryMinor: Number(r.net_salary_minor),
          status: r.status,
          createdAt: r.created_at,
        }));
      },
    };

    this.payslipTemplate = {
      async getTemplate(_ctx: ActorContext): Promise<PayslipTemplateDTO | null> {
        const [rows] = await pool.query(
          `SELECT * FROM payslip_templates WHERE is_default = 1 LIMIT 1`
        ) as any[];
        if (!rows.length) return null;
        const r = rows[0];
        return {
          id: r.id,
          name: r.name,
          isDefault: Boolean(r.is_default),
          headerLogoUrl: r.header_logo_url,
          primaryColor: r.primary_color,
          companyName: r.company_name,
          footerNotes: r.footer_notes,
          showEobi: Boolean(r.show_eobi),
          showProvidentFund: Boolean(r.show_provident_fund),
          showYtdTotals: Boolean(r.show_ytd_totals),
          createdAt: r.created_at,
          updatedAt: r.updated_at,
        };
      },

      async saveTemplate(_ctx: ActorContext, template: any): Promise<PayslipTemplateDTO> {
        const id = crypto.randomUUID();
        const now = new Date().toISOString();
        await pool.query(
          `INSERT INTO payslip_templates (
            id, name, is_default, header_logo_url, primary_color, company_name,
            footer_notes, show_eobi, show_provident_fund, show_ytd_totals, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            id,
            template.name,
            template.isDefault ? 1 : 0,
            template.headerLogoUrl || null,
            template.primaryColor || '#0f172a',
            template.companyName,
            template.footerNotes || null,
            template.showEobi ? 1 : 0,
            template.showProvidentFund ? 1 : 0,
            template.showYtdTotals ? 1 : 0,
            now,
            now,
          ]
        );
        return {
          id,
          ...template,
          createdAt: now,
          updatedAt: now,
        };
      },
    };

    this.certificate = {
      async createCertificate(_ctx: ActorContext, data: any): Promise<CertificateDTO> {
        const id = crypto.randomUUID();
        const code = `HR360-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
        const now = new Date().toISOString();
        await pool.query(
          `INSERT INTO certificate_records (id, employee_id, certificate_type, issue_date, verification_code, issued_by, content, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [id, data.employeeId, data.certificateType, data.issueDate, code, _ctx.userId, data.content, now]
        );
        return {
          id,
          employeeId: data.employeeId,
          certificateType: data.certificateType,
          issueDate: data.issueDate,
          verificationCode: code,
          issuedBy: _ctx.userId,
          content: data.content,
          createdAt: now,
        };
      },

      async listCertificates(_ctx: ActorContext, employeeId?: string): Promise<CertificateDTO[]> {
        let sql = `SELECT * FROM certificate_records WHERE 1=1`;
        const params: any[] = [];
        if (employeeId) {
          sql += ` AND employee_id = ?`;
          params.push(employeeId);
        }
        sql += ` ORDER BY created_at DESC`;
        const [rows] = await pool.query(sql, params) as any[];
        return rows.map((r: any) => ({
          id: r.id,
          employeeId: r.employee_id,
          certificateType: r.certificate_type,
          issueDate: r.issue_date,
          verificationCode: r.verification_code,
          issuedBy: r.issued_by,
          content: r.content,
          createdAt: r.created_at,
        }));
      },
    };

    this.performance = {
      async createReview(_ctx: ActorContext, data: any): Promise<PerformanceReviewDTO> {
        const id = crypto.randomUUID();
        const now = new Date().toISOString();
        await pool.query(
          `INSERT INTO performance_reviews (id, employee_id, reviewer_id, cycle_name, period_start, period_end, rating_score, feedback_text, status, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [id, data.employeeId, _ctx.userId, data.cycleName, data.periodStart, data.periodEnd, data.ratingScore, data.feedbackText, data.status || 'DRAFT', now, now]
        );
        return {
          id,
          employeeId: data.employeeId,
          reviewerId: _ctx.userId,
          cycleName: data.cycleName,
          periodStart: data.periodStart,
          periodEnd: data.periodEnd,
          ratingScore: data.ratingScore,
          feedbackText: data.feedbackText,
          status: data.status || 'DRAFT',
          createdAt: now,
          updatedAt: now,
        };
      },

      async listReviews(_ctx: ActorContext, employeeId?: string): Promise<PerformanceReviewDTO[]> {
        let sql = `SELECT * FROM performance_reviews WHERE 1=1`;
        const params: any[] = [];
        if (employeeId) {
          sql += ` AND employee_id = ?`;
          params.push(employeeId);
        }
        sql += ` ORDER BY created_at DESC`;
        const [rows] = await pool.query(sql, params) as any[];
        return rows.map((r: any) => ({
          id: r.id,
          employeeId: r.employee_id,
          reviewerId: r.reviewer_id,
          cycleName: r.cycle_name,
          periodStart: r.period_start,
          periodEnd: r.period_end,
          ratingScore: Number(r.rating_score),
          feedbackText: r.feedback_text,
          status: r.status,
          createdAt: r.created_at,
          updatedAt: r.updated_at,
        }));
      },
    };

    this.recruitment = {
      async createJob(_ctx: ActorContext, data: any): Promise<JobOpeningDTO> {
        const id = crypto.randomUUID();
        const now = new Date().toISOString();
        await pool.query(
          `INSERT INTO job_openings (id, title, department, location, status, headcount, job_description, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [id, data.title, data.department, data.location, data.status || 'OPEN', data.headcount || 1, data.jobDescription || null, now, now]
        );
        return {
          id,
          title: data.title,
          department: data.department,
          location: data.location,
          status: data.status || 'OPEN',
          headcount: data.headcount || 1,
          jobDescription: data.jobDescription || null,
          createdAt: now,
          updatedAt: now,
        };
      },

      async listJobs(_ctx: ActorContext, status?: string): Promise<JobOpeningDTO[]> {
        let sql = `SELECT * FROM job_openings WHERE 1=1`;
        const params: any[] = [];
        if (status) {
          sql += ` AND status = ?`;
          params.push(status);
        }
        sql += ` ORDER BY created_at DESC`;
        const [rows] = await pool.query(sql, params) as any[];
        return rows.map((r: any) => ({
          id: r.id,
          title: r.title,
          department: r.department,
          location: r.location,
          status: r.status,
          headcount: Number(r.headcount),
          jobDescription: r.job_description,
          createdAt: r.created_at,
          updatedAt: r.updated_at,
        }));
      },

      async addCandidate(_ctx: ActorContext, data: any): Promise<CandidateDTO> {
        const id = crypto.randomUUID();
        const now = new Date().toISOString();
        await pool.query(
          `INSERT INTO candidates (id, job_opening_id, full_name, email, phone, current_stage, blind_resume_text, score, notes, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [id, data.jobOpeningId, data.fullName, data.email, data.phone || null, data.currentStage || 'APPLIED', data.blindResumeText || null, data.score || null, data.notes || null, now, now]
        );
        return {
          id,
          jobOpeningId: data.jobOpeningId,
          fullName: data.fullName,
          email: data.email,
          phone: data.phone || null,
          currentStage: data.currentStage || 'APPLIED',
          blindResumeText: data.blindResumeText || null,
          score: data.score || null,
          notes: data.notes || null,
          createdAt: now,
          updatedAt: now,
        };
      },

      async listCandidates(_ctx: ActorContext, jobId?: string): Promise<CandidateDTO[]> {
        let sql = `SELECT * FROM candidates WHERE 1=1`;
        const params: any[] = [];
        if (jobId) {
          sql += ` AND job_opening_id = ?`;
          params.push(jobId);
        }
        sql += ` ORDER BY created_at DESC`;
        const [rows] = await pool.query(sql, params) as any[];
        return rows.map((r: any) => ({
          id: r.id,
          jobOpeningId: r.job_opening_id,
          fullName: r.full_name,
          email: r.email,
          phone: r.phone,
          currentStage: r.current_stage,
          blindResumeText: r.blind_resume_text,
          score: r.score ? Number(r.score) : null,
          notes: r.notes,
          createdAt: r.created_at,
          updatedAt: r.updated_at,
        }));
      },
    };

    this.audit = {
      async logAction(_ctx: ActorContext, action: string, entityType: string, entityId: string, metadata?: any): Promise<AuditRecordDTO> {
        const [lastRows] = await pool.query(
          `SELECT hash FROM local_audit_log ORDER BY timestamp DESC LIMIT 1`
        ) as any[];
        const prevHash = lastRows[0]?.hash || GENESIS_HASH;

        const auditId = crypto.randomUUID();
        const timestamp = new Date().toISOString();
        const validRoles = ['STAFF', 'TENANT_USER', 'SYSTEM', 'ANONYMOUS'] as const;
        const actorType = (validRoles.includes(_ctx.role as any) ? _ctx.role : 'TENANT_USER') as typeof validRoles[number];
        const record = AuditChain.createRecord(prevHash, {
          id: auditId,
          actorId: _ctx.userId,
          actorType,
          action,
          entityType,
          entityId,
          metadata,
          timestamp,
        });

        await pool.query(
          `INSERT INTO local_audit_log (id, prev_hash, hash, timestamp, actor_id, actor_role, action, entity_type, entity_id, metadata)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            auditId,
            record.prevHash,
            record.hash,
            timestamp,
            _ctx.userId,
            _ctx.role,
            action,
            entityType,
            entityId,
            metadata ? JSON.stringify(metadata) : null,
          ]
        );

        return {
          id: auditId,
          prevHash: record.prevHash,
          hash: record.hash,
          timestamp,
          actorId: _ctx.userId,
          actorRole: _ctx.role,
          action,
          entityType,
          entityId,
          metadata,
        };
      },

      async listLogs(_ctx: ActorContext, options?: any): Promise<AuditRecordDTO[]> {
        let sql = `SELECT * FROM local_audit_log ORDER BY timestamp DESC`;
        const params: any[] = [];
        if (options?.limit) {
          sql += ` LIMIT ?`;
          params.push(Number(options.limit));
        }
        const [rows] = await pool.query(sql, params) as any[];
        return rows.map((r: any) => ({
          id: r.id,
          prevHash: r.prev_hash,
          hash: r.hash,
          timestamp: r.timestamp,
          actorId: r.actor_id,
          actorRole: r.actor_role,
          action: r.action,
          entityType: r.entity_type,
          entityId: r.entity_id,
          metadata: typeof r.metadata === 'string' ? JSON.parse(r.metadata) : r.metadata,
        }));
      },
    };

    this.settings = {
      async getSettings(_ctx: ActorContext): Promise<CompanySettingsDTO | null> {
        const [rows] = await pool.query(`SELECT * FROM company_settings LIMIT 1`) as any[];
        if (!rows.length) return null;
        const r = rows[0];
        return {
          id: r.id,
          companyName: r.company_name,
          contactEmail: r.contact_email,
          contactPhone: r.contact_phone,
          country: r.country,
          fiscalYearStartMonth: Number(r.fiscal_year_start_month),
          standardWorkingHoursPerDay: Number(r.standard_working_hours_per_day),
          probationDurationMonths: Number(r.probation_duration_months),
          updatedAt: r.updated_at,
        };
      },

      async updateSettings(_ctx: ActorContext, data: any): Promise<CompanySettingsDTO> {
        const existing = await this.getSettings(_ctx);
        const now = new Date().toISOString();
        if (existing) {
          await pool.query(
            `UPDATE company_settings SET
              company_name = ?, contact_email = ?, contact_phone = ?, country = ?,
              fiscal_year_start_month = ?, standard_working_hours_per_day = ?,
              probation_duration_months = ?, updated_at = ?
            WHERE id = ?`,
            [
              data.companyName ?? existing.companyName,
              data.contactEmail ?? existing.contactEmail,
              data.contactPhone ?? existing.contactPhone,
              data.country ?? existing.country,
              data.fiscalYearStartMonth ?? existing.fiscalYearStartMonth,
              data.standardWorkingHoursPerDay ?? existing.standardWorkingHoursPerDay,
              data.probationDurationMonths ?? existing.probationDurationMonths,
              now,
              existing.id,
            ]
          );
          return {
            ...existing,
            ...data,
            updatedAt: now,
          };
        } else {
          const id = crypto.randomUUID();
          await pool.query(
            `INSERT INTO company_settings (
              id, company_name, contact_email, contact_phone, country,
              fiscal_year_start_month, standard_working_hours_per_day,
              probation_duration_months, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              id,
              data.companyName || 'Company',
              data.contactEmail || 'admin@company.com',
              data.contactPhone || null,
              data.country || 'PK',
              data.fiscalYearStartMonth || 7,
              data.standardWorkingHoursPerDay || 8,
              data.probationDurationMonths || 3,
              now,
            ]
          );
          return {
            id,
            companyName: data.companyName || 'Company',
            contactEmail: data.contactEmail || 'admin@company.com',
            contactPhone: data.contactPhone || null,
            country: data.country || 'PK',
            fiscalYearStartMonth: data.fiscalYearStartMonth || 7,
            standardWorkingHoursPerDay: data.standardWorkingHoursPerDay || 8,
            probationDurationMonths: data.probationDurationMonths || 3,
            updatedAt: now,
          };
        }
      },
    };

    this.user = {
      async listUsers(_ctx: ActorContext): Promise<UserDTO[]> {
        const [rows] = await pool.query(`SELECT * FROM local_users ORDER BY created_at ASC`) as any[];
        return rows.map((r: any) => ({
          id: r.id,
          email: r.email,
          fullName: r.full_name,
          role: r.role,
          isActive: Boolean(r.is_active),
          createdAt: r.created_at,
          updatedAt: r.updated_at,
        }));
      },

      async createUser(_ctx: ActorContext, data: any): Promise<UserDTO> {
        const id = crypto.randomUUID();
        const now = new Date().toISOString();
        await pool.query(
          `INSERT INTO local_users (id, email, full_name, role, password_hash, is_active, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, 1, ?, ?)`,
          [id, data.email, data.fullName, data.role, data.passwordHash, now, now]
        );
        return {
          id,
          email: data.email,
          fullName: data.fullName,
          role: data.role,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        };
      },

      async updateUser(_ctx: ActorContext, id: string, data: any): Promise<UserDTO> {
        const now = new Date().toISOString();
        const [rows] = await pool.query(`SELECT * FROM local_users WHERE id = ?`, [id]) as any[];
        if (!rows.length) throw new Error(`User with ID ${id} not found.`);
        const user = rows[0];

        const fullName = data.fullName !== undefined ? data.fullName : user.full_name;
        const role = data.role !== undefined ? data.role : user.role;
        const isActive = data.isActive !== undefined ? (data.isActive ? 1 : 0) : user.is_active;

        await pool.query(
          `UPDATE local_users SET full_name = ?, role = ?, is_active = ?, updated_at = ? WHERE id = ?`,
          [fullName, role, isActive, now, id]
        );

        return {
          id,
          email: user.email,
          fullName,
          role,
          isActive: Boolean(isActive),
          createdAt: user.created_at,
          updatedAt: now,
        };
      },
    };
  }
}
