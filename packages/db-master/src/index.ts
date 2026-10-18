import { PrismaClient } from '@prisma/client';

export * from '@prisma/client';

// Serverless-safe singleton: reuse the same PrismaClient across warm invocations
// to avoid exhausting the database connection limit.
declare const globalThis: { _masterPrisma?: PrismaClient } & typeof global;

export function getMasterPrismaClient(): PrismaClient {
  if (!globalThis._masterPrisma) {
    let dbUrl = process.env.DATABASE_URL || '';
    if (dbUrl && !dbUrl.includes('sslaccept=')) {
      const sep = dbUrl.includes('?') ? '&' : '?';
      dbUrl = `${dbUrl}${sep}sslaccept=strict&connect_timeout=30&pool_timeout=30`;
    }

    globalThis._masterPrisma = new PrismaClient({
      log: ['warn', 'error'],
      datasources: {
        db: {
          url: dbUrl,
        },
      },
    });
  }
  return globalThis._masterPrisma;
}
