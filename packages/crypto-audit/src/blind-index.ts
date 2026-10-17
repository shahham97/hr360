import crypto from 'node:crypto';

/**
 * Keyed HMAC Blind Index Engine
 * Provides deterministic, cryptographically secure hashes for exact-match lookups
 * on encrypted sensitive identifiers (CNIC, National ID, Bank IBAN, Passport).
 */
export class BlindIndex {
  /**
   * Generates a normalized blind index for a sensitive string
   * @param value The plaintext sensitive identifier (e.g. "35201-1234567-1")
   * @param secretKey A high-entropy key dedicated to blind indexing
   * @param context Optional domain context separation string (e.g. "cnic", "iban")
   */
  public static compute(value: string | null | undefined, secretKey: string, context: string = 'global'): string {
    if (!value || typeof value !== 'string') return '';
    // Normalize: strip whitespace, dashes, slashes, uppercase for case-insensitivity
    const normalized = value.replace(/[\s\-_/]/g, '').trim().toUpperCase();
    if (!normalized) return '';

    const hmac = crypto.createHmac('sha256', secretKey);
    hmac.update(`hr360:bindex:${context}:${normalized}`);
    return hmac.digest('hex');
  }

  /**
   * Generates blind index specifically for Pakistani CNIC (13 digits)
   */
  public static forCnic(cnic: string, secretKey: string): string {
    return this.compute(cnic, secretKey, 'cnic');
  }

  /**
   * Generates blind index specifically for Bank IBAN / Account number
   */
  public static forIban(iban: string, secretKey: string): string {
    return this.compute(iban, secretKey, 'iban');
  }
}
