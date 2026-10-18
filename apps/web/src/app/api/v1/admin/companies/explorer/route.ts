export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
// @ROUTE_EXEMPT: PLATFORM_ADMIN_EXPLORER - Support database explorer for authorized platform staff
import { NextRequest } from 'next/server';
import crypto from 'node:crypto';
import { getMasterPrismaClient } from '@hr360/db-master';
import { apiError, apiSuccess, createRequestId } from '@/lib/api-response';
import { authenticateStaff } from '@/lib/auth-service';

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

    // Resolve tenant connection directly via getTenantConnectionPool
    const { getTenantConnectionPool } = await import('@/lib/tenant-db');
    const { pool, companySlug } = await getTenantConnectionPool(companyId);

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

    let resultData: any = null;

    // Read-only query dispatching directly against tenant database cluster
    if (module === 'employees') {
      const [rows] = await pool.query('SELECT * FROM employees ORDER BY created_at DESC LIMIT 100') as any[];
      resultData = (rows || []).map((emp: any) => ({
        id: emp.id,
        employeeCode: emp.employee_code,
        firstName: emp.first_name,
        lastName: emp.last_name,
        email: emp.email,
        phone: emp.phone,
        department: emp.department,
        designation: emp.designation,
        branch: emp.branch,
        employmentType: emp.employment_type,
        status: emp.status,
        joiningDate: emp.joining_date,
        baseSalary: emp.base_salary_minor ? emp.base_salary_minor / 100 : 0,
        nationalId: emp.national_id ? `${String(emp.national_id).substring(0, 5)}-*****-*` : 'N/A',
        bankAccountNumber: emp.bank_account_number ? `****${String(emp.bank_account_number).slice(-4)}` : null,
      }));
    } else if (module === 'attendance') {
      const [rows] = await pool.query('SELECT * FROM attendance_records ORDER BY date DESC LIMIT 100') as any[];
      resultData = rows || [];
    } else if (module === 'payroll') {
      const [rows] = await pool.query('SELECT * FROM payroll_runs ORDER BY created_at DESC LIMIT 50') as any[];
      resultData = rows || [];
    } else if (module === 'leaves') {
      const [rows] = await pool.query('SELECT * FROM leave_requests ORDER BY created_at DESC LIMIT 100') as any[];
      resultData = rows || [];
    } else if (module === 'inventory') {
      try {
        const [rows] = await pool.query('SELECT * FROM inventory_items ORDER BY created_at DESC LIMIT 100') as any[];
        resultData = rows || [];
      } catch {
        resultData = [];
      }
    } else if (module === 'audit') {
      const [rows] = await pool.query('SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 100') as any[];
      resultData = rows || [];
    } else {
      resultData = { message: 'Module loaded in explorer', companySlug };
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
      storageMode: (company as any).storageMode || 'CLOUD_DEDICATED',
      module,
      data: resultData,
      isReadOnly: true,
      sessionId: session.id,
    }, requestId);
  } catch (err: any) {
    return apiError('INTERNAL_ERROR', err.message, 500, undefined, requestId);
  }
}
