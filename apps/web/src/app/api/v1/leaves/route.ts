export const runtime = 'nodejs';
import { NextRequest } from 'next/server';
import crypto from 'node:crypto';
import { apiError, apiSuccess, createRequestId } from '@/lib/api-response';
import { authenticateTenant } from '@/lib/auth-service';
import { verifyTenantEntitlement } from '@/lib/entitlement-guard';
import { executeTenantQuery } from '@/lib/tenant-db';

export async function GET(req: NextRequest) {
  const requestId = createRequestId();
  const auth = await authenticateTenant(req);
  if (!auth.success) {
    return apiError('UNAUTHORIZED', auth.error, auth.statusCode, undefined, requestId);
  }
  const companyId = auth.context.companyId;

  const guard = await verifyTenantEntitlement(companyId, {
    requiredModule: 'leaves',
  });
  if (!guard.allowed) {
    return apiError('FORBIDDEN', guard.reason || 'Leave management module disabled.', guard.statusCode || 403, undefined, requestId);
  }

  try {
    const rows = await executeTenantQuery<any>(
      companyId,
      `SELECT lr.id, lr.employee_id as employeeId, lr.leave_type as leaveType,
              lr.start_date as startDate, lr.end_date as endDate, lr.days_count as daysCount,
              lr.reason, lr.status, lr.approved_by as reviewedBy, lr.action_notes as reviewComment,
              lr.created_at as submittedAt,
              e.employee_code as employeeCode, e.first_name as firstName, e.last_name as lastName
       FROM leave_requests lr
       LEFT JOIN employees e ON lr.employee_id = e.id
       ORDER BY lr.created_at DESC`
    );

    const leaves = rows.map((r: any) => ({
      id: r.id,
      employeeId: r.employeeId,
      employeeName: r.firstName ? `${r.firstName} ${r.lastName}`.trim() : 'Staff Member',
      employeeCode: r.employeeCode || 'EMP-000',
      leaveType: r.leaveType,
      startDate: r.startDate,
      endDate: r.endDate,
      daysCount: Number(r.daysCount || 1),
      reason: r.reason,
      status: r.status,
      currentApproverStep: 'HR_MANAGER',
      reviewedBy: r.reviewedBy || undefined,
      reviewComment: r.reviewComment || undefined,
      submittedAt: r.submittedAt ? r.submittedAt.replace('T', ' ').slice(0, 16) : new Date().toISOString().replace('T', ' ').slice(0, 16),
    }));

    return apiSuccess({ leaves }, requestId);
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

  const guard = await verifyTenantEntitlement(companyId, {
    requiredModule: 'leaves',
  });
  if (!guard.allowed) {
    return apiError('FORBIDDEN', guard.reason || 'Leave management module disabled.', guard.statusCode || 403, undefined, requestId);
  }

  try {
    const body = await req.json();
    const id = body.id || `lr-${Date.now()}`;
    const employeeId = body.employeeId;
    const leaveType = body.leaveType || 'CASUAL';
    const startDate = body.startDate;
    const endDate = body.endDate;
    const daysCount = Number(body.daysCount || 1);
    const reason = body.reason || '';
    const status = body.status || 'PENDING';
    const now = new Date().toISOString();

    await executeTenantQuery(
      companyId,
      `INSERT INTO leave_requests (
        id, employee_id, leave_type, start_date, end_date,
        days_count, reason, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, employeeId, leaveType, startDate, endDate, daysCount, reason, status, now, now]
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
    const approvedBy = body.reviewedBy || auth.context.email;
    const actionNotes = body.reviewComment || '';
    const now = new Date().toISOString();

    await executeTenantQuery(
      companyId,
      `UPDATE leave_requests SET status = ?, approved_by = ?, action_notes = ?, updated_at = ? WHERE id = ?`,
      [status, approvedBy, actionNotes, now, id]
    );

    return apiSuccess({ updated: true, id, status }, requestId);
  } catch (err: any) {
    return apiError('INTERNAL_ERROR', err.message, 500, undefined, requestId);
  }
}

export async function DELETE(req: NextRequest) {
  const requestId = createRequestId();
  const auth = await authenticateTenant(req);
  if (!auth.success) {
    return apiError('UNAUTHORIZED', auth.error, auth.statusCode, undefined, requestId);
  }
  const companyId = auth.context.companyId;

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return apiError('BAD_REQUEST', 'Missing leave request id', 400, undefined, requestId);
    }

    await executeTenantQuery(
      companyId,
      `DELETE FROM leave_requests WHERE id = ?`,
      [id]
    );

    return apiSuccess({ deleted: true, id }, requestId);
  } catch (err: any) {
    return apiError('INTERNAL_ERROR', err.message, 500, undefined, requestId);
  }
}
