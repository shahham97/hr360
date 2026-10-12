import { z } from 'zod';

// ==========================================
// Billing & Subscriptions Contracts (Section 4 & 9)
// ==========================================

export const BillingIntervalSchema = z.enum(['MONTHLY', 'ANNUAL']);
export type BillingInterval = z.infer<typeof BillingIntervalSchema>;

export const PaymentMethodTypeSchema = z.enum(['CARD', 'BANK_TRANSFER', 'LOCAL_WALLET', 'MANUAL_ADMIN']);
export type PaymentMethodType = z.infer<typeof PaymentMethodTypeSchema>;

export const CreateSubscriptionCheckoutSchema = z.object({
  planCode: z.string().min(1),
  interval: BillingIntervalSchema,
  paymentMethod: PaymentMethodTypeSchema,
  referenceNumber: z.string().optional(),
  proofNotes: z.string().optional(),
});
export type CreateSubscriptionCheckout = z.infer<typeof CreateSubscriptionCheckoutSchema>;

export const MarkManualPaymentPaidSchema = z.object({
  paymentId: z.string().uuid(),
  transactionRef: z.string().min(1),
  notes: z.string().optional(),
});
export type MarkManualPaymentPaid = z.infer<typeof MarkManualPaymentPaidSchema>;

export const ToggleTenantStatusSchema = z.object({
  companyId: z.string().uuid(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']),
  reason: z.string().min(1),
});
export type ToggleTenantStatus = z.infer<typeof ToggleTenantStatusSchema>;

// Desktop Heartbeat & Device Contracts (Section 7)
export const DesktopHeartbeatRequestSchema = z.object({
  appVersion: z.string(),
  deviceHash: z.string().length(64),
  deviceName: z.string().optional(),
  osVersion: z.string().optional(),
});
export type DesktopHeartbeatRequest = z.infer<typeof DesktopHeartbeatRequestSchema>;

export const DesktopHeartbeatResponseSchema = z.object({
  companyStatus: z.enum(['PENDING', 'ACTIVE', 'INACTIVE', 'EXPIRED', 'SUSPENDED', 'REJECTED', 'PROVISION_FAILED']),
  isRevoked: z.boolean(),
  serverTime: z.string().datetime(),
  latestVersion: z.string(),
  mandatoryUpdate: z.boolean(),
});
export type DesktopHeartbeatResponse = z.infer<typeof DesktopHeartbeatResponseSchema>;

// Core HR Employee Contracts (Section 8.1)
export const CreateEmployeeSchema = z.object({
  employeeCode: z.string().min(1).max(30),
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
  email: z.string().email(),
  phone: z.string().max(30).optional(),
  nationalId: z.string().min(5).max(30), // Plaintext before application-layer AES-256-GCM
  dateOfBirth: z.string().optional(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
  joiningDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  branchId: z.string().uuid().optional(),
  departmentId: z.string().uuid().optional(),
  designationId: z.string().uuid().optional(),
  managerId: z.string().uuid().optional(),
  baseSalary: z.number().positive(),
  status: z.enum(['ACTIVE', 'ON_LEAVE', 'PROBATION', 'TERMINATED', 'RESIGNED']).default('ACTIVE'),
});
export type CreateEmployee = z.infer<typeof CreateEmployeeSchema>;

// Attendance Punch Sync Contract (Section 8.2)
export const PunchSyncItemSchema = z.object({
  deviceUserId: z.string().min(1),
  punchTime: z.string().datetime(),
  punchType: z.enum(['CHECK_IN', 'CHECK_OUT', 'BREAK_OUT', 'BREAK_IN', 'UNKNOWN']).default('UNKNOWN'),
});

export const SyncDevicePunchesSchema = z.object({
  deviceId: z.string().uuid(),
  punches: z.array(PunchSyncItemSchema).min(1).max(1000),
  cursorIndex: z.number().int().nonnegative(),
});
export type SyncDevicePunches = z.infer<typeof SyncDevicePunchesSchema>;

// Leave Request Contract (Section 8.3)
export const CreateLeaveRequestSchema = z.object({
  employeeId: z.string().uuid(),
  leaveTypeId: z.string().uuid(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  isHalfDay: z.boolean().default(false),
  daysCount: z.number().positive(),
  reason: z.string().min(1),
});
export type CreateLeaveRequest = z.infer<typeof CreateLeaveRequestSchema>;

// Payroll Lock & Run Contract (Section 8.4)
export const ExecutePayrollRunSchema = z.object({
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2020).max(2050),
});
export type ExecutePayrollRun = z.infer<typeof ExecutePayrollRunSchema>;

// Recruitment & Scoring Contracts (Section 8.5)
export const CandidateScoringCriteriaSchema = z.object({
  hardSkillsMatch: z.number().min(0).max(1),
  softSkillsMatch: z.number().min(0).max(1),
  experienceYears: z.number().nonnegative(),
  targetExperienceYears: z.number().positive(),
  educationTier: z.number().int().min(1).max(5), // 1 = High School, 2 = Associate, 3 = Bachelor, 4 = Master, 5 = PhD
  targetEducationTier: z.number().int().min(1).max(5),
  knockedOut: z.boolean().default(false),
  knockoutReason: z.string().optional(),
});
export type CandidateScoringCriteria = z.infer<typeof CandidateScoringCriteriaSchema>;
