import crypto from 'node:crypto';
import { DatabaseConnection } from '../database/connection';
import { computeLocalPayrollItem } from '../domain/payroll-engine';

export interface PayrollItemEntity {
  id: string;
  payrollRunId: string;
  employeeId: string;
  baseSalaryMinor: number;
  allowancesMinor: number;
  grossPayMinor: number;
  daysWorked: number;
  daysInMonth: number;
  taxMinor: number;
  eobiEmployeeMinor: number;
  eobiEmployerMinor: number;
  pessiEmployerMinor: number;
  providentFundMinor: number;
  otherDeductionsMinor: number;
  totalDeductionsMinor: number;
  netPayMinor: number;
  bankAccountNumber?: string | null;
  bankName?: string | null;
  createdAt: string;
}

export interface PayrollRunEntity {
  id: string;
  periodMonth: number;
  periodYear: number;
  totalGrossMinor: number;
  totalDeductionsMinor: number;
  totalNetMinor: number;
  status: 'DRAFT' | 'PREPARED' | 'APPROVED' | 'LOCKED' | 'REVERSED';
  preparedBy: string;
  preparedAt: string;
  approvedBy?: string | null;
  approvedAt?: string | null;
  lockedAt?: string | null;
  reversalReason?: string | null;
  createdAt: string;
  updatedAt: string;
  items?: PayrollItemEntity[];
}

export interface PreparePayrollInput {
  periodMonth: number;
  periodYear: number;
  preparedBy: string;
  items?: Array<{
    employeeId: string;
    baseSalaryMinor: number;
    allowancesMinor?: number;
    daysWorked: number;
    daysInMonth: number;
    customDeductionsMinor?: number;
    taxRatePercent?: number;
    providentFundMinor?: number;
    bankAccountNumber?: string;
    bankName?: string;
  }>;
}

export class PayrollRepository {
  private readonly connection: DatabaseConnection;

  constructor(connection: DatabaseConnection) {
    this.connection = connection;
  }

