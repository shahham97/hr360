import crypto from 'node:crypto';

export interface EncryptedPayload {
  ciphertext: string; // base64
  iv: string; // base64 (12 bytes for GCM)
  authTag: string; // base64 (16 bytes for GCM)
  version: number;
}

/**
 * AES-256-GCM Envelope Encryption & Decryption
 * Follows enterprise zero-trust standards: random 12-byte IV per encryption,
 * authenticated data tag (16 bytes), no key re-use vulnerabilities.
 */
export class EnvelopeCrypto {
  private masterKey: Buffer;

  constructor(masterKeyHexOrBase64?: string) {
    const rawKey = masterKeyHexOrBase64 || process.env.MASTER_ENCRYPTION_KEY;
    if (!rawKey) {
      throw new Error(
        'EnvelopeCrypto initialization failed: MASTER_ENCRYPTION_KEY must be configured as a 32-byte hex/base64 string.'
      );
    }

    if (rawKey.length === 64) {
      this.masterKey = Buffer.from(rawKey, 'hex');
    } else {
      this.masterKey = Buffer.from(rawKey, 'base64');
    }

    if (this.masterKey.length !== 32) {
      throw new Error(
        `EnvelopeCrypto: Master key must be exactly 32 bytes (256 bits). Received ${this.masterKey.length} bytes.`
      );
    }
  }

  public encrypt(plaintext: string): EncryptedPayload {
    // 12 bytes IV is standard for GCM to maximize performance and avoid counter-mode risks
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.masterKey, iv);

    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();

    return {
      ciphertext: encrypted.toString('base64'),
      iv: iv.toString('base64'),
      authTag: authTag.toString('base64'),
      version: 1,
    };
  }

  public decrypt(payload: EncryptedPayload): string {
    if (!payload.ciphertext || !payload.iv || !payload.authTag) {
      throw new Error('EnvelopeCrypto: Invalid encrypted payload structure.');
    }

    const iv = Buffer.from(payload.iv, 'base64');
    const authTag = Buffer.from(payload.authTag, 'base64');
    const ciphertext = Buffer.from(payload.ciphertext, 'base64');

    const decipher = crypto.createDecipheriv('aes-256-gcm', this.masterKey, iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return decrypted.toString('utf8');
  }

  public serialize(payload: EncryptedPayload): string {
    return JSON.stringify(payload);
  }

  public deserializeAndDecrypt(serialized: string): string {
    const payload = JSON.parse(serialized) as EncryptedPayload;
    return this.decrypt(payload);
  }
}
