import crypto from 'node:crypto';
import { DatabaseConnection } from '../database/connection';
import { deduplicatePunches, evaluateCheckIn } from '../domain/attendance-engine';

export interface AttendanceEntity {
  id: string;
  employeeId: string;
  punchTime: string;
  punchType: 'CHECK_IN' | 'CHECK_OUT' | 'BREAK_START' | 'BREAK_END';
  terminalId: string;
  verifiedMode: string;
  status: 'ON_TIME' | 'LATE' | 'EARLY_DEPARTURE' | 'HALF_DAY' | 'OVERTIME';
  lateMinutes: number;
  overtimeMinutes: number;
  notes?: string | null;
  createdAt: string;
}

export interface RecordPunchInput {
  employeeId: string;
  punchTimeIso?: string;
  punchTime?: string;
  punchType: 'CHECK_IN' | 'CHECK_OUT' | 'BREAK_START' | 'BREAK_END';
  terminalId?: string;
  verifiedMode?: string;
  notes?: string;
}

export class AttendanceRepository {
  private readonly connection: DatabaseConnection;

  constructor(connection: DatabaseConnection) {
    this.connection = connection;
  }

  public recordPunch(input: RecordPunchInput): AttendanceEntity {
    const raw = this.connection.getRawDb();
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const punchTime = input.punchTimeIso || input.punchTime || now;

    const evalResult = input.punchType === 'CHECK_IN'
      ? evaluateCheckIn(punchTime)
      : { status: 'ON_TIME' as const, lateMinutes: 0 };

    const record: AttendanceEntity = {
      id,
      employeeId: input.employeeId,
      punchTime,
      punchType: input.punchType,
      terminalId: input.terminalId || 'DEFAULT_TERM',
      verifiedMode: input.verifiedMode || 'FINGERPRINT',
      status: evalResult.status,
      lateMinutes: evalResult.lateMinutes,
      overtimeMinutes: 0,
      notes: input.notes ?? null,
      createdAt: now,
    };

    raw.prepare(`
      INSERT INTO attendance_records (
        id, employee_id, punch_time, punch_type, terminal_id,
        verified_mode, status, late_minutes, overtime_minutes, notes, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      record.id, record.employeeId, record.punchTime, record.punchType,
      record.terminalId, record.verifiedMode, record.status, record.lateMinutes,
      record.overtimeMinutes, record.notes, record.createdAt
    );

    return record;
  }

  public batchSync(
    punches: Array<RecordPunchInput>,
    terminalId: string
  ): { syncedCount: number; duplicateCount: number } {
    // 1. Normalize and deduplicate in-memory using grace period
    const normalized = punches.map((p) => ({
      ...p,
      punchTimeIso: p.punchTimeIso || p.punchTime || new Date().toISOString(),
      terminalId: p.terminalId || terminalId,
    }));
    const deduplicated = deduplicatePunches(normalized);
    let duplicateCount = punches.length - deduplicated.length;

    let syncedCount = 0;
    this.connection.transaction(() => {
      const raw = this.connection.getRawDb();
      const checkStmt = raw.prepare(`
        SELECT id FROM attendance_records
        WHERE employee_id = ? AND terminal_id = ? AND punch_time >= ? AND punch_time <= ?
        LIMIT 1
      `);

      for (const punch of deduplicated) {
        const punchMs = new Date(punch.punchTimeIso).getTime();
        const minTime = new Date(punchMs - 120000).toISOString();
        const maxTime = new Date(punchMs + 120000).toISOString();

        const existing = checkStmt.get(punch.employeeId, punch.terminalId, minTime, maxTime);
        if (existing) {
          duplicateCount++;
          continue;
        }

        this.recordPunch(punch);
        syncedCount++;
      }
    });

    return { syncedCount, duplicateCount };
  }

  public listRecent(options?: {
    employeeId?: string;
    limit?: number;
    offset?: number;
  }): { items: AttendanceEntity[]; total: number } {
    const raw = this.connection.getRawDb();
    const limit = options?.limit ?? 50;
    const offset = options?.offset ?? 0;

    let rows: any[];
    let total: number;

    if (options?.employeeId) {
      const countRow = raw.prepare(`SELECT COUNT(*) as c FROM attendance_records WHERE employee_id = ?`).get(options.employeeId) as { c: number };
      total = countRow.c;
      rows = raw.prepare(`
        SELECT * FROM attendance_records
        WHERE employee_id = ?
        ORDER BY punch_time DESC
        LIMIT ? OFFSET ?
      `).all(options.employeeId, limit, offset);
    } else {
      const countRow = raw.prepare(`SELECT COUNT(*) as c FROM attendance_records`).get() as { c: number };
      total = countRow.c;
      rows = raw.prepare(`
        SELECT * FROM attendance_records
        ORDER BY punch_time DESC
        LIMIT ? OFFSET ?
      `).all(limit, offset);
    }

    return {
      items: rows.map(this.mapRow),
      total,
    };
  }

  public getEmployeeAttendanceSummary(employeeId: string, startDate?: string, endDate?: string): {
    totalPunches: number;
    latePunches: number;
    onTimePunches: number;
  } {
    const raw = this.connection.getRawDb();
    const conditions: string[] = ['employee_id = ?'];
    const params: any[] = [employeeId];

    if (startDate) {
      conditions.push('punch_time >= ?');
      params.push(startDate);
    }
    if (endDate) {
      conditions.push('punch_time <= ?');
      params.push(endDate);
    }

    const where = conditions.join(' AND ');
    const rows = raw.prepare(`
      SELECT status, COUNT(*) as cnt
      FROM attendance_records
      WHERE ${where}
      GROUP BY status
    `).all(...params) as Array<{ status: string; cnt: number }>;

    let total = 0;
    let late = 0;
    let onTime = 0;

    for (const r of rows) {
      total += r.cnt;
      if (r.status === 'LATE') late += r.cnt;
      if (r.status === 'ON_TIME') onTime += r.cnt;
    }

    return {
      totalPunches: total,
      latePunches: late,
      onTimePunches: onTime,
    };
  }

  // Convenient aliases matching IPC commands
  public logPunch(input: RecordPunchInput): AttendanceEntity {
    return this.recordPunch(input);
  }

  public batchSyncPunches(punches: Array<RecordPunchInput>, terminalId = 'SYNC_JOB'): { inserted: number; duplicates: number } {
    const res = this.batchSync(punches, terminalId);
    return { inserted: res.syncedCount, duplicates: res.duplicateCount };
  }

  public getAttendance(options?: { employeeId?: string; limit?: number; offset?: number }): { items: AttendanceEntity[]; total: number } {
    return this.listRecent(options);
  }

  private mapRow(r: any): AttendanceEntity {
    return {
      id: r.id,
      employeeId: r.employee_id,
      punchTime: r.punch_time,
      punchType: r.punch_type,
      terminalId: r.terminal_id,
      verifiedMode: r.verified_mode,
      status: r.status,
      lateMinutes: r.late_minutes,
      overtimeMinutes: r.overtime_minutes,
      notes: r.notes,
      createdAt: r.created_at,
    };
  }
}
