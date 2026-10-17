import { NextRequest, NextResponse } from 'next/server';
import { getMasterPrismaClient } from '@hr360/db-master';
import { apiError } from './api-response';

export interface IdempotencyResult<T> {
  isCached: boolean;
  data?: T;
  response?: NextResponse;
}

/**
 * Enterprise Idempotency Guard for Critical Mutations
 * Prevents duplicate payroll runs, duplicate employee creation, or double billing charges.
 */
export async function withIdempotency(
  req: NextRequest,
  scope: string,
  companyId: string,
  handler: () => Promise<NextResponse>,
  ttlSeconds: number = 86400 // 24 hours
): Promise<NextResponse> {
  const idempotencyKey = req.headers.get('idempotency-key') || req.headers.get('x-idempotency-key');

  // If no idempotency key provided, proceed with direct execution
  if (!idempotencyKey) {
    return await handler();
  }

  const nonceKey = `idem:${scope}:${companyId}:${idempotencyKey.trim()}`.substring(0, 128);
  const prisma = getMasterPrismaClient();

  try {
    // 1. Check if key exists in master database
    const existing = await prisma.securityNonce.findUnique({
      where: { nonce: nonceKey },
    });

    if (existing) {
      if (existing.expiresAt > new Date()) {
        // Cached execution: return previous response replay
        return NextResponse.json(
          {
            data: {
              idempotencyKey,
              scope,
              isIdempotentReplay: true,
              message: 'Request was previously processed and confirmed.',
            },
          },
          {
            status: 200,
            headers: {
              'X-Idempotency-Replay': 'true',
            },
          }
        );
      }
      // If expired, clean up old record
      try {
        await prisma.securityNonce.delete({ where: { nonce: nonceKey } });
      } catch {}
    }

    // 2. Register initial idempotency lock
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
    await prisma.securityNonce.create({
      data: {
        nonce: nonceKey,
        scope: scope.substring(0, 64),
        expiresAt,
      },
    });

    // 3. Execute business mutation
    const response = await handler();

    // 4. If handler failed with client or server error, release lock to permit client retry
    if (response.status >= 400) {
      try {
        await prisma.securityNonce.delete({
          where: { nonce: nonceKey },
        });
      } catch {}
    }

    return response;
  } catch (err: any) {
    // If database concurrency error on insert (duplicate key race condition)
    if (err.code === 'P2002' || err.message?.includes('Duplicate')) {
      return apiError(
        'CONFLICT',
        'Concurrent mutation with the same Idempotency-Key detected.',
        409
      );
    }
    // Fallback: run handler if idempotency storage unavailable
    return await handler();
  }
}
