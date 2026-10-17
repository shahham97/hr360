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

  const { companyId } = auth.context;

  // Enforce Multi-Branch feature entitlement (Enterprise only)
  const featureCheck = await requireFeature(companyId, 'feature:entity:multi_branch');
  if (!featureCheck.allowed) {
    return apiError('FORBIDDEN', featureCheck.reason || 'Multi-branch organizational management is exclusive to Enterprise tier.', 403, undefined, requestId);
  }

  try {
    const branches = [
      { id: 'branch-01', name: 'Headquarters', city: 'Lahore', address: 'Gulberg III', isActive: true, employeeCount: 120 },
      { id: 'branch-02', name: 'Karachi Regional Hub', city: 'Karachi', address: 'Clifton Block 4', isActive: true, employeeCount: 65 },
      { id: 'branch-03', name: 'Islamabad Technology Center', city: 'Islamabad', address: 'Blue Area', isActive: true, employeeCount: 40 },
    ];

    return apiSuccess({
      branches,
      totalBranches: branches.length,
      maxAllowedBranches: 100,
    }, requestId);
  } catch (err: any) {
    return apiError('INTERNAL_ERROR', err.message, 500, undefined, requestId);
  }
}
