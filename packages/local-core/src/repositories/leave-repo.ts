import crypto from 'node:crypto';
import { DatabaseConnection } from '../database/connection';
import { validateLeaveDeduction } from '../domain/leave-engine';

export interface LeaveBalanceEntity {
  id: string;
  employeeId: string;
  leaveType: 'CASUAL' | 'SICK' | 'ANNUAL' | 'MATERNITY' | 'UNPAID';
  year: number;
  allocatedDays: number;
  usedDays: number;
  availableDays: number;
  createdAt: string;
  updatedAt: string;
}

export interface LeaveRequestEntity {
  id: string;
  employeeId: string;
  leaveType: 'CASUAL' | 'SICK' | 'ANNUAL' | 'MATERNITY' | 'UNPAID';
  startDate: string;
  endDate: string;
  daysCount: number;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  approvedBy?: string | null;
  actionNotes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLeaveRequestInput {
  employeeId: string;
  leaveType: 'CASUAL' | 'SICK' | 'ANNUAL' | 'MATERNITY' | 'UNPAID';
  startDate: string;
  endDate: string;
  daysCount: number;
  reason: string;
}

export class LeaveRepository {
  private readonly connection: DatabaseConnection;

  constructor(connection: DatabaseConnection) {
    this.connection = connection;
  }

  public getBalances(employeeId: string, year: number): LeaveBalanceEntity[] {
    const raw = this.connection.getRawDb();
    const rows = raw.prepare(`
      SELECT * FROM leave_balances
      WHERE employee_id = ? AND year = ?
      ORDER BY leave_type ASC
    `).all(employeeId, year) as any[];

    return rows.map((r) => this.mapBalanceRow(r));
  }

