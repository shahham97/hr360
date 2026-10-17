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

  // Enforce Claims & Advances feature entitlement
  const featureCheck = await requireFeature(companyId, 'feature:finance:claims_advances');
  if (!featureCheck.allowed) {
    return apiError('FORBIDDEN', featureCheck.reason || 'Loans and Advances management requires an upgrade.', 403, undefined, requestId);
  }

  try {
    return apiSuccess({
      advances: [
        {
          id: 'adv-001',
          employeeId: 'emp-101',
          employeeName: 'Sample Employee',
          principalMinor: 5000000, // PKR 50,000
          repaidMinor: 2000000,    // PKR 20,000
          remainingMinor: 3000000, // PKR 30,000
          monthlyInstallmentMinor: 1000000, // PKR 10,000
          tenureMonths: 5,
          installmentsPaid: 2,
          status: 'ACTIVE',
          approvedAt: new Date(Date.now() - 60 * 24 * 3600 * 1000).toISOString(),
        },
      ],
      totalDisbursedMinor: 5000000,
      totalOutstandingMinor: 3000000,
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

  const { companyId } = auth.context;

  const featureCheck = await requireFeature(companyId, 'feature:finance:claims_advances');
  if (!featureCheck.allowed) {
    return apiError('FORBIDDEN', featureCheck.reason || 'Loans and Advances management requires an upgrade.', 403, undefined, requestId);
  }

  try {
    const json = await req.json();
    const { employeeId, principalMinor, tenureMonths = 1, reason = '' } = json;

    if (!employeeId || !principalMinor || principalMinor <= 0) {
      return apiError('BAD_REQUEST', 'Valid employeeId and principalMinor are required.', 400, undefined, requestId);
    }

    const installmentMinor = Math.round(principalMinor / Math.max(1, tenureMonths));

    const advanceRecord = {
      id: `adv-${Date.now().toString(36)}`,
      employeeId,
      principalMinor,
      repaidMinor: 0,
      remainingMinor: principalMinor,
      monthlyInstallmentMinor: installmentMinor,
      tenureMonths,
      status: 'PENDING_APPROVAL',
      reason,
      createdAt: new Date().toISOString(),
    };

    return apiSuccess({
      message: 'Advance application recorded successfully.',
      advance: advanceRecord,
    }, requestId, 201);
  } catch (err: any) {
    return apiError('INTERNAL_ERROR', err.message, 500, undefined, requestId);
  }
}
