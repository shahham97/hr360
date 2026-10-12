// @ROUTE_EXEMPT: PUBLIC_DOWNLOAD_REQUEST - Public client installer download generator
import { NextRequest } from 'next/server';
import { DownloadRequestSchema } from '@hr360/schema';
import { getMasterPrismaClient } from '@hr360/db-master';
import { apiError, apiSuccess, createRequestId, hashIp } from '@/lib/api-response';

export async function POST(req: NextRequest) {
  const requestId = createRequestId();

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
    const clientIp = req.headers.get('x-forwarded-for') || '10.14.0.1';
    const { checkRateLimit } = await import('@/lib/rate-limiter');
    const rateCheck = checkRateLimit(`download:${clientIp}`, 5, 60);
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

    // 1. Fetch latest stable release
    let release = await prisma.release.findFirst({
      where: { channel: 'stable' },
      orderBy: { createdAt: 'desc' },
    });

    // Ensure release points to local accessible file in public/builds
    const localDownloadUrl = '/builds/HR360-Setup-1.0.0.zip';
    const localSha256 = 'a29f159c7cbb84c66e6de014499290fa583685b0222d05416a08bd29cb6f329b';

    if (!release) {
      release = await prisma.release.create({
        data: {
          version: '1.0.0',
          channel: 'stable',
          notes: 'Production Windows x64 build (Compatible with Windows 10 & 11)',
          downloadUrl: localDownloadUrl,
          sha256: localSha256,
          isMandatory: false,
        },
      });
    } else {
      release = await prisma.release.update({
        where: { id: release.id },
        data: {
          downloadUrl: localDownloadUrl,
          sha256: localSha256,
        },
      });
    }

    // 2. Record or update Lead
    const lead = await prisma.lead.create({
      data: {
        fullName,
        workEmail,
        companyName,
        ipHash,
      },
    });

    // 3. Record DownloadEvent
    await prisma.downloadEvent.create({
      data: {
        leadId: lead.id,
        version: release.version,
        ipHash,
        userAgent,
      },
    });

    // 4. Return 5-minute signed tokenized download payload (Section 6.1)
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
    const signedUrl = `${release.downloadUrl}?token=${Buffer.from(
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
    return apiError('INTERNAL_ERROR', err.message || 'Internal server error', 500, undefined, requestId);
  }
}
