import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  serverExternalPackages: ['@node-rs/argon2', '@hr360/crypto-audit', '@prisma/client', 'prisma'],
  outputFileTracingRoot: path.join(__dirname, '../../'),
  outputFileTracingIncludes: {
    '/api/**/*': [
      '../../node_modules/.pnpm/@node-rs+argon2*/**/*',
      './node_modules/@node-rs/**/*',
    ],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push('@node-rs/argon2');
    }
    return config;
  },
  headers: async () => [
    {
      // Match all API routes for CORS from Desktop app
      source: '/api/:path*',
      headers: [
        { key: 'Access-Control-Allow-Origin', value: '*' },
        { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,DELETE,OPTIONS' },
        { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization, x-company-id, x-staff-role, x-staff-id, idempotency-key, x-request-id' },
      ],
    },
    {
      source: '/:path*',
      headers: [
        {
          key: 'X-DNS-Prefetch-Control',
          value: 'on',
        },
        {
          key: 'Strict-Transport-Security',
          value: 'max-age=63072000; includeSubDomains; preload',
        },
        {
          key: 'X-Content-Type-Options',
          value: 'nosniff',
        },
        {
          key: 'X-Frame-Options',
          value: 'DENY',
        },
        {
          key: 'Referrer-Policy',
          value: 'origin-when-cross-origin',
        },
      ],
    },
  ],
};

export default nextConfig;
