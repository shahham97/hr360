export const runtime = 'nodejs';
import { NextRequest } from 'next/server';
import { apiError, apiSuccess, createRequestId } from '@/lib/api-response';
import { authenticateRequest } from '@/lib/auth-service';
import { requireFeature } from '@/lib/entitlement-guard';

export async function GET(req: NextRequest) {
  const requestId = createRequestId();
  const auth = await authenticateRequest(req);

  if (!auth.success) {
    return apiError('UNAUTHORIZED', auth.error, auth.statusCode, undefined, requestId);
  }

  const { companyId, userId, role } = auth.context;

  // Enforce ESS Portal feature entitlement
  const featureCheck = await requireFeature(companyId, 'feature:ess:portal');
  if (!featureCheck.allowed) {
    return apiError('FORBIDDEN', featureCheck.reason || 'Employee Self-Service portal is not enabled on this plan.', 403, undefined, requestId);
  }

  try {
    return apiSuccess({
      employeeId: userId,
      role,
      companyId,
      portalActive: true,
      profile: {
        id: userId,
        status: 'ACTIVE',
        employmentType: 'FULL_TIME',
        department: 'Operations',
        designation: 'Staff Associate',
        allocatedLeaves: {
          casual: 10,
          sick: 8,
          annual: 14,
        },
      },
      features: {
        canApplyLeave: true,
        canDownloadPayslips: true,
        canViewAttendance: true,
      },
    }, requestId);
  } catch (err: any) {
    return apiError('INTERNAL_ERROR', err.message, 500, undefined, requestId);
  }
}
