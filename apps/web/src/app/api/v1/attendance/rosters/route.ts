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

  // Enforce Rosters feature entitlement
  const featureCheck = await requireFeature(companyId, 'feature:attendance:rosters');
  if (!featureCheck.allowed) {
    return apiError('FORBIDDEN', featureCheck.reason || 'Shift roster scheduling requires Growth or Enterprise tier.', 403, undefined, requestId);
  }

  try {
    return apiSuccess({
      shifts: [
        { id: 'shift-morning', name: 'General Morning', startTime: '09:00', endTime: '18:00', graceMinutes: 15 },
        { id: 'shift-evening', name: 'Evening Roster', startTime: '17:00', endTime: '02:00', graceMinutes: 15 },
        { id: 'shift-night', name: 'Night Operations', startTime: '21:00', endTime: '06:00', graceMinutes: 15 },
      ],
      rosterRules: {
        rotatingSchedule: true,
        allowShiftSwaps: true,
        overtimeThresholdHours: 8,
      },
    }, requestId);
  } catch (err: any) {
    return apiError('INTERNAL_ERROR', err.message, 500, undefined, requestId);
  }
}
