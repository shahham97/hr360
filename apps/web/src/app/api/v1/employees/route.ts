import { NextRequest } from 'next/server';
import { CreateEmployeeSchema } from '@hr360/schema';
import { EnvelopeCrypto } from '@hr360/crypto-audit';
import { apiError, apiSuccess, createRequestId } from '@/lib/api-response';
import { executeTenantQuery } from '@/lib/tenant-db';

import { authenticateTenant } from '@/lib/auth-service';

export async function GET(req: NextRequest) {
  const requestId = createRequestId();
  const auth = await authenticateTenant(req);

  if (!auth.success) {
    return apiError('UNAUTHORIZED', auth.error, auth.statusCode, undefined, requestId);
  }
  const companyId = auth.context.companyId;

  try {
    // Query directly from this company's dedicated database
    const rows = await executeTenantQuery(
      companyId,
      `SELECT id, employee_code as employeeCode, first_name as firstName, last_name as lastName,
              email, phone, date_of_birth as dateOfBirth, gender, joining_date as joiningDate,
              status, created_at as createdAt
       FROM employees ORDER BY created_at DESC`
    );

    return apiSuccess(rows, requestId);
  } catch (err: any) {
    return apiError('INTERNAL_ERROR', err.message, 500, undefined, requestId);
  }
}

export async function POST(req: NextRequest) {
  const requestId = createRequestId();
  const auth = await authenticateTenant(req);

  if (!auth.success) {
    return apiError('UNAUTHORIZED', auth.error, auth.statusCode, undefined, requestId);
  }
  const companyId = auth.context.companyId;

  try {
    const json = await req.json();
    const parsed = CreateEmployeeSchema.safeParse(json);

    if (!parsed.success) {
      return apiError('BAD_REQUEST', 'Invalid employee fields.', 400, { errors: parsed.error.flatten().fieldErrors }, requestId);
    }

    const { verifyTenantEntitlement } = await import('@/lib/entitlement-guard');
    
    // Count current active employees in company tenant database
    const countRows = await executeTenantQuery(
      companyId,
      'SELECT count(*) as total FROM employees WHERE status != ?',
      ['TERMINATED']
    );
    const currentCount = Number(countRows[0]?.total || 0);

    const entitlementCheck = await verifyTenantEntitlement(companyId, {
      requiredModule: 'employees',
      checkEmployeeLimit: true,
      currentEmployeeCount: currentCount,
    });

    if (!entitlementCheck.allowed) {
      return apiError(
        'FORBIDDEN',
        entitlementCheck.reason || 'Employee quota exceeded.',
        entitlementCheck.statusCode || 403,
        { currentCount, limit: entitlementCheck.entitlement?.limits.employees },
        requestId
      );
    }

    const { nationalId, baseSalary, ...rest } = parsed.data;

    // Encrypt sensitive national ID at application layer using AES-256-GCM
    const cryptoEngine = new EnvelopeCrypto();
    const encryptedNationalId = cryptoEngine.serialize(cryptoEngine.encrypt(nationalId));

    const employeeId = crypto.randomUUID();

    // Resolve branchId, departmentId, and designationId from tenant database if not explicitly provided
    let branchId = rest.branchId;
    let departmentId = rest.departmentId;
    let designationId = rest.designationId;

    if (!branchId) {
      const branches = await executeTenantQuery(companyId, 'SELECT id FROM branches LIMIT 1');
      branchId = branches[0]?.id;
    }
    if (!departmentId) {
      const depts = await executeTenantQuery(companyId, 'SELECT id FROM departments LIMIT 1');
      departmentId = depts[0]?.id;
    }
    if (!designationId) {
      const desigs = await executeTenantQuery(companyId, 'SELECT id FROM designations LIMIT 1');
      designationId = desigs[0]?.id;
    }

    // Insert directly into the company's dedicated database
    await executeTenantQuery(
      companyId,
      `INSERT INTO employees (
        id, employee_code, first_name, last_name, email, phone,
        encrypted_national_id, date_of_birth, gender, joining_date,
        branch_id, department_id, designation_id, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        employeeId,
        rest.employeeCode,
        rest.firstName,
        rest.lastName,
        rest.email,
        rest.phone || null,
        encryptedNationalId,
        rest.dateOfBirth ? new Date(rest.dateOfBirth) : null,
        rest.gender || 'OTHER',
        new Date(rest.joiningDate),
        branchId,
        departmentId,
        designationId,
        rest.status || 'ACTIVE',
      ]
    );

    // Record audit entry in master DB
    const { logPlatformAudit } = await import('@/lib/audit-logger');
    await logPlatformAudit({
      actorId: auth.context.email,
      actorType: 'TENANT_USER',
      action: 'CREATE_EMPLOYEE_RECORD',
      entityType: 'EMPLOYEE',
      entityId: employeeId,
      metadata: {
        companyId,
        employeeCode: rest.employeeCode,
        fullName: `${rest.firstName} ${rest.lastName}`,
      },
    });

    const employeeRecord = {
      id: employeeId,
      ...rest,
      encryptedNationalId,
      baseSalary: baseSalary.toFixed(4),
      createdAt: new Date().toISOString(),
    };

    return apiSuccess(employeeRecord, requestId, 201);
  } catch (err: any) {
    return apiError('INTERNAL_ERROR', err.message, 500, undefined, requestId);
  }
}
