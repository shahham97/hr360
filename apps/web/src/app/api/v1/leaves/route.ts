import { NextRequest } from 'next/server';
import { apiError, apiSuccess, createRequestId } from '@/lib/api-response';
import { authenticateTenant } from '@/lib/auth-service';
import { verifyTenantEntitlement } from '@/lib/entitlement-guard';

export async function GET(req: NextRequest) {
  const requestId = createRequestId();
  const auth = await authenticateTenant(req);
  if (!auth.success) {
    return apiError('UNAUTHORIZED', auth.error, auth.statusCode, undefined, requestId);
  }

  const guard = await verifyTenantEntitlement(auth.context.companyId, {
    requiredModule: 'leaves',
  });
  if (!guard.allowed) {
    return apiError('FORBIDDEN', guard.reason || 'Leave management module disabled.', guard.statusCode || 403, undefined, requestId);
  }

  return apiSuccess({ leaves: [] }, requestId);
}

export async function POST(req: NextRequest) {
  const requestId = createRequestId();
  const auth = await authenticateTenant(req);
  if (!auth.success) {
    return apiError('UNAUTHORIZED', auth.error, auth.statusCode, undefined, requestId);
  }

  const guard = await verifyTenantEntitlement(auth.context.companyId, {
    requiredModule: 'leaves',
  });
  if (!guard.allowed) {
    return apiError('FORBIDDEN', guard.reason || 'Leave management module disabled.', guard.statusCode || 403, undefined, requestId);
  }

  const body = await req.json().catch(() => ({}));
  return apiSuccess({ recorded: true, data: body }, requestId, 201);
}
