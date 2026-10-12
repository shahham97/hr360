import { z } from 'zod';

// ==========================================
// Download & Lead Contracts (Section 6.1)
// ==========================================

export const DownloadRequestSchema = z.object({
  fullName: z.string().min(2).max(100),
  workEmail: z.string().email().max(255),
  companyName: z.string().min(2).max(100),
  consent: z.boolean().refine((val) => val === true, {
    message: 'Consent is required to proceed with download',
  }),
});

export type DownloadRequest = z.infer<typeof DownloadRequestSchema>;

export const DownloadResponseSchema = z.object({
  downloadUrl: z.string().url(),
  version: z.string(),
  sha256: z.string().length(64),
  expiresAt: z.string().datetime(),
});

export type DownloadResponse = z.infer<typeof DownloadResponseSchema>;

// ==========================================
// Admin Registration Approval & Rejection (Section 6.3)
// ==========================================

export const RegistrationActionSchema = z.object({
  action: z.enum(['APPROVE', 'REJECT']),
  reason: z.string().max(500).optional(),
  storageMode: z.enum(['CLOUD_DEDICATED', 'LOCAL']).default('CLOUD_DEDICATED').optional(),
  connectionString: z.string().min(10).optional(),
  providerAccountId: z.string().optional(),
  caCert: z.string().optional(),
});

export type RegistrationAction = z.infer<typeof RegistrationActionSchema>;

// ==========================================
// Staff Authentication Contracts
// ==========================================

export const StaffLoginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  totpCode: z.string().length(6).optional(),
});

export type StaffLoginRequest = z.infer<typeof StaffLoginRequestSchema>;

// ==========================================
// Release Manager Contract (Section 6.3)
// ==========================================

export const CreateReleaseSchema = z.object({
  version: z.string().regex(/^\d+\.\d+\.\d+$/, 'Version must follow semver format (x.y.z)'),
  channel: z.enum(['stable', 'beta']).default('stable'),
  notes: z.string().max(2000).optional(),
  downloadUrl: z.string().url(),
  sha256: z.string().length(64, 'SHA-256 must be exactly 64 hex characters'),
  isMandatory: z.boolean().default(false),
  minVersion: z.string().regex(/^\d+\.\d+\.\d+$/).optional(),
});

export type CreateRelease = z.infer<typeof CreateReleaseSchema>;
