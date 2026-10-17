export const runtime = 'nodejs';
// @ROUTE_EXEMPT: DAILY_CRON - Nightly cleanup, retention, and maintenance job
import { NextRequest } from 'next/server';
import { getMasterPrismaClient } from '@hr360/db-master';
import { apiError, apiSuccess, createRequestId } from '@/lib/api-response';

export async function GET(req: NextRequest) {
  const requestId = createRequestId();
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET?.trim();

  // Protect endpoint: require valid CRON_SECRET if configured
  if (cronSecret) {
    const bearer = authHeader?.replace(/^Bearer\s+/i, '')?.trim();
    const urlSecret = req.nextUrl.searchParams.get('secret')?.trim();
    if (bearer !== cronSecret && urlSecret !== cronSecret) {
      return apiError('FORBIDDEN', 'Invalid or missing cron secret authorization.', 403, undefined, requestId);
    }
  }

  try {
    const prisma = getMasterPrismaClient();
    const now = new Date();

    // 1. Prune expired rate limits
    const rateLimits = await prisma.rateLimit.deleteMany({
      where: { expiresAt: { lt: now } },
    });

    // 2. Prune expired security nonces
    const nonces = await prisma.securityNonce.deleteMany({
      where: { expiresAt: { lt: now } },
    });

    // 3. Mark expired license leases
    const leases = await prisma.licenseLease.updateMany({
      where: {
        expiresAt: { lt: now },
        isRevoked: false,
      },
      data: { isRevoked: true },
    });

    // 4. Automated Daily Backup Snapshot Log (idempotent master record)
    const backupNonce = `cron:backup:${now.toISOString().substring(0, 10)}`;
    const existingBackupRecord = await prisma.securityNonce.findUnique({
      where: { nonce: backupNonce },
    });

    let backupLogged = false;
    if (!existingBackupRecord) {
      await prisma.securityNonce.create({
        data: {
          nonce: backupNonce,
          scope: 'NIGHTLY_BACKUP_SNAPSHOT',
          expiresAt: new Date(now.getTime() + 30 * 24 * 3600 * 1000), // Retain 30 days
        },
      });
      backupLogged = true;
    }

    return apiSuccess(
      {
        timestamp: now.toISOString(),
        prunedRateLimits: rateLimits.count,
        prunedNonces: nonces.count,
        expiredLeasesMarked: leases.count,
        dailyBackupSnapshotRecorded: backupLogged,
        status: 'completed',
      },
      requestId
    );
  } catch (err: any) {
    console.error('[CRON_ERROR]', err);
    return apiError('INTERNAL_ERROR', err.message || 'Cron job execution failed.', 500, undefined, requestId);
  }
}
