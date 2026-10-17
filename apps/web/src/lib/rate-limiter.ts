import { getMasterPrismaClient } from '@hr360/db-master';

/**
 * Serverless DB-backed Rate Limiter & Security State Store
 * Persists sliding windows, account lockouts, security nonces, and change counters in the master database.
 * No state is trapped in ephemeral serverless process memory.
 */

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  retryAfterSeconds: number;
}

export async function checkRateLimit(
  key: string,
  limit: number = 10,
  windowSeconds: number = 60
): Promise<RateLimitResult> {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + windowSeconds * 1000);

  try {
    const prisma = getMasterPrismaClient();

    // Clean up expired entry if any
    const existing = await prisma.rateLimit.findUnique({ where: { key } });

    if (!existing || existing.expiresAt < now) {
      // First hit or expired window -> upsert reset
      await prisma.rateLimit.upsert({
        where: { key },
        create: { key, count: 1, expiresAt },
        update: { count: 1, expiresAt },
      });
      return {
        success: true,
        limit,
        remaining: limit - 1,
        retryAfterSeconds: 0,
      };
    }

    if (existing.count >= limit) {
      const retryAfter = Math.max(1, Math.ceil((existing.expiresAt.getTime() - now.getTime()) / 1000));
      return {
        success: false,
        limit,
        remaining: 0,
        retryAfterSeconds: retryAfter,
      };
    }

    // Increment count
    const updated = await prisma.rateLimit.update({
      where: { key },
      data: { count: { increment: 1 } },
    });

    return {
      success: true,
      limit,
      remaining: Math.max(0, limit - updated.count),
      retryAfterSeconds: 0,
    };
  } catch (err) {
    // If database connection is warming up or transient error, fail open safely but log warning
    console.warn(`[RATE_LIMIT_FALLBACK] Transient error checking key ${key}:`, (err as any)?.message);
    return {
      success: true,
      limit,
      remaining: limit - 1,
      retryAfterSeconds: 0,
    };
  }
}

/**
 * Account Lockout Management (P1.6 / P8)
 * Locks an account after repeated failed login attempts
 */
export async function checkAccountLockout(identifier: string): Promise<{ isLocked: boolean; unlockAfterSeconds: number }> {
  try {
    const prisma = getMasterPrismaClient();
    const lockout = await prisma.accountLockout.findUnique({ where: { identifier } });
    if (!lockout || !lockout.lockedUntil) {
      return { isLocked: false, unlockAfterSeconds: 0 };
    }

    const now = new Date();
    if (lockout.lockedUntil > now) {
      const diffSec = Math.ceil((lockout.lockedUntil.getTime() - now.getTime()) / 1000);
      return { isLocked: true, unlockAfterSeconds: diffSec };
    }

    // Lockout expired, reset it
    await prisma.accountLockout.update({
      where: { identifier },
      data: { failedAttempts: 0, lockedUntil: null },
    });

    return { isLocked: false, unlockAfterSeconds: 0 };
  } catch {
    return { isLocked: false, unlockAfterSeconds: 0 };
  }
}

export async function recordFailedLoginAttempt(
  identifier: string,
  maxAttempts: number = 5,
  lockoutMinutes: number = 15
): Promise<{ isLocked: boolean; attemptsRemaining: number }> {
  try {
    const prisma = getMasterPrismaClient();
    const now = new Date();
    const record = await prisma.accountLockout.findUnique({ where: { identifier } });

    const newAttempts = (record ? record.failedAttempts : 0) + 1;
    let lockedUntil: Date | null = null;

    if (newAttempts >= maxAttempts) {
      lockedUntil = new Date(now.getTime() + lockoutMinutes * 60 * 1000);
    }

    await prisma.accountLockout.upsert({
      where: { identifier },
      create: {
        identifier,
        failedAttempts: newAttempts,
        lockedUntil,
      },
      update: {
        failedAttempts: newAttempts,
        lockedUntil,
        lastAttemptAt: now,
      },
    });

    return {
      isLocked: newAttempts >= maxAttempts,
      attemptsRemaining: Math.max(0, maxAttempts - newAttempts),
    };
  } catch {
    return { isLocked: false, attemptsRemaining: 1 };
  }
}

export async function clearAccountLockout(identifier: string): Promise<void> {
  try {
    const prisma = getMasterPrismaClient();
    await prisma.accountLockout.delete({ where: { identifier } }).catch(() => {});
  } catch {}
}

/**
 * Security Nonce Management
 * One-time verification tokens with automatic expiry
 */
export async function createSecurityNonce(scope: string, ttlSeconds: number = 300): Promise<string> {
  const prisma = getMasterPrismaClient();
  const crypto = await import('crypto');
  const nonce = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000);

  await prisma.securityNonce.create({
    data: { nonce, scope, expiresAt },
  });

  return nonce;
}

export async function verifyAndConsumeNonce(nonce: string, scope: string): Promise<boolean> {
  try {
    const prisma = getMasterPrismaClient();
    const record = await prisma.securityNonce.findUnique({ where: { nonce } });
    if (!record || record.scope !== scope || record.expiresAt < new Date()) {
      return false;
    }
    // One-time consume
    await prisma.securityNonce.delete({ where: { nonce } });
    return true;
  } catch {
    return false;
  }
}

/**
 * Tenant Change Counters (P1.6 / P2.2)
 * Distributed change notifications without memory-held EventSource/SSE
 */
export async function bumpTenantChangeCounter(companyId: string, scope: string): Promise<number> {
  try {
    const prisma = getMasterPrismaClient();
    const updated = await prisma.tenantChangeCounter.upsert({
      where: {
        companyId_scope: { companyId, scope },
      },
      create: {
        companyId,
        scope,
        version: 1,
      },
      update: {
        version: { increment: 1 },
      },
    });
    return updated.version;
  } catch {
    return 1;
  }
}

export async function getTenantChangeCounter(companyId: string, scope: string): Promise<number> {
  try {
    const prisma = getMasterPrismaClient();
    const row = await prisma.tenantChangeCounter.findUnique({
      where: {
        companyId_scope: { companyId, scope },
      },
    });
    return row ? row.version : 0;
  } catch {
    return 0;
  }
}
