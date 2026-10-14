export const runtime = 'nodejs';
// @ROUTE_EXEMPT: PLATFORM_ADMIN_RELEASES - Desktop release manager & rollout control
import { NextRequest } from 'next/server';
import { CreateReleaseSchema } from '@hr360/schema';
import { getMasterPrismaClient } from '@hr360/db-master';
import { apiError, apiSuccess, createRequestId } from '@/lib/api-response';

export async function GET() {
  const requestId = createRequestId();
  const prisma = getMasterPrismaClient();

  const releases = await prisma.release.findMany({
    orderBy: { createdAt: 'desc' },
  });

  return apiSuccess(releases, requestId);
}

import { authenticateStaff } from '@/lib/auth-service';

export async function POST(req: NextRequest) {
  const requestId = createRequestId();
  const auth = await authenticateStaff(req);

  if (!auth.success) {
    return apiError('FORBIDDEN', auth.error, auth.statusCode, undefined, requestId);
  }

  try {
    const json = await req.json();
    const parsed = CreateReleaseSchema.safeParse(json);

    if (!parsed.success) {
      return apiError('BAD_REQUEST', 'Invalid release parameters.', 400, { errors: parsed.error.flatten().fieldErrors }, requestId);
    }

    const { version, channel, notes, downloadUrl, sha256, isMandatory, minVersion } = parsed.data;
    const prisma = getMasterPrismaClient();

    const existing = await prisma.release.findUnique({ where: { version } });
    if (existing) {
      return apiError('CONFLICT', `Release version ${version} already exists.`, 409, undefined, requestId);
    }

    const release = await prisma.release.create({
      data: {
        version,
        channel,
        notes,
        downloadUrl,
        sha256,
        isMandatory,
        minVersion,
      },
    });

    return apiSuccess(release, requestId, 201);
  } catch (err: any) {
    return apiError('INTERNAL_ERROR', err.message, 500, undefined, requestId);
  }
}
