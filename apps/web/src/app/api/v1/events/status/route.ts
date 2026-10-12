// @ROUTE_EXEMPT: PUBLIC_STATUS_STREAM - SSE live company onboarding status stream
import { NextRequest } from 'next/server';
import { revocationStream } from '@hr360/tenancy';

import { JsonWebToken, TenantTokenClaims } from '@hr360/crypto-audit';

const JWT_SECRET = process.env.JWT_SECRET || 'hr360-default-ultra-secure-jwt-signing-secret-key-32chars!';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get('token') || req.headers.get('authorization')?.replace('Bearer ', '');
  let companyId = searchParams.get('companyId');

  if (token) {
    const verified = JsonWebToken.verify<TenantTokenClaims>(token, JWT_SECRET);
    if (verified.valid && verified.payload) {
      companyId = verified.payload.companyId;
    } else {
      return new Response('Invalid or expired authentication token for event stream.', { status: 401 });
    }
  }

  if (!companyId) {
    return new Response('Valid authentication token or companyId is required.', { status: 401 });
  }

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      // Send initial handshake event
      controller.enqueue(encoder.encode(`event: connected\ndata: ${JSON.stringify({ status: 'CONNECTED' })}\n\n`));

      const statusListener = (data: any) => {
        try {
          controller.enqueue(
            encoder.encode(`event: company_status\ndata: ${JSON.stringify(data)}\n\n`)
          );
        } catch {
          // Stream closed by client
        }
      };

      revocationStream.on(`status:${companyId}`, statusListener);

      req.signal.addEventListener('abort', () => {
        revocationStream.off(`status:${companyId}`, statusListener);
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    },
  });
}
