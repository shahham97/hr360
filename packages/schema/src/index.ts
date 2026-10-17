import { z } from 'zod';
export { z };

// ==========================================
// API Envelope & Standard Error Contracts
// ==========================================

export const ApiErrorCodeSchema = z.enum([
  'BAD_REQUEST',
  'UNAUTHORIZED',
  'FORBIDDEN',
  'NOT_FOUND',
  'CONFLICT',
  'UNPROCESSABLE_ENTITY',
  'RATE_LIMITED',
  'INTERNAL_ERROR',
  'TENANT_INACTIVE',
  'TENANT_EXPIRED',
  'TENANT_NOT_PROVISIONED',
  'TENANT_MIGRATION_BLOCKED',
  'INVALID_CREDENTIALS',
  'OTP_EXPIRED',
  'OTP_INVALID',
  'DEVICE_REVOKED',
]);

export type ApiErrorCode = z.infer<typeof ApiErrorCodeSchema>;

export const ApiErrorEnvelopeSchema = z.object({
  error: z.object({
    code: ApiErrorCodeSchema,
    message: z.string().min(1),
    details: z.record(z.unknown()).optional(),
    requestId: z.string().uuid(),
  }),
});

export type ApiErrorEnvelope = z.infer<typeof ApiErrorEnvelopeSchema>;

export const ApiSuccessEnvelopeSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    data: dataSchema,
    meta: z
      .object({
        requestId: z.string().uuid(),
        timestamp: z.string().datetime(),
      })
      .optional(),
  });

// ==========================================
// Slug & Identifier Validation Rules
// ==========================================

const RESERVED_SLUGS = new Set([
  'admin',
  'superadmin',
  'api',
  'portal',
  'system',
  'master',
  'mysql',
  'sys',
  'information_schema',
  'performance_schema',
  'metrics',
  'health',
  'auth',
  'billing',
  'support',
  'root',
  'tidb',
]);

export const TenantSlugSchema = z
  .string()
  .min(3, 'Slug must be at least 3 characters')
  .max(40, 'Slug must not exceed 40 characters')
  .regex(/^[a-z0-9_]+$/, 'Slug must only contain lowercase alphanumeric characters and underscores')
  .refine((slug) => !slug.startsWith('_') && !slug.endsWith('_'), {
    message: 'Slug cannot start or end with an underscore',
  })
  .refine((slug) => !RESERVED_SLUGS.has(slug), {
    message: 'Slug is a reserved platform keyword',
  });

export function generateSafeSlug(rawName: string, suffix?: string): string {
  let base = rawName
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

  if (base.length < 3) {
    base = `org_${base}`;
  }
  if (base.length > 32) {
    base = base.substring(0, 32).replace(/_+$/, '');
  }

  if (RESERVED_SLUGS.has(base)) {
    base = `org_${base}`;
  }

  if (suffix) {
    const sanitizedSuffix = suffix.toLowerCase().replace(/[^a-z0-9]/g, '');
    base = `${base}_${sanitizedSuffix}`;
  }

  return base.substring(0, 40);
}

// ==========================================
// Registration & Auth Contracts
// ==========================================

export const CompanyRegistrationRequestSchema = z.object({
  companyName: z.string().min(2).max(100),
  adminEmail: z.string().email().max(255),
  adminPassword: z
    .string()
    .min(12, 'Password must be at least 12 characters')
    .max(128)
    .regex(/[A-Z]/, 'Must contain an uppercase letter')
    .regex(/[a-z]/, 'Must contain a lowercase letter')
    .regex(/[0-9]/, 'Must contain a digit')
    .regex(/[^A-Za-z0-9]/, 'Must contain a special character'),
  adminFullName: z.string().min(2).max(100),
  phone: z.string().min(7).max(30),
  country: z.string().length(2).toUpperCase(), // ISO2
  estimatedEmployees: z.number().int().positive().optional(),
  selectedPlanTier: z.enum(['STARTER', 'GROWTH', 'ENTERPRISE']).default('STARTER').optional(),
  selectedInterval: z.enum(['MONTHLY', 'ANNUAL', 'LIFETIME']).default('MONTHLY').optional(),
});

export type CompanyRegistrationRequest = z.infer<typeof CompanyRegistrationRequestSchema>;

export const RegistrationStatusSchema = z.enum([
  'PENDING',
  'APPROVED',
  'REJECTED',
  'PROVISIONING',
  'ACTIVE',
  'PROVISION_FAILED',
]);

export type RegistrationStatus = z.infer<typeof RegistrationStatusSchema>;

export const TenantStatusSchema = z.enum([
  'PENDING',
  'ACTIVE',
  'INACTIVE',
  'EXPIRED',
  'SUSPENDED',
  'REJECTED',
  'PROVISION_FAILED',
  'MIGRATION_BLOCKED',
]);

export type TenantStatus = z.infer<typeof TenantStatusSchema>;

export const PlatformRoleSchema = z.enum(['SUPER_ADMIN', 'ADMIN']);
export type PlatformRole = z.infer<typeof PlatformRoleSchema>;

export const TenantRoleSchema = z.enum(['COMPANY_ADMIN', 'HR_MANAGER', 'PAYROLL_OFFICER', 'EMPLOYEE']);
export type TenantRole = z.infer<typeof TenantRoleSchema>;

export * from './portal.js';
export * from './modules.js';
export * from './features.js';