  public prepareRun(input: PreparePayrollInput): PayrollRunEntity {
    return this.connection.transaction(() => {
      const raw = this.connection.getRawDb();
      const now = new Date().toISOString();

      // Check if run already exists for this period
      const existing = raw.prepare(`
        SELECT * FROM payroll_runs
        WHERE period_month = ? AND period_year = ?
      `).get(input.periodMonth, input.periodYear) as any;

      if (existing && existing.status !== 'DRAFT') {
        throw new Error(`Payroll for ${input.periodMonth}/${input.periodYear} already exists in status: ${existing.status}`);
      }

      // If existing draft, delete old draft items and run
      if (existing) {
        raw.prepare(`DELETE FROM payroll_items WHERE payroll_run_id = ?`).run(existing.id);
        raw.prepare(`DELETE FROM payroll_runs WHERE id = ?`).run(existing.id);
      }

      const runId = crypto.randomUUID();
      let totalGross = 0;
      let totalDeductions = 0;
      let totalNet = 0;

      // Determine items: if provided use them, else calculate for all active employees
      let itemsToInsert = input.items;
      if (!itemsToInsert || itemsToInsert.length === 0) {
        const employees = raw.prepare(`
          SELECT id, base_salary_minor, bank_account_number, bank_name
          FROM employees
          WHERE status = 'ACTIVE'
        `).all() as any[];

        const daysInMonth = new Date(input.periodYear, input.periodMonth, 0).getDate();

        itemsToInsert = employees.map((emp) => ({
          employeeId: emp.id,
          baseSalaryMinor: emp.base_salary_minor,
          allowancesMinor: 0,
          daysWorked: daysInMonth,
          daysInMonth,
          bankAccountNumber: emp.bank_account_number,
          bankName: emp.bank_name,
        }));
      }

      const calculatedItems: Array<{
        id: string;
        item: any;
        calc: any;
      }> = [];

      for (const item of itemsToInsert) {
        const calc = computeLocalPayrollItem({
          baseSalaryMinor: item.baseSalaryMinor,
          allowancesMinor: item.allowancesMinor,
          daysWorked: item.daysWorked,
          daysInMonth: item.daysInMonth,
          taxRatePercent: item.taxRatePercent,
          customDeductionsMinor: item.customDeductionsMinor,
          providentFundMinor: item.providentFundMinor,
        });

        totalGross += calc.grossPayMinor;
        totalDeductions += calc.totalDeductionsMinor;
        totalNet += calc.netPayMinor;

        calculatedItems.push({
          id: crypto.randomUUID(),
          item,
          calc,
        });
      }

      // 1. Insert Parent Payroll Run
      raw.prepare(`
        INSERT INTO payroll_runs (
          id, period_month, period_year, total_gross_minor, total_deductions_minor,
          total_net_minor, status, prepared_by, prepared_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, 'PREPARED', ?, ?, ?, ?)
      `).run(
        runId,
        input.periodMonth,
        input.periodYear,
        totalGross,
        totalDeductions,
        totalNet,
        input.preparedBy,
        now,
        now,
        now
      );

      // 2. Insert Child Payroll Items
      const savedItems: PayrollItemEntity[] = [];
      const itemStmt = raw.prepare(`
        INSERT INTO payroll_items (
          id, payroll_run_id, employee_id, base_salary_minor, allowances_minor,
          gross_pay_minor, days_worked, days_in_month, tax_minor, eobi_employee_minor,
          eobi_employer_minor, pessi_employer_minor, provident_fund_minor, other_deductions_minor,
          total_deductions_minor, net_pay_minor, bank_account_number, bank_name, created_at
        ) VALUES (
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?, ?, ?, ?
        )
      `);

      for (const entry of calculatedItems) {
        const { id: itemId, item, calc } = entry;
        itemStmt.run(
          itemId,
          runId,
          item.employeeId,
          item.baseSalaryMinor,
          item.allowancesMinor ?? 0,
          calc.grossPayMinor,
          calc.daysWorked,
          calc.daysInMonth,
          calc.monthlyTaxMinor,
          calc.eobiEmployeeMinor,
          calc.eobiEmployerMinor,
          calc.pessiEmployerMinor,
          calc.providentFundMinor,
          item.customDeductionsMinor ?? 0,
          calc.totalDeductionsMinor,
          calc.netPayMinor,
          item.bankAccountNumber ?? null,
          item.bankName ?? null,
          now
        );

        savedItems.push({
          id: itemId,
          payrollRunId: runId,
          employeeId: item.employeeId,
          baseSalaryMinor: item.baseSalaryMinor,
          allowancesMinor: item.allowancesMinor ?? 0,
          grossPayMinor: calc.grossPayMinor,
          daysWorked: calc.daysWorked,
          daysInMonth: calc.daysInMonth,
          taxMinor: calc.monthlyTaxMinor,
          eobiEmployeeMinor: calc.eobiEmployeeMinor,
          eobiEmployerMinor: calc.eobiEmployerMinor,
          pessiEmployerMinor: calc.pessiEmployerMinor,
          providentFundMinor: calc.providentFundMinor,
          otherDeductionsMinor: item.customDeductionsMinor ?? 0,
          totalDeductionsMinor: calc.totalDeductionsMinor,
          netPayMinor: calc.netPayMinor,
          bankAccountNumber: item.bankAccountNumber ?? null,
          bankName: item.bankName ?? null,
          createdAt: now,
        });
      }

      return {
        id: runId,
        periodMonth: input.periodMonth,
        periodYear: input.periodYear,
        totalGrossMinor: totalGross,
        totalDeductionsMinor: totalDeductions,
        totalNetMinor: totalNet,
        status: 'PREPARED',
        preparedBy: input.preparedBy,
        preparedAt: now,
        createdAt: now,
        updatedAt: now,
        items: savedItems,
      };
    });
  }

  public approveRun(runId: string, approverId: string): PayrollRunEntity {
    return this.connection.transaction(() => {
      const raw = this.connection.getRawDb();
      const run = raw.prepare(`SELECT * FROM payroll_runs WHERE id = ?`).get(runId) as any;
      if (!run) {
        throw new Error(`Payroll run not found: ${runId}`);
      }

      if (run.status !== 'PREPARED') {
        throw new Error(`Cannot approve payroll run in ${run.status} status.`);
      }

      // Maker-Checker Invariant
      if (run.prepared_by === approverId) {
        throw new Error('Maker-Checker violation: The preparer cannot approve their own payroll run.');
      }

      const now = new Date().toISOString();
      raw.prepare(`
        UPDATE payroll_runs
        SET status = 'APPROVED', approved_by = ?, approved_at = ?, updated_at = ?
        WHERE id = ?
      `).run(approverId, now, now, runId);

      return this.getRunById(runId)!;
    });
  }

