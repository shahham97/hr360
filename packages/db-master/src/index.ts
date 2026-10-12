import { PrismaClient } from '@prisma/client';

export * from '@prisma/client';

let globalPrisma: PrismaClient | undefined;

export function getMasterPrismaClient(): PrismaClient {
  if (process.env.NODE_ENV === 'production') {
    return new PrismaClient();
  }

  if (!globalPrisma) {
    globalPrisma = new PrismaClient({
      log: ['warn', 'error'],
    });
  }

  return globalPrisma;
}
