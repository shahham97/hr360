export const runtime = 'nodejs';
import { NextRequest } from 'next/server';
import crypto from 'node:crypto';
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

  // Enforce API & Webhooks feature entitlement (Enterprise only)
  const featureCheck = await requireFeature(companyId, 'feature:integrations:api_webhooks');
  if (!featureCheck.allowed) {
    return apiError('FORBIDDEN', featureCheck.reason || 'Programmatic API tokens and webhooks are exclusive to Enterprise tier.', 403, undefined, requestId);
  }

  try {
    return apiSuccess({
      apiKeys: [
        {
          id: 'key-001',
          name: 'HR Analytics Export Key',
          keyPrefix: 'hr360_live_a1b2',
          scopes: ['employees:read', 'attendance:read', 'payroll:read'],
          createdAt: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString(),
          lastUsedAt: new Date(Date.now() - 3600 * 1000).toISOString(),
        },
      ],
      webhooks: [
        {
          id: 'wh-001',
          targetUrl: 'https://api.company.com/webhooks/hr-events',
          events: ['employee.created', 'payroll.approved'],
          isActive: true,
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

  const { companyId } = auth.context;

  const featureCheck = await requireFeature(companyId, 'feature:integrations:api_webhooks');
  if (!featureCheck.allowed) {
    return apiError('FORBIDDEN', featureCheck.reason || 'Programmatic API tokens and webhooks are exclusive to Enterprise tier.', 403, undefined, requestId);
  }

  try {
    const json = await req.json();
    const { name = 'Integration Token', scopes = ['employees:read'] } = json;

    const rawToken = `hr360_live_${crypto.randomBytes(24).toString('hex')}`;
    const keyPrefix = rawToken.substring(0, 16);

    return apiSuccess({
      message: 'API Key generated successfully. Save this secret token securely as it will not be displayed again.',
      key: {
        id: `key-${Date.now().toString(36)}`,
        name,
        keyPrefix,
        rawSecretToken: rawToken,
        scopes,
        createdAt: new Date().toISOString(),
      },
    }, requestId, 201);
  } catch (err: any) {
    return apiError('INTERNAL_ERROR', err.message, 500, undefined, requestId);
  }
}
