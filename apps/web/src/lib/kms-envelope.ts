import crypto from 'node:crypto';
import { EnvelopeCrypto } from '@hr360/crypto-audit';

/**
 * Key Management Service (KMS) & Database Encryption Key (DEK) Envelope Helper
 *
 * Each company has a unique 256-bit DEK used by its local SQLCipher database.
 * The master server stores DEKs wrapped by the Master Key Encryption Key (KEK).
 * DEKs are never stored in plaintext on disk or in the master database.
 */
export class KmsEnvelopeService {
  private crypto: EnvelopeCrypto;

  constructor(masterKek?: string) {
    this.crypto = new EnvelopeCrypto(masterKek);
  }

  /**
   * Generates a cryptographically strong 256-bit DEK as a 64-character hex string
   */
  public generateDek(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Wraps a raw DEK with the master KEK using AES-256-GCM
   */
  public wrapDek(rawDek: string): string {
    const encrypted = this.crypto.encrypt(rawDek);
    return this.crypto.serialize(encrypted);
  }

  /**
   * Unwraps a wrapped DEK using the master KEK
   */
  public unwrapDek(wrappedDekJson: string): string {
    return this.crypto.deserializeAndDecrypt(wrappedDekJson);
  }

  /**
   * Generates a formatted license key, e.g. HR360-XXXX-XXXX-XXXX-XXXX
   */
  public generateLicenseKey(): string {
    const hex = crypto.randomBytes(8).toString('hex').toUpperCase();
    return `HR360-${hex.substring(0, 4)}-${hex.substring(4, 8)}-${hex.substring(8, 12)}-${hex.substring(12, 16)}`;
  }
}
