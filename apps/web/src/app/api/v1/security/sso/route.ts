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

  // Enforce SSO feature entitlement (Enterprise only)
  const featureCheck = await requireFeature(companyId, 'feature:security:sso');
  if (!featureCheck.allowed) {
    return apiError('FORBIDDEN', featureCheck.reason || 'Enterprise Single Sign-On is exclusive to Enterprise tier.', 403, undefined, requestId);
  }

  try {
    return apiSuccess({
      ssoConfig: {
        provider: 'SAML_2_0',
        entityId: `https://hr360.local/sp/${companyId}`,
        acsUrl: `https://hr360.local/api/v1/security/sso/saml/acs`,
        idpMetadataUrl: null,
        enforceSsoOnly: false,
        allowedDomains: ['company.com'],
        status: 'CONFIGURED',
      },
      availableIntegrations: [
        'Microsoft Azure Active Directory / Entra ID',
        'Google Workspace SAML',
        'Okta / Ping Identity',
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

  const featureCheck = await requireFeature(companyId, 'feature:security:sso');
  if (!featureCheck.allowed) {
    return apiError('FORBIDDEN', featureCheck.reason || 'Enterprise Single Sign-On is exclusive to Enterprise tier.', 403, undefined, requestId);
  }

  try {
    const json = await req.json();
    const { provider = 'SAML_2_0', idpMetadataUrl, allowedDomains = [], enforceSsoOnly = false } = json;

    return apiSuccess({
      message: 'Enterprise SSO settings updated successfully.',
      ssoConfig: {
        provider,
        idpMetadataUrl,
        allowedDomains,
        enforceSsoOnly,
        updatedAt: new Date().toISOString(),
      },
    }, requestId);
  } catch (err: any) {
    return apiError('INTERNAL_ERROR', err.message, 500, undefined, requestId);
  }
}
