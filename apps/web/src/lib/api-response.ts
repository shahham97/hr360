import crypto from 'node:crypto';
import { NextResponse } from 'next/server';
import type { ApiErrorCode } from '@hr360/schema';

export function createRequestId(): string {
  return crypto.randomUUID();
}

export function apiSuccess<T>(data: T, requestId: string = createRequestId(), status: number = 200) {
  const response = NextResponse.json(
    {
      data,
      meta: {
        requestId,
        timestamp: new Date().toISOString(),
      },
    },
    { status }
  );

  response.headers.set('x-request-id', requestId);
  return response;
}

function isDbErrorMessage(msg: unknown): boolean {
  if (typeof msg !== 'string') return false;
  const s = msg.toLowerCase();
  return (
    s.includes("can't reach database") ||
    s.includes('cant reach database') ||
    s.includes('database server') ||
    s.includes('db not responding') ||
    s.includes('prisma') ||
    s.includes('p1001') ||
    s.includes('p1002') ||
    s.includes('p1003') ||
    s.includes('p2024') ||
    s.includes('econnrefused') ||
    s.includes('etimedout') ||
    s.includes('connection refused') ||
    s.includes('sqlite_') ||
    s.includes('sqliteerror') ||
    s.includes('failed to connect') ||
    s.includes('getaddrinfo enotfound')
  );
}

export function apiError(
  code: ApiErrorCode,
  message: string,
  status: number = 400,
  details?: Record<string, unknown>,
  requestId: string = createRequestId()
) {
  const finalMessage = isDbErrorMessage(message) ? 'DB not responding' : message;
  const response = NextResponse.json(
    {
      error: {
        code,
        message: finalMessage,
        details,
        requestId,
      },
    },
    { status }
  );

  response.headers.set('x-request-id', requestId);
  return response;
}

export function hashIp(ip: string): string {
  const salt = process.env.JWT_SECRET || 'hr360-default-salt';
  return crypto.createHash('sha256').update(`${ip}:${salt}`).digest('hex');
}
