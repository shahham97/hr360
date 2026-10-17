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

  // Enforce Compliance Calendar feature entitlement
  const featureCheck = await requireFeature(companyId, 'feature:compliance:calendar');
  if (!featureCheck.allowed) {
    return apiError('FORBIDDEN', featureCheck.reason || 'Compliance Calendar requires Growth or Enterprise tier.', 403, undefined, requestId);
  }

  try {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    const deadlines = [
      {
        id: 'stat-eobi',
        name: 'EOBI Contribution Deposit & Filing',
        authority: 'Employees Old-Age Benefits Institution',
        dueDayOfMonth: 15,
        category: 'SOCIAL_SECURITY',
        frequency: 'MONTHLY',
        nextDueDate: `${currentYear}-${String(currentMonth).padStart(2, '0')}-15`,
        penaltyRateText: 'Statutory surcharge applies after 15th',
      },
      {
        id: 'stat-tax-withholding',
        name: 'Monthly Income Tax Withholding Statement',
        authority: 'Federal Board of Revenue (FBR)',
        dueDayOfMonth: 15,
        category: 'DIRECT_TAX',
        frequency: 'MONTHLY',
        nextDueDate: `${currentYear}-${String(currentMonth).padStart(2, '0')}-15`,
        penaltyRateText: 'Default surcharge under Section 205',
      },
      {
        id: 'stat-provincial-ss',
        name: 'Provincial Social Security (PESSI / SESSI)',
        authority: 'Provincial Social Security Institution',
        dueDayOfMonth: 15,
        category: 'SOCIAL_SECURITY',
        frequency: 'MONTHLY',
        nextDueDate: `${currentYear}-${String(currentMonth).padStart(2, '0')}-15`,
        penaltyRateText: 'Surcharge for late contribution',
      },
      {
        id: 'stat-annual-statement',
        name: 'Annual Employer Withholding Tax Statement',
        authority: 'Federal Board of Revenue (FBR)',
        dueDayOfMonth: 31,
        category: 'ANNUAL_FILING',
        frequency: 'ANNUAL',
        nextDueDate: `${currentYear}-08-31`,
        penaltyRateText: 'Section 182 penalty applies for late return',
      },
    ];

    return apiSuccess({
      calendarYear: currentYear,
      calendarMonth: currentMonth,
      deadlines,
    }, requestId);
  } catch (err: any) {
    return apiError('INTERNAL_ERROR', err.message, 500, undefined, requestId);
  }
}