  public lockRun(runId: string): PayrollRunEntity {
    const raw = this.connection.getRawDb();
    const run = raw.prepare(`SELECT * FROM payroll_runs WHERE id = ?`).get(runId) as any;
    if (!run) {
      throw new Error(`Payroll run not found: ${runId}`);
    }

    if (run.status !== 'APPROVED') {
      throw new Error(`Cannot lock payroll run in ${run.status} status. Must be APPROVED.`);
    }

    const now = new Date().toISOString();
    raw.prepare(`
      UPDATE payroll_runs
      SET status = 'LOCKED', locked_at = ?, updated_at = ?
      WHERE id = ?
    `).run(now, now, runId);

    return this.getRunById(runId)!;
  }

  public reverseRun(runId: string, reason: string): PayrollRunEntity {
    const raw = this.connection.getRawDb();
    const run = raw.prepare(`SELECT * FROM payroll_runs WHERE id = ?`).get(runId) as any;
    if (!run) {
      throw new Error(`Payroll run not found: ${runId}`);
    }

    if (run.status === 'LOCKED') {
      throw new Error(`Cannot reverse locked payroll run without unlocking first.`);
    }

    const now = new Date().toISOString();
    raw.prepare(`
      UPDATE payroll_runs
      SET status = 'REVERSED', reversal_reason = ?, updated_at = ?
      WHERE id = ?
    `).run(reason, now, runId);

    return this.getRunById(runId)!;
  }

  public getRunById(id: string): PayrollRunEntity | null {
    const raw = this.connection.getRawDb();
    const row = raw.prepare(`SELECT * FROM payroll_runs WHERE id = ?`).get(id) as any;
    if (!row) return null;

    const items = raw.prepare(`SELECT * FROM payroll_items WHERE payroll_run_id = ?`).all(id) as any[];

    return {
      id: row.id,
      periodMonth: row.period_month,
      periodYear: row.period_year,
      totalGrossMinor: row.total_gross_minor,
      totalDeductionsMinor: row.total_deductions_minor,
      totalNetMinor: row.total_net_minor,
      status: row.status,
      preparedBy: row.prepared_by,
      preparedAt: row.prepared_at,
      approvedBy: row.approved_by,
      approvedAt: row.approved_at,
      lockedAt: row.locked_at,
      reversalReason: row.reversal_reason,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      items: items.map((i) => ({
        id: i.id,
        payrollRunId: i.payroll_run_id,
        employeeId: i.employee_id,
        baseSalaryMinor: i.base_salary_minor,
        allowancesMinor: i.allowances_minor,
        grossPayMinor: i.gross_pay_minor,
        daysWorked: i.days_worked,
        daysInMonth: i.days_in_month,
        taxMinor: i.tax_minor,
        eobiEmployeeMinor: i.eobi_employee_minor,
        eobiEmployerMinor: i.eobi_employer_minor,
        pessiEmployerMinor: i.pessi_employer_minor,
        providentFundMinor: i.provident_fund_minor,
        otherDeductionsMinor: i.other_deductions_minor,
        totalDeductionsMinor: i.total_deductions_minor,
        netPayMinor: i.net_pay_minor,
        bankAccountNumber: i.bank_account_number,
        bankName: i.bank_name,
        createdAt: i.created_at,
      })),
    };
  }

  public listRuns(): PayrollRunEntity[] {
    const raw = this.connection.getRawDb();
    const rows = raw.prepare(`
      SELECT * FROM payroll_runs
      ORDER BY period_year DESC, period_month DESC
    `).all() as any[];

    return rows.map((row) => ({
      id: row.id,
      periodMonth: row.period_month,
      periodYear: row.period_year,
      totalGrossMinor: row.total_gross_minor,
      totalDeductionsMinor: row.total_deductions_minor,
      totalNetMinor: row.total_net_minor,
      status: row.status,
      preparedBy: row.prepared_by,
      preparedAt: row.prepared_at,
      approvedBy: row.approved_by,
      approvedAt: row.approved_at,
      lockedAt: row.locked_at,
      reversalReason: row.reversal_reason,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }
}
