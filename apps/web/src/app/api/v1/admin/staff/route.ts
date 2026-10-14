export const runtime = 'nodejs';
// @ROUTE_EXEMPT: PLATFORM_ADMIN_STAFF - Platform staff administration
import { NextRequest } from 'next/server';
import { getMasterPrismaClient } from '@hr360/db-master';
import { PasswordHasher } from '@hr360/crypto-audit';
import { apiError, apiSuccess, createRequestId } from '@/lib/api-response';
import { authenticateStaff } from '@/lib/auth-service';
import { logPlatformAudit } from '@/lib/audit-logger';

export async function GET(req: NextRequest) {
  const requestId = createRequestId();
  const auth = await authenticateStaff(req);

  if (!auth.success) {
    return apiError('FORBIDDEN', auth.error, auth.statusCode, undefined, requestId);
  }

  const staffRole = auth.staff.role;
  const prisma = getMasterPrismaClient();

  // SECTION 6.3 RESTRICTION: Admin cannot see, edit, reset or reference the Super Admin
  // Excluded in the data layer query, not just hidden in the UI!
  const whereClause: any = {};
  if (staffRole === 'ADMIN') {
    whereClause.role = 'ADMIN'; // Strictly filter out SUPER_ADMIN records
  }

  const staffList = await prisma.platformStaff.findMany({
    where: whereClause,
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      email: true,
      fullName: true,
      role: true,
      totpEnabled: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return apiSuccess(staffList, requestId);
}

export async function POST(req: NextRequest) {
  const requestId = createRequestId();
  const auth = await authenticateStaff(req);

  if (!auth.success) {
    return apiError('FORBIDDEN', auth.error, auth.statusCode, undefined, requestId);
  }

  // Only SUPER_ADMIN can create platform staff accounts
  if (auth.staff.role !== 'SUPER_ADMIN') {
    return apiError('FORBIDDEN', 'Access denied. Only Super Administrators can create staff accounts.', 403, undefined, requestId);
  }

  try {
    const json = await req.json();
    const fullName = typeof json.fullName === 'string' ? json.fullName.trim() : '';
    const email = typeof json.email === 'string' ? json.email.trim().toLowerCase() : '';
    const password = typeof json.password === 'string' ? json.password : '';
    const role = json.role === 'SUPER_ADMIN' ? 'SUPER_ADMIN' : 'ADMIN';

    if (!fullName || !email || !password) {
      return apiError('BAD_REQUEST', 'Full name, email, and password are required.', 400, undefined, requestId);
    }

    if (password.length < 8) {
      return apiError('BAD_REQUEST', 'Password must be at least 8 characters long.', 400, undefined, requestId);
    }

    const prisma = getMasterPrismaClient();

    const existing = await prisma.platformStaff.findUnique({
      where: { email },
    });

    if (existing) {
      return apiError('CONFLICT', 'A staff account with this email already exists.', 409, undefined, requestId);
    }

    const passwordHash = await PasswordHasher.hashPassword(password);

    const newStaff = await prisma.platformStaff.create({
      data: {
        fullName,
        email,
        passwordHash,
        role,
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        totpEnabled: true,
        isActive: true,
        createdAt: true,
      },
    });

    await logPlatformAudit({
      actorId: auth.staff.staffId,
      actorType: 'STAFF',
      action: 'STAFF_ACCOUNT_CREATED',
      entityType: 'STAFF',
      entityId: newStaff.id,
      metadata: { email: newStaff.email, fullName: newStaff.fullName, role: newStaff.role },
    });

    return apiSuccess(newStaff, requestId);
  } catch (err: any) {
    return apiError('INTERNAL_ERROR', err.message || 'Failed to create staff account.', 500, undefined, requestId);
  }
}

export async function PATCH(req: NextRequest) {
  const requestId = createRequestId();
  const auth = await authenticateStaff(req);

  if (!auth.success) {
    return apiError('FORBIDDEN', auth.error, auth.statusCode, undefined, requestId);
  }

  // Only SUPER_ADMIN can update staff profiles, passwords, and status
  if (auth.staff.role !== 'SUPER_ADMIN') {
    return apiError('FORBIDDEN', 'Access denied. Only Super Administrators can modify staff accounts.', 403, undefined, requestId);
  }

  try {
    const json = await req.json();
    const staffId = typeof json.staffId === 'string' ? json.staffId.trim() : '';

    if (!staffId) {
      return apiError('BAD_REQUEST', 'staffId is required.', 400, undefined, requestId);
    }

    const prisma = getMasterPrismaClient();
    const target = await prisma.platformStaff.findUnique({
      where: { id: staffId },
    });

    if (!target) {
      return apiError('NOT_FOUND', 'Target staff account not found.', 404, undefined, requestId);
    }

    const updateData: any = {};
    const auditActions: string[] = [];

    // 1. Update Full Name
    if (typeof json.fullName === 'string' && json.fullName.trim()) {
      updateData.fullName = json.fullName.trim();
      auditActions.push('FULL_NAME_UPDATED');
    }

    // 2. Update Email
    if (typeof json.email === 'string' && json.email.trim()) {
      const normalizedEmail = json.email.trim().toLowerCase();
      if (normalizedEmail !== target.email) {
        const existing = await prisma.platformStaff.findUnique({
          where: { email: normalizedEmail },
        });
        if (existing && existing.id !== staffId) {
          return apiError('CONFLICT', 'Email address is already in use by another staff account.', 409, undefined, requestId);
        }
        updateData.email = normalizedEmail;
        auditActions.push('EMAIL_UPDATED');
      }
    }

    // 3. Update Password
    if (typeof json.password === 'string' && json.password.length > 0) {
      if (json.password.length < 8) {
        return apiError('BAD_REQUEST', 'Password must be at least 8 characters long.', 400, undefined, requestId);
      }
      const newHash = await PasswordHasher.hashPassword(json.password);
      updateData.passwordHash = newHash;
      auditActions.push('PASSWORD_RESET');
    }

    // 4. Update Status (Active / Suspended)
    if (typeof json.isActive === 'boolean') {
      // Prevent locking oneself if the superadmin is modifying their own account
      if (auth.staff.staffId === target.id && !json.isActive) {
        return apiError('BAD_REQUEST', 'Cannot deactivate your own active session account.', 400, undefined, requestId);
      }
      updateData.isActive = json.isActive;
      auditActions.push(json.isActive ? 'ACCOUNT_ACTIVATED' : 'ACCOUNT_SUSPENDED');
    }

    if (Object.keys(updateData).length === 0) {
      return apiError('BAD_REQUEST', 'No valid update fields provided.', 400, undefined, requestId);
    }

    const updated = await prisma.platformStaff.update({
      where: { id: staffId },
      data: updateData,
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        totpEnabled: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    await logPlatformAudit({
      actorId: auth.staff.staffId,
      actorType: 'STAFF',
      action: 'STAFF_ACCOUNT_MODIFIED',
      entityType: 'STAFF',
      entityId: updated.id,
      metadata: {
        actions: auditActions,
        targetEmail: updated.email,
        targetName: updated.fullName,
        isActive: updated.isActive,
      },
    });

    return apiSuccess(
      {
        staff: updated,
        message: `Staff account "${updated.fullName}" updated successfully (${auditActions.join(', ')}).`,
      },
      requestId
    );
  } catch (err: any) {
    return apiError('INTERNAL_ERROR', err.message || 'Failed to update staff account.', 500, undefined, requestId);
  }
}
