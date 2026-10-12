import { NextRequest } from 'next/server';
import crypto from 'node:crypto';
import { JsonWebToken, TenantTokenClaims, StaffTokenClaims } from '@hr360/crypto-audit';
import { getMasterPrismaClient } from '@hr360/db-master';

const JWT_SECRET = process.env.JWT_SECRET || 'hr360-default-ultra-secure-jwt-signing-secret-key-32chars!';
const ACCESS_TOKEN_EXPIRY = 15 * 60; // 15 minutes (Phase 2.1 requirement: <= 15 min)
const REFRESH_TOKEN_EXPIRY = 7 * 24 * 60 * 60; // 7 days

export interface AuthenticatedTenantContext {
  userId: string;
  companyId: string;
  tenantSlug: string;
  email: string;
  role: string;
  deviceId?: string;
}

export interface AuthenticatedStaffContext {
  staffId: string;
  email: string;
  role: 'SUPER_ADMIN' | 'ADMIN';
  fullName: string;
}

/**
 * Creates a signed JWT access token and rotating refresh token for a Tenant User
 */
export async function createTenantSession(
  user: { id: string; email: string; role: string; fullName: string },
  company: { id: string; slug: string },
  req?: NextRequest,
  deviceId?: string
): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
  const prisma = getMasterPrismaClient();

  // 1. Generate short-lived access token (15 min)
  const accessClaims: Omit<TenantTokenClaims, 'sub' | 'exp' | 'iat' | 'iss'> = {
    type: 'tenant_access',
    userId: user.id,
    companyId: company.id,
    tenantSlug: company.slug,
    email: user.email,
    role: user.role,
    deviceId,
  };
  const accessToken = JsonWebToken.sign(accessClaims, JWT_SECRET, ACCESS_TOKEN_EXPIRY);

  // 2. Generate cryptographically random refresh token
  const refreshTokenRaw = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(refreshTokenRaw).digest('hex');

  // 3. Store session in master database
  const clientIp = req ? req.headers.get('x-forwarded-for') || '127.0.0.1' : '127.0.0.1';
  const userAgent = req ? req.headers.get('user-agent') || 'HR360 Desktop' : 'HR360 Desktop';
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY * 1000);

  await prisma.session.create({
    data: {
      userId: user.id,
      tokenHash,
      ipAddress: clientIp,
      userAgent,
      expiresAt,
    },
  });

  return {
    accessToken,
    refreshToken: refreshTokenRaw,
    expiresIn: ACCESS_TOKEN_EXPIRY,
  };
}

/**
 * Rotates a refresh token with family tracking / reuse detection
 */
export async function rotateTenantSession(
  refreshTokenRaw: string,
  req?: NextRequest
): Promise<{ accessToken: string; refreshToken: string; expiresIn: number } | null> {
  const prisma = getMasterPrismaClient();
  const tokenHash = crypto.createHash('sha256').update(refreshTokenRaw).digest('hex');

  const session = await prisma.session.findUnique({
    where: { tokenHash },
    include: {
      user: {
        include: {
          company: true,
        },
      },
    },
  });

  if (!session) {
    return null;
  }

  // Check if expired
  if (session.expiresAt.getTime() < Date.now()) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }

  // Delete consumed session
  await prisma.session.delete({ where: { id: session.id } });

  // Issue new session family
  return createTenantSession(session.user, session.user.company, req);
}

/**
 * Creates signed JWT token for Platform Staff (Admin / Super Admin)
 */
export function createStaffToken(staff: {
  id: string;
  email: string;
  role: 'SUPER_ADMIN' | 'ADMIN';
}): string {
  const staffClaims: Omit<StaffTokenClaims, 'sub' | 'exp' | 'iat' | 'iss'> = {
    type: 'staff_access',
    staffId: staff.id,
    email: staff.email,
    role: staff.role,
  };
  // Staff tokens expire in 30 minutes (enforcing Phase 1 inactivity requirement)
  return JsonWebToken.sign(staffClaims, JWT_SECRET, 30 * 60);
}

/**
 * Extracts and verifies tenant token from request Authorization header or cookie
 */
export async function authenticateTenant(
  req: NextRequest
): Promise<{ success: true; context: AuthenticatedTenantContext } | { success: false; error: string; statusCode: number }> {
  let token: string | undefined;

  const authHeader = req.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  } else {
    token = req.cookies.get('hr360_access_token')?.value;
  }

  if (!token) {
    return { success: false, error: 'Authentication required. No token provided.', statusCode: 401 };
  }

  const verified = JsonWebToken.verify<TenantTokenClaims>(token, JWT_SECRET);
  if (!verified.valid || !verified.payload) {
    return { success: false, error: verified.error || 'Invalid or expired token.', statusCode: 401 };
  }

  if (verified.payload.type !== 'tenant_access') {
    return { success: false, error: 'Invalid token audience.', statusCode: 403 };
  }

  const { userId, companyId, tenantSlug, email, role, deviceId } = verified.payload;

  const prisma = getMasterPrismaClient();

  // Verify company & user are currently active
  const companyUser = await prisma.companyUser.findUnique({
    where: { id: userId },
    include: { company: true },
  });

  if (!companyUser || !companyUser.isActive || companyUser.company.status !== 'ACTIVE') {
    return { success: false, error: 'Deactivated user', statusCode: 403 };
  }

  // Verify device is not revoked if deviceId is attached
  if (deviceId) {
    const deviceRecord = await prisma.deviceInstall.findUnique({
      where: {
        companyId_deviceHash: {
          companyId,
          deviceHash: deviceId,
        },
      },
    });

    if (deviceRecord && deviceRecord.isRevoked) {
      return { success: false, error: 'This device has been revoked by your administrator.', statusCode: 403 };
    }
  }

  return {
    success: true,
    context: {
      userId,
      companyId,
      tenantSlug,
      email,
      role,
      deviceId,
    },
  };
}

/**
 * Extracts and verifies platform staff token (Admin / Super Admin)
 */
export async function authenticateStaff(
  req: NextRequest,
  allowedRoles: ('SUPER_ADMIN' | 'ADMIN')[] = ['SUPER_ADMIN', 'ADMIN']
): Promise<{ success: true; staff: AuthenticatedStaffContext } | { success: false; error: string; statusCode: number }> {
  let token: string | undefined;

  const authHeader = req.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  } else {
    token = req.cookies.get('hr360_staff_token')?.value;
  }

  if (!token) {
    return { success: false, error: 'Staff authentication required.', statusCode: 401 };
  }

  const verified = JsonWebToken.verify<StaffTokenClaims>(token, JWT_SECRET);
  if (!verified.valid || !verified.payload) {
    return { success: false, error: verified.error || 'Invalid or expired staff token.', statusCode: 401 };
  }

  if (verified.payload.type !== 'staff_access') {
    return { success: false, error: 'Invalid token audience.', statusCode: 403 };
  }

  if (!allowedRoles.includes(verified.payload.role)) {
    return { success: false, error: 'Forbidden: Insufficient staff permissions.', statusCode: 403 };
  }

  const prisma = getMasterPrismaClient();
  const staff = await prisma.platformStaff.findUnique({
    where: { id: verified.payload.staffId },
  });

  if (!staff || !staff.isActive) {
    return { success: false, error: 'Staff account inactive or revoked.', statusCode: 403 };
  }

  return {
    success: true,
    staff: {
      staffId: staff.id,
      email: staff.email,
      role: staff.role,
      fullName: staff.fullName,
    },
  };
}
