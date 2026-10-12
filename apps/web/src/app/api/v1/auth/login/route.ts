// @ROUTE_EXEMPT: PUBLIC_AUTH_LOGIN - Unauthenticated login endpoint
import { NextRequest } from 'next/server';
import { PasswordHasher } from '@hr360/crypto-audit';
import { getMasterPrismaClient } from '@hr360/db-master';
import { apiError, apiSuccess, createRequestId } from '@/lib/api-response';
import { checkRateLimit } from '@/lib/rate-limiter';

export async function POST(req: NextRequest) {
  const requestId = createRequestId();

  try {
    const json = await req.json();
    const { email, password } = json;

    if (!email || !password) {
      return apiError('BAD_REQUEST', 'Email and password are required.', 400, undefined, requestId);
    }

    const clientIp = req.headers.get('x-forwarded-for') || '10.14.0.1';
    const rateCheck = checkRateLimit(`login:${clientIp}:${email}`, 10, 60);
    if (!rateCheck.success) {
      return apiError(
        'RATE_LIMITED',
        `Too many login attempts. Please retry in ${rateCheck.retryAfterSeconds} seconds.`,
        429,
        { retryAfter: rateCheck.retryAfterSeconds },
        requestId
      );
    }

    const prisma = getMasterPrismaClient();

    // 1. Find user across companies
    const user = await prisma.companyUser.findFirst({
      where: { email },
      include: {
        company: {
          include: {
            tenant: true,
          },
        },
      },
    });

    if (!user) {
      return apiError('UNAUTHORIZED', 'Invalid credentials.', 401, undefined, requestId);
    }

    if (!user.isActive) {
      return apiError('UNAUTHORIZED', 'Deactivated user', 403, undefined, requestId);
    }

    // 2. Verify password with Argon2id
    const isMatch = await PasswordHasher.verifyPassword(user.passwordHash, password);
    if (!isMatch) {
      return apiError('UNAUTHORIZED', 'Invalid credentials.', 401, undefined, requestId);
    }

    const tenant = user.company.tenant;
    const tenantStatus = tenant?.status || user.company.status || 'PENDING';

    // 3. Check Company Status
    if (tenantStatus !== 'ACTIVE' || user.company.status !== 'ACTIVE') {
      return apiError(
        'TENANT_INACTIVE',
        'Deactivated user',
        403,
        {
          companyStatus: tenantStatus,
          companyName: user.company.name,
        },
        requestId
      );
    }

    const { createTenantSession } = await import('@/lib/auth-service');
    const deviceId = json.deviceId;
    const deviceName = json.deviceName || 'Windows Desktop Client';
    const osVersion = json.osVersion || 'Windows x64';
    const appVersion = json.appVersion || '1.0.0';

    if (deviceId) {
      // Check or register device
      const existingDevice = await prisma.deviceInstall.findUnique({
        where: {
          companyId_deviceHash: {
            companyId: user.company.id,
            deviceHash: deviceId,
          },
        },
      });

      if (existingDevice && existingDevice.isRevoked) {
        return apiError('FORBIDDEN', 'This device has been revoked by your administrator.', 403, undefined, requestId);
      }

      if (!existingDevice) {
        await prisma.deviceInstall.create({
          data: {
            companyId: user.company.id,
            deviceHash: deviceId,
            deviceName,
            osVersion,
            appVersion,
            isRevoked: false,
            lastSeenAt: new Date(),
          },
        });
      } else {
        await prisma.deviceInstall.update({
          where: { id: existingDevice.id },
          data: { lastSeenAt: new Date(), appVersion },
        });
      }
    }

    const { accessToken, refreshToken, expiresIn } = await createTenantSession(
      user,
      user.company,
      req,
      deviceId
    );

    // Fetch subscription details
    const activeSub = await prisma.subscription.findFirst({
      where: { companyId: user.company.id },
      include: { plan: true },
      orderBy: { createdAt: 'desc' },
    });

    // Update lastLoginAt
    await prisma.companyUser.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Record audit trail in master DB
    const { logPlatformAudit } = await import('@/lib/audit-logger');
    await logPlatformAudit({
      actorId: user.id,
      actorType: 'TENANT_USER',
      action: 'COMPANY_ADMIN_LOGIN',
      entityType: 'COMPANY_USER',
      entityId: user.id,
      metadata: {
        email: user.email,
        companyName: user.company.name,
        companySlug: user.company.slug,
        deviceId: deviceId || 'unknown',
      },
      ipAddress: req.headers.get('x-forwarded-for') || '127.0.0.1',
      userAgent: req.headers.get('user-agent') || 'HR360 Desktop Client',
    });

    const { issueSignedEntitlement } = await import('@/lib/entitlement-guard');
    const { token: entitlementToken, entitlement } = await issueSignedEntitlement(user.company.id);

    return apiSuccess(
      {
        token: accessToken,
        accessToken,
        refreshToken,
        expiresIn,
        entitlementToken,
        entitlement,
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
        },
        company: {
          id: user.company.id,
          name: user.company.name,
          slug: user.company.slug,
          databaseName: tenant?.databaseName,
          status: tenantStatus,
          licenseTier: entitlement.planCode,
          employeeLimit: entitlement.limits.employees,
          licenseExpires: entitlement.expiresAt.slice(0, 10),
          offlineGraceDays: activeSub?.graceDays || 14,
        },
      },
      requestId
    );
  } catch (err: any) {
    return apiError('INTERNAL_ERROR', err.message, 500, undefined, requestId);
  }
}
