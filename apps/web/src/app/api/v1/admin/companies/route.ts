export const runtime = 'nodejs';
// @ROUTE_EXEMPT: PLATFORM_ADMIN_COMPANIES - Platform tenant provisioning & management
import { NextRequest } from 'next/server';
import { getMasterPrismaClient } from '@hr360/db-master';
import { PasswordHasher } from '@hr360/crypto-audit';
import { apiError, apiSuccess, createRequestId } from '@/lib/api-response';

import { authenticateStaff } from '@/lib/auth-service';

export async function GET(req: NextRequest) {
  const requestId = createRequestId();
  const auth = await authenticateStaff(req);

  if (!auth.success) {
    return apiError('FORBIDDEN', auth.error, auth.statusCode, undefined, requestId);
  }

  try {
    const prisma = getMasterPrismaClient();
    const companies = await prisma.company.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        tenant: true,
        users: {
          select: {
            id: true,
            email: true,
            fullName: true,
            role: true,
            isActive: true,
            lastLoginAt: true,
            createdAt: true,
          },
        },
        registration: {
          select: {
            id: true,
            status: true,
            phone: true,
            country: true,
            createdAt: true,
          },
        },
        subscriptions: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: { plan: true },
        },
        invoices: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    });

    const result = companies.map((c: any) => {
      const activeSub = c.subscriptions[0];
      return {
        id: c.id,
        name: c.name,
        slug: c.slug,
        databaseName: c.tenant?.databaseName || `tenant_${c.slug}`,
        status: (c.status || c.tenant?.status || 'INACTIVE') as any,
        licenseKey: c.licenseKey,
        registrationStatus: c.registration?.status || 'UNKNOWN',
        phone: c.registration?.phone,
        country: c.registration?.country,
        createdAt: c.createdAt,
        adminUsers: c.users,
        subscription: activeSub ? {
          planName: activeSub.plan?.name || 'Enterprise Core',
          planCode: activeSub.plan?.code || 'ENTERPRISE_CORE',
          interval: activeSub.interval,
          startsAt: activeSub.startsAt,
          expiresAt: activeSub.expiresAt,
          graceDays: activeSub.graceDays,
          isExpired: new Date(activeSub.expiresAt).getTime() < Date.now(),
        } : null,
        invoices: c.invoices.map((inv: any) => ({
          id: inv.id,
          invoiceNumber: inv.invoiceNumber,
          status: inv.status,
          amountSubtotal: Number(inv.amountSubtotal),
          amountTax: Number(inv.amountTax),
          amountTotal: Number(inv.amountTotal),
          currency: 'PKR',
          issuedAt: inv.issuedAt,
          paidAt: inv.paidAt,
        })),
      };
    });

    return apiSuccess(result, requestId);
  } catch (err: any) {
    return apiError('INTERNAL_ERROR', err.message, 500, undefined, requestId);
  }
}

export async function PATCH(req: NextRequest) {
  const requestId = createRequestId();
  const auth = await authenticateStaff(req);

  if (!auth.success) {
    return apiError('FORBIDDEN', auth.error, auth.statusCode, undefined, requestId);
  }

  const staffRole = auth.staff.role;
  const staffId = auth.staff.staffId;

  try {
    const json = await req.json();
    const { companyId, action, newPassword, targetUserId } = json;

    if (!companyId || !action) {
      return apiError('BAD_REQUEST', 'Company ID and action are required.', 400, undefined, requestId);
    }

    const prisma = getMasterPrismaClient();
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      include: { tenant: true, users: true },
    });

    if (!company) {
      return apiError('NOT_FOUND', 'Company not found.', 404, undefined, requestId);
    }

    const { logPlatformAudit } = await import('@/lib/audit-logger');

    if (action === 'ACTIVATE') {
      await prisma.company.update({
        where: { id: company.id },
        data: { status: 'ACTIVE' },
      });
      if (company.tenant) {
        await prisma.tenant.update({
          where: { id: company.tenant.id },
          data: { status: 'ACTIVE' },
        });
      }
      await prisma.companyUser.updateMany({
        where: { companyId: company.id },
        data: { isActive: true },
      });

      await logPlatformAudit({
        actorId: staffId,
        actorType: 'STAFF',
        action: 'COMPANY_ACCOUNT_ACTIVATED',
        entityType: 'COMPANY',
        entityId: company.id,
        metadata: { companyName: company.name, companySlug: company.slug },
      });

      try {
        const { revocationStream } = await import('@hr360/tenancy');
        revocationStream.emit(`status:${company.id}`, { status: 'ACTIVE' });
      } catch {}

      return apiSuccess({ message: `Company "${company.name}" activated successfully.` }, requestId);
    }

    if (action === 'DEACTIVATE') {
      await prisma.company.update({
        where: { id: company.id },
        data: { status: 'SUSPENDED' },
      });
      if (company.tenant) {
        await prisma.tenant.update({
          where: { id: company.tenant.id },
          data: { status: 'SUSPENDED' },
        });
      }
      await prisma.companyUser.updateMany({
        where: { companyId: company.id },
        data: { isActive: false },
      });

      await logPlatformAudit({
        actorId: staffId,
        actorType: 'STAFF',
        action: 'COMPANY_ACCOUNT_DEACTIVATED',
        entityType: 'COMPANY',
        entityId: company.id,
        metadata: { companyName: company.name, companySlug: company.slug, status: 'SUSPENDED' },
      });

      try {
        const { revocationStream } = await import('@hr360/tenancy');
        revocationStream.emit(`status:${company.id}`, {
          status: 'SUSPENDED',
          reason: 'Account suspended by administrator.',
        });
      } catch {}

      return apiSuccess({ message: `Company "${company.name}" deactivated and locked.` }, requestId);
    }

    if (action === 'RESET_PASSWORD') {
      if (!newPassword || newPassword.length < 8) {
        return apiError('BAD_REQUEST', 'New password must be at least 8 characters long.', 400, undefined, requestId);
      }

      const targetUser = targetUserId
        ? company.users.find((u: any) => u.id === targetUserId)
        : company.users[0];

      if (!targetUser) {
        return apiError('NOT_FOUND', 'Target company user not found.', 404, undefined, requestId);
      }

      const newPasswordHash = await PasswordHasher.hashPassword(newPassword);
      await prisma.companyUser.update({
        where: { id: targetUser.id },
        data: { passwordHash: newPasswordHash },
      });

      await logPlatformAudit({
        actorId: staffId,
        actorType: 'STAFF',
        action: 'COMPANY_ADMIN_PASSWORD_UPDATED',
        entityType: 'COMPANY_USER',
        entityId: targetUser.id,
        metadata: {
          companyName: company.name,
          userEmail: targetUser.email,
          updatedByStaffRole: staffRole,
        },
      });

      return apiSuccess({ message: `Password for ${targetUser.email} (${company.name}) has been securely updated.` }, requestId);
    }

    return apiError('BAD_REQUEST', `Unknown action "${action}".`, 400, undefined, requestId);
  } catch (err: any) {
    return apiError('INTERNAL_ERROR', err.message, 500, undefined, requestId);
  }
}
