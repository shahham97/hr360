import { getMasterPrismaClient } from '@hr360/db-master';
import { AuditChain, GENESIS_HASH } from '@hr360/crypto-audit';
import crypto from 'node:crypto';

export async function logPlatformAudit(params: {
  actorId: string;
  actorType: 'STAFF' | 'TENANT_USER' | 'SYSTEM' | 'ANONYMOUS';
  action: string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}) {
  try {
    const prisma = getMasterPrismaClient();

    // Get latest audit record for prevHash
    const lastAudit = await prisma.masterAuditLog.findFirst({
      orderBy: { createdAt: 'desc' },
      select: { hash: true },
    });

    const prevHash = lastAudit?.hash || GENESIS_HASH;
    const auditId = crypto.randomUUID();
    const timestamp = new Date().toISOString();

    const record = AuditChain.createRecord(prevHash, {
      id: auditId,
      actorId: params.actorId,
      actorType: params.actorType,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      metadata: params.metadata,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      timestamp,
    });

    await prisma.masterAuditLog.create({
      data: {
        id: auditId,
        prevHash: record.prevHash,
        hash: record.hash,
        actorId: record.actorId,
        actorType: record.actorType,
        action: record.action,
        entityType: record.entityType,
        entityId: record.entityId,
        metadata: params.metadata ? JSON.stringify(params.metadata) : null,
        ipAddress: params.ipAddress || null,
        userAgent: params.userAgent || null,
        createdAt: new Date(timestamp),
      },
    });
  } catch (err: any) {
    console.error('[AUDIT_LOG_ERROR] Failed to record master audit entry:', err.message);
  }
}
