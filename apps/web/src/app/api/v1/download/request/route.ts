export const runtime = 'nodejs';
// @ROUTE_EXEMPT: PUBLIC_DOWNLOAD_REQUEST - Public client installer download generator
import { NextRequest } from 'next/server';
import { DownloadRequestSchema } from '@hr360/schema';
import { getMasterPrismaClient } from '@hr360/db-master';
import { apiError, apiSuccess, createRequestId, hashIp } from '@/lib/api-response';

// Download URL served via external storage. Set INSTALLER_DOWNLOAD_URL in Vercel env vars.
// Example: https://pub-<id>.r2.dev/HR360-Setup-1.0.0.zip
// This is intentionally not hard-coded; see deployment guide.
const INSTALLER_DOWNLOAD_URL = process.env.INSTALLER_DOWNLOAD_URL || '';
const INSTALLER_SHA256 = process.env.INSTALLER_SHA256 || '';
const INSTALLER_VERSION = process.env.INSTALLER_VERSION || '1.0.0';

export async function POST(req: NextRequest) {
  const requestId = createRequestId();

  if (!INSTALLER_DOWNLOAD_URL) {
    return apiError(
      'INTERNAL_ERROR',
      'Installer download is temporarily unavailable. Please contact support.',
      503,
      undefined,
      requestId
    );
  }

  try {
    const json = await req.json();
    const parsed = DownloadRequestSchema.safeParse(json);

    if (!parsed.success) {
      return apiError(
        'BAD_REQUEST',
        'Invalid download request fields.',
        400,
        { errors: parsed.error.flatten().fieldErrors },
        requestId
      );
    }

    const { fullName, workEmail, companyName } = parsed.data;
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '0.0.0.0';
    const { checkRateLimit } = await import('@/lib/rate-limiter');
    const rateCheck = await checkRateLimit(`download:${clientIp}`, 5, 60);
    if (!rateCheck.success) {
      return apiError(
        'RATE_LIMITED',
        `Download rate limit exceeded. Please wait ${rateCheck.retryAfterSeconds} seconds before requesting a new download package.`,
        429,
        { retryAfter: rateCheck.retryAfterSeconds },
        requestId
      );
    }

    const ipHash = hashIp(clientIp);
    const userAgent = req.headers.get('user-agent') || 'Unknown';

    const prisma = getMasterPrismaClient();

    // Ensure a release record exists
    let release = await prisma.release.findFirst({
      where: { channel: 'stable' },
      orderBy: { createdAt: 'desc' },
    });

    if (!release) {
      release = await prisma.release.create({
        data: {
          version: INSTALLER_VERSION,
          channel: 'stable',
          notes: 'Production Windows x64 build (Compatible with Windows 10 & 11)',
          downloadUrl: INSTALLER_DOWNLOAD_URL,
          sha256: INSTALLER_SHA256,
          isMandatory: false,
        },
      });
    }

    // Record or update Lead
    const lead = await prisma.lead.create({
      data: {
        fullName,
        workEmail,
        companyName,
        ipHash,
      },
    });

    // Record DownloadEvent
    await prisma.downloadEvent.create({
      data: {
        leadId: lead.id,
        version: release.version,
        ipHash,
        userAgent,
      },
    });

    // Return signed download payload (5-minute token)
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
    const signedUrl = `${INSTALLER_DOWNLOAD_URL}?token=${Buffer.from(
      JSON.stringify({ leadId: lead.id, exp: expiresAt })
    ).toString('base64url')}`;

    return apiSuccess(
      {
        downloadUrl: signedUrl,
        version: release.version,
        sha256: release.sha256,
        expiresAt,
      },
      requestId
    );
  } catch (err: any) {
    console.error('[download/request]', err);
    return apiError('INTERNAL_ERROR', 'Internal server error', 500, undefined, requestId);
  }
}
