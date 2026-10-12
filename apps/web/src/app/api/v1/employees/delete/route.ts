import { NextRequest } from 'next/server';
import { apiError, apiSuccess, createRequestId } from '@/lib/api-response';
import { executeTenantQuery } from '@/lib/tenant-db';

import { authenticateTenant } from '@/lib/auth-service';

export async function DELETE(req: NextRequest) {
  const requestId = createRequestId();
  const auth = await authenticateTenant(req);

  if (!auth.success) {
    return apiError('UNAUTHORIZED', auth.error, auth.statusCode, undefined, requestId);
  }

  const companyId = auth.context.companyId;
  const actorEmail = auth.context.email;
  const { searchParams } = new URL(req.url);
  const employeeId = searchParams.get('id');

  if (!employeeId) {
    return apiError('BAD_REQUEST', 'Missing employee ID parameter.', 400, undefined, requestId);
  }

  const { verifyTenantEntitlement } = await import('@/lib/entitlement-guard');
  const guard = await verifyTenantEntitlement(companyId, { requiredModule: 'employees' });
  if (!guard.allowed) {
    return apiError('FORBIDDEN', guard.reason || 'Employee management disabled.', guard.statusCode || 403, undefined, requestId);
  }

  try {
    // Delete record strictly in the company's dedicated database
    await executeTenantQuery(
      companyId,
      `DELETE FROM employees WHERE id = ?`,
      [employeeId]
    );

    const { logPlatformAudit } = await import('@/lib/audit-logger');
    await logPlatformAudit({
      actorId: actorEmail,
      actorType: 'TENANT_USER',
      action: 'DELETE_EMPLOYEE_RECORD',
      entityType: 'EMPLOYEE',
      entityId: employeeId,
      metadata: {
        companyId,
        deletedAt: new Date().toISOString(),
        reason: searchParams.get('reason') || 'Deactivated by company administrator',
      },
      ipAddress: req.headers.get('x-forwarded-for') || '10.14.0.1',
      userAgent: req.headers.get('user-agent') || 'HR360 Desktop Client',
    });

    return apiSuccess({ message: `Employee record ${employeeId} deleted and audited.` }, requestId);
  } catch (err: any) {
    return apiError('INTERNAL_ERROR', err.message, 500, undefined, requestId);
  }
}
