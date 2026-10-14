export const runtime = 'nodejs';
// @ROUTE_EXEMPT: PLATFORM_ADMIN_AUDIT - Platform super-admin audit log viewer
import { NextRequest } from 'next/server';
import { getMasterPrismaClient } from '@hr360/db-master';
import { apiError, apiSuccess, createRequestId } from '@/lib/api-response';

import { authenticateStaff } from '@/lib/auth-service';

export async function GET(req: NextRequest) {
  const requestId = createRequestId();
  const auth = await authenticateStaff(req, ['SUPER_ADMIN']);

  if (!auth.success) {
    return apiError('FORBIDDEN', auth.error, auth.statusCode, undefined, requestId);
  }

  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '100', 10), 500);
    const actionFilter = searchParams.get('action');
    const actorTypeFilter = searchParams.get('actorType');

    const prisma = getMasterPrismaClient();

    const where: any = {};
    if (actionFilter) {
      where.action = actionFilter;
    }
    if (actorTypeFilter) {
      where.actorType = actorTypeFilter;
    }

    const logs = await prisma.masterAuditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        prevHash: true,
        hash: true,
        actorId: true,
        actorType: true,
        action: true,
        entityType: true,
        entityId: true,
        metadata: true,
        ipAddress: true,
        userAgent: true,
        createdAt: true,
      },
    });

    return apiSuccess(logs, requestId);
  } catch (err: any) {
    return apiError('INTERNAL_ERROR', err.message, 500, undefined, requestId);
  }
}
