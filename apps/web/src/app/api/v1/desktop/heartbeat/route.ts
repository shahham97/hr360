export const runtime = 'nodejs';
// @ROUTE_EXEMPT: DESKTOP_DEVICE_HEARTBEAT - Workstation telemetry and device binding check
import { NextRequest } from 'next/server';
import crypto from 'node:crypto';
import { DesktopHeartbeatRequestSchema } from '@hr360/schema';
import { getMasterPrismaClient } from '@hr360/db-master';
import { apiError, apiSuccess, createRequestId } from '@/lib/api-response';
import { authenticateTenant } from '@/lib/auth-service';

export async function POST(req: NextRequest) {
  const requestId = createRequestId();
  const auth = await authenticateTenant(req);

  if (!auth.success) {
    return apiError('UNAUTHORIZED', auth.error, auth.statusCode, undefined, requestId);
  }

  const companyId = auth.context.companyId;

  try {
    const json = await req.json();
    const parsed = DesktopHeartbeatRequestSchema.safeParse(json);

    if (!parsed.success) {
      return apiError('BAD_REQUEST', 'Invalid heartbeat payload.', 400, { errors: parsed.error.flatten().fieldErrors }, requestId);
    }

    const { appVersion, deviceHash, deviceName, osVersion } = parsed.data;
    const prisma = getMasterPrismaClient();

    // 1. Fetch Tenant and Active Subscription
    const now = new Date();
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      include: {
        tenant: true,
        subscriptions: {
          where: { expiresAt: { gt: now } },
          include: { plan: true },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!company) {
      return apiError('NOT_FOUND', 'Company organization record not found.', 404, undefined, requestId);
    }

    const tenant = company.tenant;
    const activeSub = company.subscriptions[0];
    const companyStatus = company.status === 'SUSPENDED' ? 'SUSPENDED' : (tenant?.status || company.status);

    // 2. Fetch Latest Stable Release
    const latestRelease = await prisma.release.findFirst({
      where: { channel: 'stable' },
      orderBy: { createdAt: 'desc' },
    });

    const isMandatory = latestRelease?.isMandatory || false;
    const offlineGraceDays = activeSub?.graceDays || 3;
    const planTier = activeSub?.plan?.code || 'STARTER';

    // 3. ETag check for bandwidth efficiency (P2.2)
    const etagData = `${companyId}:${companyStatus}:${planTier}:${latestRelease?.version || '1.0.0'}:${company.updatedAt.getTime()}`;
    const etag = `"${crypto.createHash('md5').update(etagData).digest('hex')}"`;

    if (req.headers.get('if-none-match') === etag) {
      return new Response(null, {
        status: 304,
        headers: {
          ETag: etag,
          'x-request-id': requestId,
        },
      });
    }

    // 4. Update Device Install heartbeat timestamp (bounded without creating unbounded log rows)
    const device = await prisma.deviceInstall.upsert({
      where: {
        companyId_deviceHash: { companyId, deviceHash },
      },
      update: {
        appVersion,
        deviceName: deviceName || undefined,
        osVersion: osVersion || undefined,
        lastSeenAt: new Date(),
      },
      create: {
        companyId,
        deviceHash,
        appVersion,
        deviceName: deviceName || 'Windows Client',
        osVersion: osVersion || 'Windows',
        isRevoked: false,
      },
    });

    const response = apiSuccess(
      {
        companyStatus,
        isRevoked: device.isRevoked,
        planTier,
        offlineGraceDays,
        serverTime: new Date().toISOString(),
        latestVersion: latestRelease?.version || '1.0.0',
        mandatoryUpdate: isMandatory,
      },
      requestId
    );

    response.headers.set('ETag', etag);
    return response;
  } catch (err: any) {
    return apiError('INTERNAL_ERROR', err.message || 'Heartbeat failed.', 500, undefined, requestId);
  }
}
