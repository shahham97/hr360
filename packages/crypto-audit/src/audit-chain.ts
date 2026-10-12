import crypto from 'node:crypto';

/**
 * Deterministic JSON stringifier (RFC 8785 JSON Canonicalization Scheme subset)
 * Guarantees identical canonical string for identical objects regardless of property insertion order.
 */
export function canonicalizeJSON(obj: unknown): string {
  if (obj === null || typeof obj !== 'object') {
    return JSON.stringify(obj);
  }

  if (Array.isArray(obj)) {
    return `[${obj.map((item) => canonicalizeJSON(item)).join(',')}]`;
  }

  const record = obj as Record<string, unknown>;
  const sortedKeys = Object.keys(record).sort();
  const pairs = sortedKeys.map((key) => `${JSON.stringify(key)}:${canonicalizeJSON(record[key])}`);

  return `{${pairs.join(',')}}`;
}

export const GENESIS_HASH = '0'.repeat(64);

export interface AuditEntryData {
  id: string;
  actorId: string;
  actorType: 'STAFF' | 'TENANT_USER' | 'SYSTEM' | 'ANONYMOUS';
  action: string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  timestamp: string; // ISO 8601
}

export interface ChainedAuditRecord extends AuditEntryData {
  prevHash: string;
  hash: string;
}

/**
 * Cryptographic SHA-256 Audit Chain Verifier & Generator
 * Formula: hash = SHA256(prevHash + canonicalJSON(row))
 */
export class AuditChain {
  public static computeHash(prevHash: string, data: AuditEntryData): string {
    const canonical = canonicalizeJSON(data);
    const contentToHash = `${prevHash}:${canonical}`;
    return crypto.createHash('sha256').update(contentToHash, 'utf8').digest('hex');
  }

  public static createRecord(prevHash: string, data: AuditEntryData): ChainedAuditRecord {
    const hash = this.computeHash(prevHash, data);
    return {
      ...data,
      prevHash,
      hash,
    };
  }

  public static verifyChain(records: ChainedAuditRecord[]): {
    isValid: boolean;
    brokenIndex?: number;
    reason?: string;
  } {
    if (records.length === 0) {
      return { isValid: true };
    }

    let expectedPrevHash = GENESIS_HASH;

    for (let i = 0; i < records.length; i++) {
      const record = records[i]!;

      if (record.prevHash !== expectedPrevHash) {
        return {
          isValid: false,
          brokenIndex: i,
          reason: `Invalid previous hash link at index ${i}. Expected ${expectedPrevHash}, found ${record.prevHash}`,
        };
      }

      const { prevHash, hash, ...data } = record;
      const computed = this.computeHash(prevHash, data);

      if (computed !== hash) {
        return {
          isValid: false,
          brokenIndex: i,
          reason: `Tampered record content or invalid hash at index ${i}. Expected ${computed}, found ${hash}`,
        };
      }

      expectedPrevHash = hash;
    }

    return { isValid: true };
  }
}
