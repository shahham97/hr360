export const runtime = 'nodejs';
// @ROUTE_EXEMPT: PUBLIC_AUTH_REFRESH - Token rotation endpoint
import { NextRequest } from 'next/server';
import { rotateTenantSession } from '@/lib/auth-service';
import { apiError, apiSuccess, createRequestId } from '@/lib/api-response';

export async function POST(req: NextRequest) {
  const requestId = createRequestId();

  try {
    const json = await req.json();
    const { refreshToken } = json;

    if (!refreshToken) {
      return apiError('BAD_REQUEST', 'Refresh token required.', 400, undefined, requestId);
    }

    const rotated = await rotateTenantSession(refreshToken, req);
    if (!rotated) {
      return apiError('UNAUTHORIZED', 'Invalid, expired, or reused refresh token. Please sign in again.', 401, undefined, requestId);
    }

    return apiSuccess(
      {
        token: rotated.accessToken,
        accessToken: rotated.accessToken,
        refreshToken: rotated.refreshToken,
        expiresIn: rotated.expiresIn,
      },
      requestId
    );
  } catch (err: any) {
    return apiError('INTERNAL_ERROR', err.message, 500, undefined, requestId);
  }
}
