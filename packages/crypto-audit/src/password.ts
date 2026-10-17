import * as crypto from 'crypto';

let nativeArgon: typeof import('@node-rs/argon2') | null = null;
try {
  nativeArgon = require('@node-rs/argon2');
} catch {
  nativeArgon = null;
}

let wasmArgon: typeof import('hash-wasm') | null = null;
try {
  wasmArgon = require('hash-wasm');
} catch {
  wasmArgon = null;
}

/**
 * Enterprise Resilient Argon2id Password Hashing Engine
 * Features:
 * - Primary: High-speed native bindings (@node-rs/argon2)
 * - Fallback: Pure WebAssembly engine (hash-wasm) for serverless environments where native binaries are absent
 * - Parameters: OWASP recommended Argon2id (64MB memory, 3 iterations, parallelism 4)
 * - Fully bidirectional compatible with existing stored hashes
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

    if (nativeArgon?.hash) {
      try {
        return await nativeArgon.hash(password, this.OPTIONS);
      } catch (err) {
        // Fall through to WASM if native fails
      }
    }

    if (wasmArgon?.argon2id) {
      const salt = crypto.randomBytes(16);
      return await wasmArgon.argon2id({
        password,
        salt,
        iterations: this.OPTIONS.timeCost,
        memorySize: this.OPTIONS.memoryCost,
        hashLength: this.OPTIONS.outputLen,
        parallelism: this.OPTIONS.parallelism,
        outputType: 'encoded',
      });
    }

    throw new Error('PasswordHasher: No hashing engine available (native and wasm both unavailable).');
  }

  public static async verifyPassword(hashString: string, candidate: string): Promise<boolean> {
    if (!hashString || !candidate) {
      return false;
    }

    // 1. Try native engine first
    if (nativeArgon?.verify) {
      try {
        return await nativeArgon.verify(hashString, candidate);
      } catch {
        // Native may fail if module not compiled for target OS/glibc or corrupt format, fall through to WASM
      }
    }

    // 2. Try WASM engine fallback
    if (wasmArgon?.argon2Verify) {
      try {
        return await wasmArgon.argon2Verify({
          password: candidate,
          hash: hashString,
        });
      } catch {
        return false;
      }
    }

    return false;
  }
}
