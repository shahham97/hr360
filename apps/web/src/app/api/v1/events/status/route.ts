export const runtime = 'nodejs';
// @ROUTE_EXEMPT: PUBLIC_STATUS_POLL - Company status polling endpoint
import { NextRequest } from 'next/server';
import { getMasterPrismaClient } from '@hr360/db-master';
import { JsonWebToken, TenantTokenClaims } from '@hr360/crypto-audit';
import { apiError, apiSuccess, createRequestId } from '@/lib/api-response';

const JWT_SECRET = process.env.JWT_SECRET || 'hr360-default-ultra-secure-jwt-signing-secret-key-32chars!';

export async function GET(req: NextRequest) {
  const requestId = createRequestId();
  const { searchParams } = new URL(req.url);
  const token = searchParams.get('token') || req.headers.get('authorization')?.replace('Bearer ', '');
  let companyId = searchParams.get('companyId');

  if (token) {
    const verified = JsonWebToken.verify<TenantTokenClaims>(token, JWT_SECRET);
    if (verified.valid && verified.payload) {
      companyId = verified.payload.companyId;
    } else {
      return apiError('UNAUTHORIZED', 'Invalid or expired token.', 401, undefined, requestId);
    }
  }

  if (!companyId) {
    return apiError('UNAUTHORIZED', 'Valid token or companyId required.', 401, undefined, requestId);
  }

  try {
    const prisma = getMasterPrismaClient();
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { id: true, status: true },
    });

    if (!company) {
      return apiError('NOT_FOUND', 'Company not found.', 404, undefined, requestId);
    }

    return apiSuccess(
      {
        companyId: company.id,
        status: company.status,
        reason: null,
      },
      requestId
    );
  } catch (err: any) {
    return apiError('INTERNAL_ERROR', 'Status check failed.', 500, undefined, requestId);
  }
}
