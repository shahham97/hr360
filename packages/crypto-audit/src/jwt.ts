import crypto from 'node:crypto';

export interface TokenHeader {
  alg: 'HS256' | 'Ed25519';
  typ: 'JWT';
}

export interface BaseTokenClaims {
  sub: string; // User ID or Staff ID
  exp: number; // Expiration epoch seconds
  iat: number; // Issued-at epoch seconds
  iss: string; // Issuer 'hr360-api'
}

export interface TenantTokenClaims extends BaseTokenClaims {
  type: 'tenant_access' | 'tenant_refresh';
  userId: string;
  companyId: string;
  tenantSlug: string;
  email: string;
  role: string;
  deviceId?: string;
  sessionId?: string;
}

export interface StaffTokenClaims extends BaseTokenClaims {
  type: 'staff_access' | 'staff_refresh';
  staffId: string;
  email: string;
  role: 'SUPER_ADMIN' | 'ADMIN';
}

function base64UrlEncode(input: Buffer | string): string {
  const buf = typeof input === 'string' ? Buffer.from(input, 'utf8') : input;
  return buf.toString('base64url');
}

function base64UrlDecode(input: string): Buffer {
  return Buffer.from(input, 'base64url');
}

export class JsonWebToken {
  /**
   * Signs a JWT using HMAC-SHA256
   */
  public static sign<T extends Record<string, any>>(
    payload: T,
    secret: string,
    expiresInSeconds: number = 900
  ): string {
    if (!secret || secret.length < 32) {
      throw new Error('JWT secret must be at least 32 characters long.');
    }

    const header: TokenHeader = { alg: 'HS256', typ: 'JWT' };
    const now = Math.floor(Date.now() / 1000);
    const fullPayload = {
      ...payload,
      iat: now,
      exp: now + expiresInSeconds,
      iss: 'hr360-api',
    };

    const headerB64 = base64UrlEncode(JSON.stringify(header));
    const payloadB64 = base64UrlEncode(JSON.stringify(fullPayload));
    const message = `${headerB64}.${payloadB64}`;

    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(message);
    const signatureB64 = base64UrlEncode(hmac.digest());

    return `${message}.${signatureB64}`;
  }

  /**
   * Verifies and decodes a JWT in constant time
   */
  public static verify<T extends Record<string, any>>(
    token: string,
    secret: string
  ): { valid: boolean; payload?: T; error?: string } {
    try {
      if (!token || typeof token !== 'string') {
        return { valid: false, error: 'Token missing or invalid format.' };
      }

      const parts = token.split('.');
      if (parts.length !== 3) {
        return { valid: false, error: 'Malformed JWT structure.' };
      }

      const [headerB64, payloadB64, signatureB64] = parts;
      if (!headerB64 || !payloadB64 || !signatureB64) {
        return { valid: false, error: 'Missing JWT components.' };
      }

      const headerJson = JSON.parse(base64UrlDecode(headerB64).toString('utf8'));
      if (headerJson.alg !== 'HS256' || headerJson.typ !== 'JWT') {
        return { valid: false, error: 'Unsupported algorithm or token type.' };
      }

      const message = `${headerB64}.${payloadB64}`;
      const hmac = crypto.createHmac('sha256', secret);
      hmac.update(message);
      const expectedSig = hmac.digest();
      const actualSig = base64UrlDecode(signatureB64);

      if (expectedSig.length !== actualSig.length) {
        return { valid: false, error: 'Signature length mismatch.' };
      }

      const isMatch = crypto.timingSafeEqual(expectedSig, actualSig);
      if (!isMatch) {
        return { valid: false, error: 'Invalid token signature.' };
      }

      const payload = JSON.parse(base64UrlDecode(payloadB64).toString('utf8')) as T & BaseTokenClaims;
      const now = Math.floor(Date.now() / 1000);

      if (payload.exp && payload.exp < now) {
        return { valid: false, error: 'Token has expired.' };
      }

      return { valid: true, payload };
    } catch (err: any) {
      return { valid: false, error: err.message || 'Token verification failed.' };
    }
  }
}

/**
 * Entitlement Token Signing & Verification (Asymmetric Ed25519 / RSA)
 */
export interface SignedEntitlement {
  companyId: string;
  planCode: string;
  status: string;
  limits: {
    employees: number;
    terminals: number;
    adminUsers: number;
    storageMb: number;
  };
  modules: {
    dashboard: boolean;
    employees: boolean;
    attendance: boolean;
    leaves: boolean;
    payroll: boolean;
    payslipTemplate: boolean;
    certificates: boolean;
    performance: boolean;
    recruitment: boolean;
    system: boolean;
  };
  serverTime: string;
  expiresAt: string;
  graceUntil: string;
}

export class EntitlementCrypto {
  /**
   * Generates Ed25519 Keypair for Entitlement Authority
   */
  public static generateKeyPair(): { publicKey: string; privateKey: string } {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
    return {
      publicKey: publicKey.export({ type: 'spki', format: 'pem' }).toString(),
      privateKey: privateKey.export({ type: 'pkcs8', format: 'pem' }).toString(),
    };
  }

  /**
   * Signs entitlement payload using Ed25519 private key
   */
  public static signEntitlement(payload: SignedEntitlement, privateKeyPem: string): string {
    const dataBuffer = Buffer.from(JSON.stringify(payload), 'utf8');
    const signature = crypto.sign(null, dataBuffer, crypto.createPrivateKey(privateKeyPem));
    const payloadB64 = base64UrlEncode(dataBuffer);
    const signatureB64 = base64UrlEncode(signature);
    return `${payloadB64}.${signatureB64}`;
  }

  /**
   * Verifies entitlement payload using Ed25519 public key
   */
  public static verifyEntitlement(
    token: string,
    publicKeyPem: string
  ): { valid: boolean; payload?: SignedEntitlement; error?: string } {
    try {
      const parts = token.split('.');
      if (parts.length !== 2) {
        return { valid: false, error: 'Invalid entitlement signature format.' };
      }

      const [payloadB64, signatureB64] = parts;
      if (!payloadB64 || !signatureB64) {
        return { valid: false, error: 'Missing entitlement payload or signature.' };
      }

      const dataBuffer = base64UrlDecode(payloadB64);
      const signature = base64UrlDecode(signatureB64);

      const isValid = crypto.verify(null, dataBuffer, crypto.createPublicKey(publicKeyPem), signature);
      if (!isValid) {
        return { valid: false, error: 'Entitlement signature verification failed.' };
      }

      const payload = JSON.parse(dataBuffer.toString('utf8')) as SignedEntitlement;

      // Clock rollback check: serverTime cannot be far in the future
      const serverEpoch = new Date(payload.serverTime).getTime();
      const localEpoch = Date.now();
      // Allow up to 10 minutes clock drift, but reject if local time is significantly behind server time (rollback)
      if (localEpoch < serverEpoch - 10 * 60 * 1000) {
        return { valid: false, error: 'System clock has been rolled back. Access denied.' };
      }

      return { valid: true, payload };
    } catch (err: any) {
      return { valid: false, error: err.message || 'Failed to verify entitlement.' };
    }
  }
}
