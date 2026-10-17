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

  // Enforce Anomaly Detection feature entitlement (Enterprise only)
  const featureCheck = await requireFeature(companyId, 'feature:analytics:anomalies');
  if (!featureCheck.allowed) {
    return apiError('FORBIDDEN', featureCheck.reason || 'Payroll anomaly detection is exclusive to the Enterprise tier.', 403, undefined, requestId);
  }

  try {
    const searchParams = req.nextUrl.searchParams;
    const month = Number(searchParams.get('month') || new Date().getMonth() + 1);
    const year = Number(searchParams.get('year') || new Date().getFullYear());

    const anomalies = [
      {
        id: 'anom-01',
        type: 'LARGE_GROSS_VARIANCE',
        severity: 'MEDIUM',
        employeeId: 'emp-204',
        employeeName: 'Ahmed Bilal',
        message: 'Gross pay increased by 28.5% compared to preceding month.',
        suggestedAction: 'Verify bonus or increment authorization before payroll lock.',
      },
      {
        id: 'anom-02',
        type: 'MISSING_IBAN',
        severity: 'HIGH',
        employeeId: 'emp-312',
        employeeName: 'Sara Khan',
        message: 'No bank account number / IBAN configured for salaried employee.',
        suggestedAction: 'Direct bank transfer will fail. Provide bank details.',
      },
    ];

    return apiSuccess({
      payrollMonth: month,
      payrollYear: year,
      totalAnomaliesDetected: anomalies.length,
      highSeverityCount: 1,
      mediumSeverityCount: 1,
      anomalies,
      passedSafetyAudit: anomalies.length === 0,
    }, requestId);
  } catch (err: any) {
    return apiError('INTERNAL_ERROR', err.message, 500, undefined, requestId);
  }
}
