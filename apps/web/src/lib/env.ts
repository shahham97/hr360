import { z } from 'zod';

/**
 * Boot-time Environment Schema & Validator
 * Enforces production-grade validation without ever printing or logging secrets.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  APP_URL: z.string().url().default('http://localhost:3000'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters long'),
  MASTER_ENCRYPTION_KEY: z.string().min(32, 'MASTER_ENCRYPTION_KEY must be at least 32 characters long'),
  MASTER_KEY_ID: z.string().min(1).default('hr360-k1-2026'),
  HR360_ENTITLEMENT_PRIVATE_KEY: z.string().optional(),
  CRON_SECRET: z.string().optional(),
  UPDATE_SIGNING_KEY: z.string().optional(),

  // Storage configuration (S3-compatible / R2)
  STORAGE_ENDPOINT: z.string().optional(),
  STORAGE_BUCKET: z.string().optional(),
  STORAGE_ACCESS_KEY_ID: z.string().optional(),
  STORAGE_SECRET_ACCESS_KEY: z.string().optional(),
  STORAGE_PUBLIC_DOMAIN: z.string().optional(),

  // Email configuration (Transactional)
  EMAIL_FROM: z.string().email().optional().default('noreply@hr360.local'),
  RESEND_API_KEY: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

let validatedEnv: Env | null = null;

export function getValidatedEnv(): Env {
  if (validatedEnv) {
    return validatedEnv;
  }

  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const missingKeys = result.error.issues.map((issue) => issue.path.join('.'));
    // CRITICAL: Never log process.env or secret values, only list missing variable names
    const errorMsg = `[BOOT_ENV_ERROR] Configuration validation failed. Missing or invalid environment variable names: [${missingKeys.join(', ')}]. Check production deployment settings.`;
    console.error(errorMsg);
    if (process.env.NODE_ENV === 'production') {
      throw new Error(errorMsg);
    }
  }

  validatedEnv = result.success ? result.data : (process.env as unknown as Env);
  return validatedEnv;
}
