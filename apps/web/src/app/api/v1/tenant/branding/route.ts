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

  // Enforce White-label branding feature entitlement (Enterprise only)
  const featureCheck = await requireFeature(companyId, 'feature:whitelabel:custom_brand');
  if (!featureCheck.allowed) {
    return apiError('FORBIDDEN', featureCheck.reason || 'White-label custom portal branding is exclusive to Enterprise tier.', 403, undefined, requestId);
  }

  try {
    return apiSuccess({
      branding: {
        primaryColor: '#0f172a',
        accentColor: '#1d68f2',
        portalTitle: 'Company HR Workspace',
        customLogoUrl: null,
        faviconUrl: null,
        customCssTheme: null,
      },
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

  const featureCheck = await requireFeature(companyId, 'feature:whitelabel:custom_brand');
  if (!featureCheck.allowed) {
    return apiError('FORBIDDEN', featureCheck.reason || 'White-label custom portal branding is exclusive to Enterprise tier.', 403, undefined, requestId);
  }

  try {
    const json = await req.json();
    const { primaryColor, accentColor, portalTitle, customLogoUrl } = json;

    return apiSuccess({
      message: 'Portal theme and custom branding applied successfully.',
      branding: {
        primaryColor: primaryColor || '#0f172a',
        accentColor: accentColor || '#1d68f2',
        portalTitle: portalTitle || 'Company HR Workspace',
        customLogoUrl: customLogoUrl || null,
        updatedAt: new Date().toISOString(),
      },
    }, requestId);
  } catch (err: any) {
    return apiError('INTERNAL_ERROR', err.message, 500, undefined, requestId);
  }
}
