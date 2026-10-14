import { PrismaClient } from '@prisma/client';

export * from '@prisma/client';

// Serverless-safe singleton: reuse the same PrismaClient across warm invocations
// to avoid exhausting the database connection limit.
declare const globalThis: { _masterPrisma?: PrismaClient } & typeof global;

export function getMasterPrismaClient(): PrismaClient {
  if (!globalThis._masterPrisma) {
    globalThis._masterPrisma = new PrismaClient({
      log: process.env.NODE_ENV === 'production' ? ['warn', 'error'] : ['warn', 'error'],
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
    });
  }
  return globalThis._masterPrisma;
}
