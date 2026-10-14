import { NextRequest, NextResponse } from 'next/server';

const ALLOWED_ORIGINS = new Set([
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:1420',
  'http://127.0.0.1:1420',
  // Live domain (also set via APP_URL env var; this is the fallback)
  'https://hr360-one.vercel.app',
]);

if (process.env.APP_URL) {
  try {
    ALLOWED_ORIGINS.add(new URL(process.env.APP_URL).origin);
  } catch {}
}

function resolveAllowedOrigin(requestOrigin: string | null): string {
  if (!requestOrigin) return 'null';
  if (ALLOWED_ORIGINS.has(requestOrigin)) {
    return requestOrigin;
  }
  // Allow Electron custom protocol, file:// or null origin (desktop app contexts)
  if (
    requestOrigin.startsWith('file://') ||
    requestOrigin.startsWith('app://') ||
    requestOrigin === 'null' ||
    requestOrigin.startsWith('vscode-file:')
  ) {
    return requestOrigin;
  }
  return 'null';
}

function applySecurityHeaders(headers: Headers, requestOrigin: string | null) {
  // 1. Strict Transport Security (HSTS)
  headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');

  // 2. Clickjacking protection
  headers.set('X-Frame-Options', 'DENY');

  // 3. MIME type sniffing protection
  headers.set('X-Content-Type-Options', 'nosniff');

  // 4. Referrer policy
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  // 5. Restrict browser features
  headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');

  // 6. Content Security Policy (CSP)
  const isDev = process.env.NODE_ENV !== 'production';
  const csp = isDev
    ? "default-src 'self' 'unsafe-inline' 'unsafe-eval'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' ws: wss: http://localhost:* http://127.0.0.1:* https:; frame-ancestors 'none';"
    : "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https:; frame-ancestors 'none';";

  headers.set('Content-Security-Policy', csp);

  // 7. Remove identifying header
  headers.delete('X-Powered-By');

  // 8. Controlled CORS
  const origin = resolveAllowedOrigin(requestOrigin);
  if (origin !== 'null') {
    headers.set('Access-Control-Allow-Origin', origin);
    headers.set('Access-Control-Allow-Credentials', 'true');
  }
}

export function middleware(req: NextRequest) {
  const requestOrigin = req.headers.get('origin');

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    const preflight = new NextResponse(null, { status: 204 });
    applySecurityHeaders(preflight.headers, requestOrigin);
    preflight.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    preflight.headers.set(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization, Idempotency-Key, X-Request-ID, X-Device-ID'
    );
    preflight.headers.set('Access-Control-Max-Age', '86400');
    return preflight;
  }

  const response = NextResponse.next();
  applySecurityHeaders(response.headers, requestOrigin);
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