  public setBalance(input: {
    employeeId: string;
    leaveType: 'CASUAL' | 'SICK' | 'ANNUAL' | 'MATERNITY' | 'UNPAID';
    year: number;
    allocatedDays: number;
    usedDays?: number;
  }): LeaveBalanceEntity {
    const raw = this.connection.getRawDb();
    const now = new Date().toISOString();
    const existing = raw.prepare(`
      SELECT * FROM leave_balances
      WHERE employee_id = ? AND leave_type = ? AND year = ?
    `).get(input.employeeId, input.leaveType, input.year) as any;

    if (existing) {
      const usedDays = input.usedDays !== undefined ? input.usedDays : existing.used_days;
      raw.prepare(`
        UPDATE leave_balances
        SET allocated_days = ?, used_days = ?, updated_at = ?
        WHERE id = ?
      `).run(input.allocatedDays, usedDays, now, existing.id);

      return this.mapBalanceRow({
        ...existing,
        allocated_days: input.allocatedDays,
        used_days: usedDays,
        updated_at: now,
      });
    }

    const id = crypto.randomUUID();
    const usedDays = input.usedDays ?? 0;
    raw.prepare(`
      INSERT INTO leave_balances (
        id, employee_id, leave_type, year, allocated_days, used_days, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, input.employeeId, input.leaveType, input.year, input.allocatedDays, usedDays, now, now);

    return {
      id,
      employeeId: input.employeeId,
      leaveType: input.leaveType,
      year: input.year,
      allocatedDays: input.allocatedDays,
      usedDays,
      availableDays: Math.max(0, input.allocatedDays - usedDays),
      createdAt: now,
      updatedAt: now,
    };
  }

  public createRequest(input: CreateLeaveRequestInput): LeaveRequestEntity {
    const raw = this.connection.getRawDb();
    const now = new Date().toISOString();
    const id = crypto.randomUUID();

    // Verify employee balance if not UNPAID
    if (input.leaveType !== 'UNPAID') {
      const year = new Date(input.startDate).getFullYear() || new Date().getFullYear();
      const balance = raw.prepare(`
        SELECT * FROM leave_balances
        WHERE employee_id = ? AND leave_type = ? AND year = ?
      `).get(input.employeeId, input.leaveType, year) as any;

      if (balance) {
        const check = validateLeaveDeduction(balance.allocated_days, balance.used_days, input.daysCount);
        if (!check.canApprove) {
          throw new Error(check.reason || 'Insufficient leave balance.');
        }
      }
    }

    raw.prepare(`
      INSERT INTO leave_requests (
        id, employee_id, leave_type, start_date, end_date, days_count,
        reason, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING', ?, ?)
    `).run(
      id,
      input.employeeId,
      input.leaveType,
      input.startDate,
      input.endDate,
      input.daysCount,
      input.reason,
      now,
      now
    );

    return {
      id,
      employeeId: input.employeeId,
      leaveType: input.leaveType,
      startDate: input.startDate,
      endDate: input.endDate,
      daysCount: input.daysCount,
      reason: input.reason,
      status: 'PENDING',
      createdAt: now,
      updatedAt: now,
    };
  }

  public getRequests(options?: {
    employeeId?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }): { items: LeaveRequestEntity[]; total: number } {
    const raw = this.connection.getRawDb();
    const conditions: string[] = [];
    const params: any[] = [];

    if (options?.employeeId) {
      conditions.push('employee_id = ?');
      params.push(options.employeeId);
    }
    if (options?.status && options.status !== 'ALL') {
      conditions.push('status = ?');
      params.push(options.status);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const countRow = raw.prepare(`SELECT COUNT(*) as c FROM leave_requests ${whereClause}`).get(...params) as { c: number };
    const total = countRow.c;

    const limit = options?.limit ?? 50;
    const offset = options?.offset ?? 0;

    const rows = raw.prepare(`
      SELECT * FROM leave_requests
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, limit, offset) as any[];

    return {
      items: rows.map((r) => this.mapRequestRow(r)),
      total,
    };
  }

  public reviewRequest(input: {
    requestId: string;
    status: 'APPROVED' | 'REJECTED' | 'CANCELLED';
    approvedBy: string;
    actionNotes?: string;
  }): LeaveRequestEntity {
    return this.connection.transaction(() => {
      const raw = this.connection.getRawDb();
      const existing = raw.prepare(`SELECT * FROM leave_requests WHERE id = ?`).get(input.requestId) as any;
      if (!existing) {
        throw new Error(`Leave request not found: ${input.requestId}`);
      }

      if (existing.status !== 'PENDING') {
        throw new Error(`Cannot review leave request in ${existing.status} status.`);
      }

      const now = new Date().toISOString();

      if (input.status === 'APPROVED' && existing.leave_type !== 'UNPAID') {
        const year = new Date(existing.start_date).getFullYear();
        const balance = raw.prepare(`
          SELECT * FROM leave_balances
          WHERE employee_id = ? AND leave_type = ? AND year = ?
        `).get(existing.employee_id, existing.leave_type, year) as any;

        if (balance) {
          const check = validateLeaveDeduction(balance.allocated_days, balance.used_days, existing.days_count);
          if (!check.canApprove) {
            throw new Error(check.reason || 'Insufficient leave balance to approve.');
          }

          raw.prepare(`
            UPDATE leave_balances
            SET used_days = used_days + ?, updated_at = ?
            WHERE id = ?
          `).run(existing.days_count, now, balance.id);
        }
      }

      raw.prepare(`
        UPDATE leave_requests
        SET status = ?, approved_by = ?, action_notes = ?, updated_at = ?
        WHERE id = ?
      `).run(input.status, input.approvedBy, input.actionNotes ?? null, now, input.requestId);

      return {
        id: existing.id,
        employeeId: existing.employee_id,
        leaveType: existing.leave_type,
        startDate: existing.start_date,
        endDate: existing.end_date,
        daysCount: existing.days_count,
        reason: existing.reason,
        status: input.status,
        approvedBy: input.approvedBy,
        actionNotes: input.actionNotes ?? null,
        createdAt: existing.created_at,
        updatedAt: now,
      };
    });
  }

  private mapBalanceRow(r: any): LeaveBalanceEntity {
    return {
      id: r.id,
      employeeId: r.employee_id,
      leaveType: r.leave_type,
      year: r.year,
      allocatedDays: r.allocated_days,
      usedDays: r.used_days,
      availableDays: Math.max(0, r.allocated_days - r.used_days),
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    };
  }

  private mapRequestRow(r: any): LeaveRequestEntity {
    return {
      id: r.id,
      employeeId: r.employee_id,
      leaveType: r.leave_type,
      startDate: r.start_date,
      endDate: r.end_date,
      daysCount: r.days_count,
      reason: r.reason,
      status: r.status,
      approvedBy: r.approved_by,
      actionNotes: r.action_notes,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    };
  }
}
