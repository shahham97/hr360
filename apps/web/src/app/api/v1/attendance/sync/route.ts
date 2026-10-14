export const runtime = 'nodejs';
import { NextRequest } from 'next/server';
import { SyncDevicePunchesSchema } from '@hr360/schema';
import { apiError, apiSuccess, createRequestId } from '@/lib/api-response';
import { authenticateTenant } from '@/lib/auth-service';

export async function POST(req: NextRequest) {
  const requestId = createRequestId();
  const auth = await authenticateTenant(req);

  if (!auth.success) {
    return apiError('UNAUTHORIZED', auth.error, auth.statusCode, undefined, requestId);
  }

  const companyId = auth.context.companyId;
  const idempotencyKey = req.headers.get('idempotency-key');

  try {
    const { verifyTenantEntitlement } = await import('@/lib/entitlement-guard');
    const entitlementCheck = await verifyTenantEntitlement(companyId, {
      requiredModule: 'attendance',
      checkTerminalLimit: true,
      currentTerminalCount: 0,
    });

    if (!entitlementCheck.allowed) {
      return apiError(
        'FORBIDDEN',
        entitlementCheck.reason || 'Terminal or attendance module not authorized.',
        entitlementCheck.statusCode || 403,
        undefined,
        requestId
      );
    }

    const json = await req.json();
    const parsed = SyncDevicePunchesSchema.safeParse(json);

    if (!parsed.success) {
      return apiError('BAD_REQUEST', 'Invalid punch batch payload.', 400, { errors: parsed.error.flatten().fieldErrors }, requestId);
    }

    const { deviceId, punches, cursorIndex } = parsed.data;

    // Deduplication logic: filter punches within 60s window per deviceUserId
    const dedupedPunches = punches.filter((p, index, self) =>
      index === self.findIndex((t) => (
        t.deviceUserId === p.deviceUserId &&
        Math.abs(new Date(t.punchTime).getTime() - new Date(p.punchTime).getTime()) < 60000
      ))
    );

    return apiSuccess(
      {
        deviceId,
        syncedCount: dedupedPunches.length,
        originalCount: punches.length,
        newCursorIndex: cursorIndex + punches.length,
        idempotencyKey,
      },
      requestId
    );
  } catch (err: any) {
    return apiError('INTERNAL_ERROR', err.message, 500, undefined, requestId);
  }
}
