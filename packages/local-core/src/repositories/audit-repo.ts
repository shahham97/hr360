import crypto from 'node:crypto';
import { DatabaseConnection } from '../database/connection';

export interface AuditLogEntity {
  id: string;
  sequenceNumber: number;
  prevHash: string;
  hash: string;
  timestamp: string;
  actor: string;
  action: string;
  module: string;
  entityId: string;
  details: string;
  ipAddress: string;
}

export interface AppendAuditInput {
  actor: string;
  action: string;
  module: string;
  entityId: string;
  details: string | Record<string, any>;
  ipAddress?: string;
}

const GENESIS_HASH = '0000000000000000000000000000000000000000000000000000000000000000';

export class AuditRepository {
  private readonly connection: DatabaseConnection;

  constructor(connection: DatabaseConnection) {
    this.connection = connection;
  }

  public appendEvent(input: AppendAuditInput): AuditLogEntity {
    return this.connection.transaction(() => {
      const raw = this.connection.getRawDb();
      const lastRow = raw.prepare(`
        SELECT sequence_number, hash FROM local_audit_log
        ORDER BY sequence_number DESC LIMIT 1
      `).get() as { sequence_number: number; hash: string } | undefined;

      const sequenceNumber = lastRow ? lastRow.sequence_number + 1 : 1;
      const prevHash = lastRow ? lastRow.hash : GENESIS_HASH;
      const timestamp = new Date().toISOString();
      const id = crypto.randomUUID();
      const detailsStr = typeof input.details === 'string' ? input.details : JSON.stringify(input.details);
      const ipAddress = input.ipAddress || '127.0.0.1';

      // Compute tamper-evident hash
      const payload = `${sequenceNumber}:${prevHash}:${timestamp}:${input.actor}:${input.action}:${input.module}:${input.entityId}:${detailsStr}`;
      const hash = crypto.createHash('sha256').update(payload).digest('hex');

      raw.prepare(`
        INSERT INTO local_audit_log (
          id, sequence_number, prev_hash, hash, timestamp, actor,
          action, module, entity_id, details, ip_address
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        sequenceNumber,
        prevHash,
        hash,
        timestamp,
        input.actor,
        input.action,
        input.module,
        input.entityId,
        detailsStr,
        ipAddress
      );

      return {
        id,
        sequenceNumber,
        prevHash,
        hash,
        timestamp,
        actor: input.actor,
        action: input.action,
        module: input.module,
        entityId: input.entityId,
        details: detailsStr,
        ipAddress,
      };
    });
  }

  public verifyChain(): { valid: boolean; totalEvents: number; brokenAtSequence?: number; reason?: string } {
    const raw = this.connection.getRawDb();
    const rows = raw.prepare(`SELECT * FROM local_audit_log ORDER BY sequence_number ASC`).all() as any[];

    let expectedPrevHash = GENESIS_HASH;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const seq = row.sequence_number;

      if (seq !== i + 1) {
        return {
          valid: false,
          totalEvents: rows.length,
          brokenAtSequence: seq,
          reason: `Sequence break: expected ${i + 1}, found ${seq}`,
        };
      }

      if (row.prev_hash !== expectedPrevHash) {
        return {
          valid: false,
          totalEvents: rows.length,
          brokenAtSequence: seq,
          reason: `Previous hash mismatch at sequence ${seq}`,
        };
      }

      const payload = `${seq}:${row.prev_hash}:${row.timestamp}:${row.actor}:${row.action}:${row.module}:${row.entity_id}:${row.details}`;
      const calculatedHash = crypto.createHash('sha256').update(payload).digest('hex');

      if (calculatedHash !== row.hash) {
        return {
          valid: false,
          totalEvents: rows.length,
          brokenAtSequence: seq,
          reason: `Hash signature verification failed at sequence ${seq}`,
        };
      }

      expectedPrevHash = row.hash;
    }

    return {
      valid: true,
      totalEvents: rows.length,
    };
  }

  public listEvents(options?: {
    module?: string;
    actor?: string;
    limit?: number;
    offset?: number;
  }): { items: AuditLogEntity[]; total: number } {
    const raw = this.connection.getRawDb();
    const conditions: string[] = [];
    const params: any[] = [];

    if (options?.module && options.module !== 'ALL') {
      conditions.push('module = ?');
      params.push(options.module);
    }
    if (options?.actor) {
      conditions.push('actor LIKE ?');
      params.push(`%${options.actor}%`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const countRow = raw.prepare(`SELECT COUNT(*) as cnt FROM local_audit_log ${whereClause}`).get(...params) as { cnt: number };
    const total = countRow.cnt;

    const limit = options?.limit ?? 50;
    const offset = options?.offset ?? 0;

    const rows = raw.prepare(`
      SELECT * FROM local_audit_log
      ${whereClause}
      ORDER BY sequence_number DESC
      LIMIT ? OFFSET ?
    `).all(...params, limit, offset) as any[];

    return {
      items: rows.map((r) => ({
        id: r.id,
        sequenceNumber: r.sequence_number,
        prevHash: r.prev_hash,
        hash: r.hash,
        timestamp: r.timestamp,
        actor: r.actor,
        action: r.action,
        module: r.module,
        entityId: r.entity_id,
        details: r.details,
        ipAddress: r.ip_address,
      })),
      total,
    };
  }
}
