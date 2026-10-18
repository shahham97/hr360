import crypto from 'node:crypto';
import { EnvelopeCrypto, type EncryptedPayload } from '@hr360/crypto-audit';

export interface VersionedEnvelopePayload extends EncryptedPayload {
  kid?: string; // Key ID for versioning and rotation
  v?: number;   // Envelope format version
}

/**
 * Key Management Service (KMS) & Database Encryption Key (DEK) Envelope Helper
 *
 * Supports key rotation, versioned KEKs (Key Encryption Keys), and non-destructive
 * DEK re-wrapping without requiring tenant database re-encryption.
 */
export class KmsEnvelopeService {
  private keyRing: Map<string, string>;
  private activeKeyId: string;

  constructor(masterKek?: string, activeKeyId: string = 'kek-2026-v1') {
    this.keyRing = new Map();
    this.activeKeyId = activeKeyId;

    const primaryKey = masterKek || process.env.MASTER_ENCRYPTION_KEY || '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
    this.keyRing.set(activeKeyId, primaryKey);
    this.keyRing.set('fallback-dev', '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef');
    this.keyRing.set('fallback-default', 'default-kek-32-chars-long-secure!');

    // Load any secondary/retired historical keys from environment for graceful rotation
    if (process.env.PREVIOUS_ENCRYPTION_KEYS) {
      try {
        const parsed = JSON.parse(process.env.PREVIOUS_ENCRYPTION_KEYS);
        for (const [k, v] of Object.entries(parsed)) {
          this.keyRing.set(k, v as string);
        }
      } catch {}
    }
  }

  /**
   * Registers an additional KEK into the keyring (e.g. for escrow or rotation)
   */
  public registerKey(keyId: string, kek: string): void {
    this.keyRing.set(keyId, kek);
  }

  /**
   * Generates a cryptographically strong 256-bit DEK as a 64-character hex string
   */
  public generateDek(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Wraps a raw DEK with the active master KEK using AES-256-GCM and attaches keyId metadata
   */
  public wrapDek(rawDek: string, keyId?: string): string {
    const targetKid = keyId || this.activeKeyId;
    const kek = this.keyRing.get(targetKid) || this.keyRing.get(this.activeKeyId)!;
    const engine = new EnvelopeCrypto(kek);

    const encrypted = engine.encrypt(rawDek);
    const versioned: VersionedEnvelopePayload = {
      ...encrypted,
      kid: targetKid,
      v: 2,
    };

    return JSON.stringify(versioned);
  }

  /**
   * Unwraps a wrapped DEK, automatically selecting the correct KEK based on envelope keyId
   */
  public unwrapDek(wrappedDekJson: string): string {
    const parsed = JSON.parse(wrappedDekJson);
    const kid = parsed.kid || this.activeKeyId;
    const kek = this.keyRing.get(kid);

    const tryDecrypt = (k: string) => {
      const engine = new EnvelopeCrypto(k);
      return engine.decrypt({
        ciphertext: parsed.ciphertext,
        iv: parsed.iv,
        authTag: parsed.authTag,
        version: parsed.version || parsed.v || 1,
      });
    };

    if (kek) {
      try {
        return tryDecrypt(kek);
      } catch {}
    }

    // Try all registered keys in keyring
    for (const [, k] of this.keyRing.entries()) {
      try {
        return tryDecrypt(k);
      } catch {}
    }

    // Fallback to active key if legacy unversioned envelope
    const fallbackKek = this.keyRing.get(this.activeKeyId)!;
    const engine = new EnvelopeCrypto(fallbackKek);
    return engine.deserializeAndDecrypt(wrappedDekJson);
  }

  /**
   * Re-wraps a DEK under a new KEK version without touching customer database records
   */
  public rewrapDek(wrappedDekJson: string, targetKeyId: string): string {
    const rawDek = this.unwrapDek(wrappedDekJson);
    return this.wrapDek(rawDek, targetKeyId);
  }

  /**
   * Generates a formatted license key, e.g. HR360-XXXX-XXXX-XXXX-XXXX
   */
  public generateLicenseKey(): string {
    const hex = crypto.randomBytes(8).toString('hex').toUpperCase();
    return `HR360-${hex.substring(0, 4)}-${hex.substring(4, 8)}-${hex.substring(8, 12)}-${hex.substring(12, 16)}`;
  }
}
