export const runtime = 'nodejs';
import { NextRequest } from 'next/server';
import crypto from 'node:crypto';
import { apiError, apiSuccess, createRequestId } from '@/lib/api-response';
import { authenticateTenant } from '@/lib/auth-service';
import { executeTenantQuery } from '@/lib/tenant-db';

export async function GET(req: NextRequest) {
  const requestId = createRequestId();
  const auth = await authenticateTenant(req);
  if (!auth.success) {
    return apiError('UNAUTHORIZED', auth.error, auth.statusCode, undefined, requestId);
  }
  const companyId = auth.context.companyId;

  try {
    const rows = await executeTenantQuery<any>(
      companyId,
      `SELECT ar.id, ar.employee_id as employeeId, ar.punch_time as punchTime,
              ar.punch_type as punchType, ar.terminal_id as terminalId,
              ar.verified_mode as verifiedMode, ar.status, ar.late_minutes as lateMinutes,
              ar.overtime_minutes as overtimeMinutes, ar.notes, ar.created_at as createdAt,
              e.employee_code as employeeCode, e.first_name as firstName, e.last_name as lastName,
              e.department
       FROM attendance_records ar
       LEFT JOIN employees e ON ar.employee_id = e.id
       ORDER BY ar.created_at DESC LIMIT 500`
    );

    const mapped = rows.map((r: any) => ({
      id: r.id,
      employeeId: r.employeeId,
      employeeCode: r.employeeCode || 'EMP-001',
      employeeName: r.firstName ? `${r.firstName} ${r.lastName}`.trim() : 'Employee',
      department: r.department || 'General',
      date: (r.punchTime || r.createdAt || '').slice(0, 10),
      checkIn: r.punchType === 'CHECK_IN' ? (r.punchTime?.slice(11, 16) || '09:00 AM') : '09:00 AM',
      checkOut: r.punchType === 'CHECK_OUT' ? (r.punchTime?.slice(11, 16) || '05:00 PM') : undefined,
      status: r.status || 'PRESENT',
      terminalId: r.terminalId,
      verifiedMode: r.verifiedMode,
      lateMinutes: Number(r.lateMinutes || 0),
      overtimeMinutes: Number(r.overtimeMinutes || 0),
      notes: r.notes || '',
    }));

    return apiSuccess(mapped, requestId);
  } catch (err: any) {
    return apiError('INTERNAL_ERROR', err.message, 500, undefined, requestId);
  }
}

export async function POST(req: NextRequest) {
  const requestId = createRequestId();
  const auth = await authenticateTenant(req);
  if (!auth.success) {
    return apiError('UNAUTHORIZED', auth.error, auth.statusCode, undefined, requestId);
  }
  const companyId = auth.context.companyId;

  try {
    const body = await req.json();
    const id = body.id || `att-${Date.now()}`;
    const employeeId = body.employeeId;
    const punchTime = body.punchTime || body.date || new Date().toISOString();
    const punchType = body.punchType || 'CHECK_IN';
    const terminalId = body.terminalId || 'LAN_TERMINAL_01';
    const verifiedMode = body.verifiedMode || 'MANUAL_OVERRIDE';
    const status = body.status || 'PRESENT';
    const lateMinutes = Number(body.lateMinutes || 0);
    const overtimeMinutes = Number(body.overtimeMinutes || 0);
    const notes = body.notes || body.reason || '';
    const now = new Date().toISOString();

    await executeTenantQuery(
      companyId,
      `INSERT INTO attendance_records (
        id, employee_id, punch_time, punch_type, terminal_id,
        verified_mode, status, late_minutes, overtime_minutes, notes, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, employeeId, punchTime, punchType, terminalId, verifiedMode, status, lateMinutes, overtimeMinutes, notes, now]
    );

    return apiSuccess({ recorded: true, id, data: body }, requestId, 201);
  } catch (err: any) {
    return apiError('INTERNAL_ERROR', err.message, 500, undefined, requestId);
  }
}

export async function PATCH(req: NextRequest) {
  const requestId = createRequestId();
  const auth = await authenticateTenant(req);
  if (!auth.success) {
    return apiError('UNAUTHORIZED', auth.error, auth.statusCode, undefined, requestId);
  }
  const companyId = auth.context.companyId;

  try {
    const body = await req.json();
    const id = body.id;
    const status = body.status;
    const notes = body.notes || body.reason || '';
    const lateMinutes = Number(body.lateMinutes || 0);

    await executeTenantQuery(
      companyId,
      `UPDATE attendance_records SET status = ?, late_minutes = ?, notes = ? WHERE id = ?`,
      [status, lateMinutes, notes, id]
    );

    return apiSuccess({ updated: true, id }, requestId);
  } catch (err: any) {
    return apiError('INTERNAL_ERROR', err.message, 500, undefined, requestId);
  }
}
