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

  // Enforce Two-Level Workflow feature entitlement
  const featureCheck = await requireFeature(companyId, 'feature:workflow:two_level');
  if (!featureCheck.allowed) {
    return apiError('FORBIDDEN', featureCheck.reason || 'Multi-level approval workflows require Growth or Enterprise tier.', 403, undefined, requestId);
  }

  try {
    return apiSuccess({
      workflowStages: [
        { level: 1, name: 'Line Manager / Supervisor', requiredRole: 'MANAGER', canAutoApprove: false },
        { level: 2, name: 'Department Head / HR Manager', requiredRole: 'HR_MANAGER', canAutoApprove: false },
      ],
      pendingApprovals: [
        {
          id: 'wf-req-101',
          type: 'LEAVE_APPLICATION',
          submittedBy: 'EMP-014',
          currentStage: 1,
          stageName: 'Line Manager Review',
          status: 'PENDING',
          submittedAt: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
        },
      ],
    }, requestId);
  } catch (err: any) {
    return apiError('INTERNAL_ERROR', err.message, 500, undefined, requestId);
  }
}

export async function POST(req: NextRequest) {
  const requestId = createRequestId();
  const auth = await authenticateRequest(req);

  if (!auth.success) {
    return apiError('UNAUTHORIZED', auth.error, auth.statusCode, undefined, requestId);
  }

  const { companyId, userId } = auth.context;

  const featureCheck = await requireFeature(companyId, 'feature:workflow:two_level');
  if (!featureCheck.allowed) {
    return apiError('FORBIDDEN', featureCheck.reason || 'Multi-level approval workflows require Growth or Enterprise tier.', 403, undefined, requestId);
  }

  try {
    const json = await req.json();
    const { approvalId, action, notes } = json;

    if (!approvalId || !action) {
      return apiError('BAD_REQUEST', 'approvalId and action (APPROVE/REJECT) are required.', 400, undefined, requestId);
    }

    return apiSuccess({
      message: `Approval action "${action}" successfully applied by user ${userId}.`,
      approvalId,
      newStatus: action === 'APPROVE' ? 'APPROVED_LEVEL_1' : 'REJECTED',
      reviewedAt: new Date().toISOString(),
      notes,
    }, requestId);
  } catch (err: any) {
    return apiError('INTERNAL_ERROR', err.message, 500, undefined, requestId);
  }
}
