export const runtime = 'nodejs';
// @ROUTE_EXEMPT: DESKTOP_DEVICE_HEARTBEAT - Workstation telemetry and device binding check
import { NextRequest } from 'next/server';
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

    // 1. Fetch Tenant Status
    const tenant = await prisma.tenant.findUnique({
      where: { companyId },
    });

    if (!tenant) {
      return apiError('NOT_FOUND', 'Tenant organization record not found.', 404, undefined, requestId);
    }

    // 2. Register or update device install
    const device = await prisma.deviceInstall.upsert({
      where: {
        companyId_deviceHash: { companyId, deviceHash },
      },
      update: {
        appVersion,
        deviceName,
        osVersion,
        lastSeenAt: new Date(),
      },
      create: {
        companyId,
        deviceHash,
        appVersion,
        deviceName,
        osVersion,
        isRevoked: false,
      },
    });

    // 3. Log Heartbeat
    await prisma.heartbeat.create({
      data: {
        companyId,
        deviceId: device.id,
        appVersion,
        ipAddress: req.headers.get('x-forwarded-for') || '10.14.0.1',
      },
    });

    // 4. Check for latest release & mandatory update
    const latestRelease = await prisma.release.findFirst({
      where: { channel: 'stable' },
      orderBy: { createdAt: 'desc' },
    });

    const isMandatory = latestRelease?.isMandatory || false;

    return apiSuccess(
      {
        companyStatus: tenant.status,
        isRevoked: device.isRevoked,
        serverTime: new Date().toISOString(),
        latestVersion: latestRelease?.version || '1.0.0',
        mandatoryUpdate: isMandatory,
      },
      requestId
    );
  } catch (err: any) {
    return apiError('INTERNAL_ERROR', err.message, 500, undefined, requestId);
  }
}
