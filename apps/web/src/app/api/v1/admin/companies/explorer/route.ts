import { NextRequest } from 'next/server';
import crypto from 'node:crypto';
import { getMasterPrismaClient } from '@hr360/db-master';
import { apiError, apiSuccess, createRequestId } from '@/lib/api-response';
import { authenticateStaff } from '@/lib/auth-service';
import { tenantResolver } from '@/lib/tenant-resolver';

// Rate limiter: Max 30 explorer queries per staff per minute
const staffRateLimitMap = new Map<string, { count: number; windowStart: number }>();

function checkExplorerRateLimit(staffId: string): boolean {
  const now = Date.now();
  const windowMs = 60 * 1000;
  const current = staffRateLimitMap.get(staffId);

  if (!current || now - current.windowStart > windowMs) {
    staffRateLimitMap.set(staffId, { count: 1, windowStart: now });
    return true;
  }

  if (current.count >= 30) {
    return false;
  }

  current.count++;
  return true;
}

export async function POST(req: NextRequest) {
  const requestId = createRequestId();
  const auth = await authenticateStaff(req);

  if (!auth.success) {
    return apiError('FORBIDDEN', auth.error, auth.statusCode, undefined, requestId);
  }

  const staffId = auth.staff.staffId;
  const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1';

  if (!checkExplorerRateLimit(staffId)) {
    return apiError('RATE_LIMITED', 'Explorer query rate limit exceeded (30 requests/minute).', 429, undefined, requestId);
  }

  try {
    const json = await req.json();
    const { companyId, module = 'employees', action = 'list', reason = 'Support Investigation' } = json;

    if (!companyId) {
      return apiError('BAD_REQUEST', 'Missing companyId.', 400, undefined, requestId);
    }

    const prisma = getMasterPrismaClient();

    // Check company exists and access policy allows support
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      include: { accessPolicy: true },
    });

    if (!company) {
      return apiError('NOT_FOUND', 'Company not found.', 404, undefined, requestId);
    }

    if (company.accessPolicy && company.accessPolicy.allowSupportAccess === false) {
      return apiError(
        'FORBIDDEN',
        'Customer has opted out of administrator support access under privacy policy.',
        403,
        undefined,
        requestId
      );
    }

    // Resolve tenant connection (decrypted cluster connection pool or local core)
    const tenantCtx = await tenantResolver.resolveTenant(companyId);

    // Create Support Session record if none exists for this staff
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour session
    let session = await prisma.supportAccessSession.findFirst({
      where: {
        companyId,
        staffId,
        revokedAt: null,
        expiresAt: { gt: now },
      },
    });

    if (!session) {
      session = await prisma.supportAccessSession.create({
        data: {
          companyId,
          staffId,
          reason,
          mfaVerified: true,
          ipAddress,
          expiresAt,
        },
      });
    }

    // Support Context for ITenantServices queries
    const actorCtx = {
      companyId,
      userId: staffId,
      role: 'STAFF',
      isSupportSession: true,
    };

    let resultData: any = null;

    // Read-only query dispatching
    if (module === 'employees') {
      const list = await tenantCtx.services.employee.list(actorCtx);
      // Mask nationalId and bankAccountNumber by default
      resultData = list.map((emp: any) => ({
        ...emp,
        nationalId: emp.nationalId ? `${emp.nationalId.substring(0, 5)}-*****-*` : 'N/A',
        bankAccountNumber: emp.bankAccountNumber ? `****${emp.bankAccountNumber.slice(-4)}` : null,
      }));
    } else if (module === 'attendance') {
      resultData = await tenantCtx.services.attendance.listRecords(actorCtx, undefined, undefined, undefined);
    } else if (module === 'payroll') {
      resultData = await tenantCtx.services.payroll.listRuns(actorCtx);
    } else if (module === 'leaves') {
      resultData = await tenantCtx.services.leave.listRequests(actorCtx);
    } else if (module === 'certificates') {
      resultData = await tenantCtx.services.certificate.listCertificates(actorCtx);
    } else if (module === 'audit') {
      resultData = await tenantCtx.services.audit.listLogs(actorCtx, { limit: 100 });
    } else {
      resultData = { message: 'Module loaded in explorer', storageMode: tenantCtx.storageMode };
    }

    // Log the explorer query to SupportAccessLog
    await prisma.supportAccessLog.create({
      data: {
        sessionId: session.id,
        companyId,
        staffId,
        action: `EXPLORER_VIEW_${module.toUpperCase()}`,
        entityType: module.toUpperCase(),
        details: JSON.stringify({ reason, timestamp: now.toISOString() }),
      },
    });

    return apiSuccess({
      companyId,
      companyName: company.name,
      storageMode: tenantCtx.storageMode,
      module,
      data: resultData,
      isReadOnly: true,
      sessionId: session.id,
    }, requestId);
  } catch (err: any) {
    return apiError('INTERNAL_ERROR', err.message, 500, undefined, requestId);
  }
}
