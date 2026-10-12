// @ROUTE_EXEMPT: BACKUP_METADATA - Sync disaster recovery backup metadata
import { NextRequest } from 'next/server';
import { z } from '@hr360/schema';
import { getMasterPrismaClient } from '@hr360/db-master';
import { apiError, apiSuccess, createRequestId } from '@/lib/api-response';

const BackupMetadataSchema = z.object({
  companyId: z.string().uuid(),
  backupId: z.string().uuid(),
  schemaVersion: z.number().int().positive(),
  sizeBytes: z.number().int().nonnegative(),
  checksumSha256: z.string().length(64),
});

export async function POST(req: NextRequest) {
  const requestId = createRequestId();

  try {
    const json = await req.json();
    const parsed = BackupMetadataSchema.safeParse(json);

    if (!parsed.success) {
      return apiError('BAD_REQUEST', 'Invalid backup metadata.', 400, parsed.error.format(), requestId);
    }

    const { companyId, backupId, schemaVersion, sizeBytes, checksumSha256 } = parsed.data;
    const prisma = getMasterPrismaClient();

    const company = await prisma.company.findUnique({
      where: { id: companyId },
    });

    if (!company) {
      return apiError('NOT_FOUND', 'Company not found.', 404, undefined, requestId);
    }

    const record = await prisma.backupRecord.create({
      data: {
        companyId,
        backupId,
        schemaVersion,
        sizeBytes: BigInt(sizeBytes),
        checksumSha256,
      },
    });

    return apiSuccess({
      id: record.id,
      backupId: record.backupId,
      recordedAt: record.createdAt.toISOString(),
    }, requestId);
  } catch (err: any) {
    return apiError('INTERNAL_ERROR', err.message || 'Failed to record backup metadata.', 500, undefined, requestId);
  }
}
