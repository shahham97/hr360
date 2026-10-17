export const runtime = 'nodejs';
// @ROUTE_EXEMPT: PUBLIC_REMOTE_CONFIG - Public address indirection and client bootstrap configuration
import { NextRequest } from 'next/server';
import { apiSuccess, createRequestId } from '@/lib/api-response';

export async function GET(req: NextRequest) {
  const requestId = createRequestId();
  const appUrl = process.env.APP_URL || 'https://hr360-one.vercel.app';

  return apiSuccess(
    {
      version: 1,
      apiUrl: appUrl,
      backupApiUrl: appUrl,
      minAppVersion: '1.0.0',
      timestamp: Date.now(),
    },
    requestId
  );
}
