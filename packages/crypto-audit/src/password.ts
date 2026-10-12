import { hash, verify } from '@node-rs/argon2';

/**
 * Argon2id Password Hashing Engine
 * Standardized OWASP recommendation parameters:
 * Memory: 64 MB (65536 KiB), Iterations: 3, Parallelism: 4
 */
export class PasswordHasher {
  private static readonly OPTIONS = {
    memoryCost: 65536,
    timeCost: 3,
    outputLen: 32,
    parallelism: 4,
  };

  public static async hashPassword(password: string): Promise<string> {
    if (!password || password.length < 8) {
      throw new Error('PasswordHasher: Password does not satisfy minimal length constraints.');
    }
    return hash(password, this.OPTIONS);
  }

  public static async verifyPassword(hashString: string, candidate: string): Promise<boolean> {
    if (!hashString || !candidate) {
      return false;
    }
    try {
      return await verify(hashString, candidate);
    } catch {
      return false;
    }
  }
}
