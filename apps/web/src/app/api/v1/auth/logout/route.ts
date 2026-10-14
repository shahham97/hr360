export const runtime = 'nodejs';
// @ROUTE_EXEMPT: PUBLIC_AUTH_LOGOUT - Session termination endpoint
import { NextRequest } from 'next/server';
import { getMasterPrismaClient } from '@hr360/db-master';
import { apiError, apiSuccess, createRequestId } from '@/lib/api-response';

export async function POST(req: NextRequest) {
  const requestId = createRequestId();

  try {
    const json = await req.json();
    const { email, companyId, token } = json;

    if (!email) {
      return apiError('BAD_REQUEST', 'Email is required for logout.', 400, undefined, requestId);
    }

    const prisma = getMasterPrismaClient();
    const user = await prisma.companyUser.findFirst({
      where: { email },
      include: { company: true },
    });

    if (user) {
      const { logPlatformAudit } = await import('@/lib/audit-logger');
      await logPlatformAudit({
        actorId: user.id,
        actorType: 'TENANT_USER',
        action: 'COMPANY_ADMIN_LOGOUT',
        entityType: 'COMPANY_USER',
        entityId: user.id,
        metadata: {
          email: user.email,
          companyName: user.company?.name,
          companySlug: user.company?.slug,
          tokenHash: token ? 'REVOKED' : undefined,
        },
        ipAddress: req.headers.get('x-forwarded-for') || '127.0.0.1',
        userAgent: req.headers.get('user-agent') || 'HR360 Desktop Client',
      });
    }

    return apiSuccess({ message: 'Logged out successfully.' }, requestId);
  } catch (err: any) {
    return apiError('INTERNAL_ERROR', err.message, 500, undefined, requestId);
  }
}
