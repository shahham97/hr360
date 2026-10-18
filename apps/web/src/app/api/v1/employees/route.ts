export const runtime = 'nodejs';
import { NextRequest } from 'next/server';
import crypto from 'node:crypto';
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
    const rows = await executeTenantQuery<any>(
      companyId,
      `SELECT id, employee_code as employeeCode, first_name as firstName, last_name as lastName,
              email, phone, department, designation, branch, employment_type as employmentType,
              base_salary_minor as baseSalaryMinor, national_id as nationalId, date_of_birth as dateOfBirth,
              gender, joining_date as joiningDate, probation_end_date as probationEndDate,
              contract_end_date as contractEndDate, status, bank_name as bankName,
              bank_account_number as bankAccount, address, emergency_contact_name as emergencyContact,
              emergency_contact_phone as emergencyPhone, created_at as createdAt, updated_at as updatedAt
       FROM employees ORDER BY created_at DESC`
    );

    const mapped = rows.map((r: any) => ({
      id: r.id,
      employeeCode: r.employeeCode,
      firstName: r.firstName,
      lastName: r.lastName,
      email: r.email,
      phone: r.phone || '',
      department: r.department || 'General',
      designation: r.designation || 'Staff',
      branch: r.branch || 'Headquarters',
      employmentType: r.employmentType || 'PERMANENT',
      baseSalary: Number(r.baseSalaryMinor || 0) > 10000 ? Math.round(Number(r.baseSalaryMinor || 0) / 100) : Number(r.baseSalaryMinor || 0),
      nationalId: r.nationalId || '',
      dateOfBirth: r.dateOfBirth || '1995-01-01',
      gender: r.gender || 'OTHER',
      joiningDate: r.joiningDate || '2026-01-01',
      probationEndDate: r.probationEndDate || undefined,
      status: r.status || 'ACTIVE',
      bankName: r.bankName || '',
      bankAccount: r.bankAccount || '',
      emergencyContact: r.emergencyContact || '',
      emergencyPhone: r.emergencyPhone || '',
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }));

    return apiSuccess(mapped, requestId);
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

    const employeeCode = (json.employeeCode || json.employee_code || '').trim();
    const firstName = (json.firstName || json.first_name || '').trim();
    const lastName = (json.lastName || json.last_name || '').trim();
    const email = (json.email || '').trim().toLowerCase();

    if (!employeeCode || !firstName || !email) {
      return apiError('BAD_REQUEST', 'employeeCode, firstName, and email are required.', 400, undefined, requestId);
    }

    // Check duplicate employee code
    const existing = await executeTenantQuery(
      companyId,
      'SELECT id FROM employees WHERE employee_code = ? OR email = ? LIMIT 1',
      [employeeCode, email]
    );

    if (existing && existing.length > 0) {
      return apiError('CONFLICT', `Employee code ${employeeCode} or email ${email} already exists.`, 409, undefined, requestId);
    }

    const { verifyTenantEntitlement } = await import('@/lib/entitlement-guard');
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

    const employeeId = json.id || crypto.randomUUID();
    const phone = json.phone || '';
    const department = json.department || 'General';
    const designation = json.designation || 'Staff';
    const branch = json.branch || 'Headquarters';
    const employmentType = json.employmentType || json.employment_type || 'PERMANENT';
    const baseSalaryNum = parseFloat(json.baseSalary || json.salary || '100000') || 100000;
    const baseSalaryMinor = Math.round(baseSalaryNum * 100);
    const nationalId = json.nationalId || json.national_id || '42101-0000000-0';
    const dateOfBirth = json.dateOfBirth || json.dob || '1995-01-01';
    const gender = json.gender || 'OTHER';
    const joiningDate = json.joiningDate || json.joining_date || new Date().toISOString().slice(0, 10);
    const status = json.status || 'ACTIVE';
    const bankName = json.bankName || json.bank_name || '';
    const bankAccount = json.bankAccount || json.bank_account_number || '';
    const now = new Date().toISOString();

    await executeTenantQuery(
      companyId,
      `INSERT INTO employees (
        id, employee_code, first_name, last_name, email, phone,
        department, designation, branch, employment_type, base_salary_minor,
        national_id, date_of_birth, gender, joining_date, status,
        bank_name, bank_account_number, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        employeeId,
        employeeCode,
        firstName,
        lastName,
        email,
        phone,
        department,
        designation,
        branch,
        employmentType,
        baseSalaryMinor,
        nationalId,
        dateOfBirth,
        gender,
        joiningDate,
        status,
        bankName,
        bankAccount,
        now,
        now,
      ]
    );

    // Audit log
    const { logPlatformAudit } = await import('@/lib/audit-logger');
    await logPlatformAudit({
      actorId: auth.context.email,
      actorType: 'TENANT_USER',
      action: 'CREATE_EMPLOYEE_RECORD',
      entityType: 'EMPLOYEE',
      entityId: employeeId,
      metadata: {
        companyId,
        employeeCode,
        fullName: `${firstName} ${lastName}`,
      },
    }).catch(() => {});

    const createdRecord = {
      id: employeeId,
      employeeCode,
      firstName,
      lastName,
      email,
      phone,
      department,
      designation,
      branch,
      employmentType,
      baseSalary: baseSalaryNum,
      nationalId,
      dateOfBirth,
      gender,
      joiningDate,
      status,
      bankName,
      bankAccount,
      createdAt: now,
      updatedAt: now,
    };

    return apiSuccess(createdRecord, requestId, 201);
  } catch (err: any) {
    return apiError('INTERNAL_ERROR', err.message, 500, undefined, requestId);
  }
}

export async function PUT(req: NextRequest) {
  const requestId = createRequestId();
  const auth = await authenticateTenant(req);

  if (!auth.success) {
    return apiError('UNAUTHORIZED', auth.error, auth.statusCode, undefined, requestId);
  }
  const companyId = auth.context.companyId;

  try {
    const json = await req.json();
    const id = json.id;

    if (!id) {
      return apiError('BAD_REQUEST', 'Employee id is required for update.', 400, undefined, requestId);
    }

    const employeeCode = (json.employeeCode || json.employee_code || '').trim();
    const firstName = (json.firstName || json.first_name || '').trim();
    const lastName = (json.lastName || json.last_name || '').trim();
    const email = (json.email || '').trim().toLowerCase();
    const phone = json.phone || '';
    const department = json.department || 'General';
    const designation = json.designation || 'Staff';
    const branch = json.branch || 'Headquarters';
    const employmentType = json.employmentType || json.employment_type || 'PERMANENT';
    const baseSalaryNum = parseFloat(json.baseSalary || json.salary || '100000') || 100000;
    const baseSalaryMinor = Math.round(baseSalaryNum * 100);
    const nationalId = json.nationalId || json.national_id || '42101-0000000-0';
    const dateOfBirth = json.dateOfBirth || json.dob || '1995-01-01';
    const gender = json.gender || 'OTHER';
    const joiningDate = json.joiningDate || json.joining_date || new Date().toISOString().slice(0, 10);
    const status = json.status || 'ACTIVE';
    const bankName = json.bankName || json.bank_name || '';
    const bankAccount = json.bankAccount || json.bank_account_number || '';
    const now = new Date().toISOString();

    await executeTenantQuery(
      companyId,
      `UPDATE employees SET
        employee_code = ?, first_name = ?, last_name = ?, email = ?, phone = ?,
        department = ?, designation = ?, branch = ?, employment_type = ?,
        base_salary_minor = ?, national_id = ?, date_of_birth = ?, gender = ?,
        joining_date = ?, status = ?, bank_name = ?, bank_account_number = ?,
        updated_at = ?
      WHERE id = ?`,
      [
        employeeCode,
        firstName,
        lastName,
        email,
        phone,
        department,
        designation,
        branch,
        employmentType,
        baseSalaryMinor,
        nationalId,
        dateOfBirth,
        gender,
        joiningDate,
        status,
        bankName,
        bankAccount,
        now,
        id,
      ]
    );

    const updatedRecord = {
      id,
      employeeCode,
      firstName,
      lastName,
      email,
      phone,
      department,
      designation,
      branch,
      employmentType,
      baseSalary: baseSalaryNum,
      nationalId,
      dateOfBirth,
      gender,
      joiningDate,
      status,
      bankName,
      bankAccount,
      updatedAt: now,
    };

    return apiSuccess(updatedRecord, requestId);
  } catch (err: any) {
    return apiError('INTERNAL_ERROR', err.message, 500, undefined, requestId);
  }
}

export async function DELETE(req: NextRequest) {
  const requestId = createRequestId();
  const auth = await authenticateTenant(req);

  if (!auth.success) {
    return apiError('UNAUTHORIZED', auth.error, auth.statusCode, undefined, requestId);
  }
  const companyId = auth.context.companyId;

  try {
    const { searchParams } = new URL(req.url);
    let id = searchParams.get('id');

    if (!id) {
      try {
        const body = await req.json();
        id = body?.id;
      } catch {}
    }

    if (!id) {
      return apiError('BAD_REQUEST', 'Missing employee ID parameter.', 400, undefined, requestId);
    }

    await executeTenantQuery(
      companyId,
      'DELETE FROM employees WHERE id = ?',
      [id]
    );

    // Audit log
    const { logPlatformAudit } = await import('@/lib/audit-logger');
    await logPlatformAudit({
      actorId: auth.context.email,
      actorType: 'TENANT_USER',
      action: 'DELETE_EMPLOYEE_RECORD',
      entityType: 'EMPLOYEE',
      entityId: id,
      metadata: {
        companyId,
        deletedAt: new Date().toISOString(),
      },
    }).catch(() => {});

    return apiSuccess({ message: `Employee record ${id} deleted successfully.`, id }, requestId);
  } catch (err: any) {
    return apiError('INTERNAL_ERROR', err.message, 500, undefined, requestId);
  }
}
