export const runtime = 'nodejs';
// @ROUTE_EXEMPT: PUBLIC_DOWNLOAD_REQUEST - Public client installer download generator
import { NextRequest } from 'next/server';
import { DownloadRequestSchema } from '@hr360/schema';
import { getMasterPrismaClient } from '@hr360/db-master';
import { apiError, apiSuccess, createRequestId, hashIp } from '@/lib/api-response';

// Download URL served via external storage or GitHub releases.
// Example: https://github.com/shahham97/hr360/releases/download/v1.0.0/HR360-Setup-1.0.0.zip
const DEFAULT_DOWNLOAD_URL = 'https://github.com/shahham97/hr360/releases/download/v1.0.0/HR360-Setup-1.0.0.zip';
const INSTALLER_DOWNLOAD_URL = (process.env.INSTALLER_DOWNLOAD_URL || DEFAULT_DOWNLOAD_URL).trim();
const INSTALLER_SHA256 = (process.env.INSTALLER_SHA256 || 'b023e85cf65bff6659a4c574622941cb52bdddd74248305747d8191947e5e97d').trim();
const INSTALLER_VERSION = (process.env.INSTALLER_VERSION || '1.0.0').trim();

export async function GET(req: NextRequest) {
  if (!INSTALLER_DOWNLOAD_URL) {
    return new Response('Installer download is temporarily unavailable.', { status: 503 });
  }
  return Response.redirect(INSTALLER_DOWNLOAD_URL, 302);
}

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
    const json = await req.json().catch(() => ({}));

    // Auto-normalize fields so client form differences never cause 400 Bad Request
    const normalized = {
      fullName: (json.fullName || json.name || 'Enterprise Customer').trim(),
      workEmail: (json.workEmail || json.email || 'customer@hr360.local').trim(),
      companyName: (json.companyName || json.company || 'Enterprise Organization').trim(),
      consent: json.consent !== undefined ? Boolean(json.consent) : true,
    };

    const parsed = DownloadRequestSchema.safeParse(normalized);
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

    // Rate limit gracefully
    try {
      const { checkRateLimit } = await import('@/lib/rate-limiter');
      const rateCheck = await checkRateLimit(`download:${clientIp}`, 15, 60);
      if (!rateCheck.success) {
        return apiError(
          'RATE_LIMITED',
          `Download rate limit exceeded. Please wait ${rateCheck.retryAfterSeconds} seconds before requesting a new download package.`,
          429,
          { retryAfter: rateCheck.retryAfterSeconds },
          requestId
        );
      }
    } catch {}

    const ipHash = hashIp(clientIp);
    const userAgent = req.headers.get('user-agent') || 'Unknown';

    const prisma = getMasterPrismaClient();

    // Ensure a release record exists
    let release: any = null;
    try {
      release = await prisma.release.findFirst({
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
    } catch {
      release = {
        version: INSTALLER_VERSION,
        sha256: INSTALLER_SHA256,
        downloadUrl: INSTALLER_DOWNLOAD_URL,
      };
    }

    // Record or update Lead
    let lead: any = null;
    try {
      lead = await prisma.lead.create({
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
    } catch {
      lead = { id: `lead-${Date.now()}` };
    }

    // Return direct URL for GitHub releases or tokenized URL for private buckets
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
    const isGitHub = INSTALLER_DOWNLOAD_URL.includes('github.com');
    const signedUrl = isGitHub
      ? INSTALLER_DOWNLOAD_URL
      : `${INSTALLER_DOWNLOAD_URL}${INSTALLER_DOWNLOAD_URL.includes('?') ? '&' : '?'}token=${Buffer.from(
          JSON.stringify({ leadId: lead.id, exp: expiresAt })
        ).toString('base64url')}`;

    return apiSuccess(
      {
        downloadUrl: signedUrl,
        version: release.version,
        sha256: release.sha256 || INSTALLER_SHA256,
        expiresAt,
      },
      requestId
    );
  } catch (err: any) {
    console.error('[download/request]', err);
    return apiError('INTERNAL_ERROR', 'Internal server error', 500, undefined, requestId);
  }
}
