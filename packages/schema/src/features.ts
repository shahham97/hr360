import { z } from 'zod';

/**
 * Feature Catalog & Permissions Matrix (P5.1 Single Source of Truth)
 * Rules:
 * - Every feature has a unique key.
 * - Minimum plan requirements: STARTER, GROWTH, ENTERPRISE.
 * - Deny by default: unassigned or unmapped features are locked for all.
 */

export const FeatureKeySchema = z.enum([
  // Common (All Plans: Starter, Growth, Enterprise)
  'feature:dashboard:core',
  'feature:employees:directory',
  'feature:attendance:logs',
  'feature:attendance:biometric_sync',
  'feature:leave:single_level',
  'feature:payroll:statutory_engine',
  'feature:payroll:standard_payslip',
  'feature:audit:view',
  'feature:system:backup_basic',
  'feature:support:ticket',

  // Growth (Adds to Starter)
  'feature:payroll:custom_designer',
  'feature:certificates:library',
  'feature:inventory:tracking',
  'feature:performance:basic',
  'feature:ess:portal',
  'feature:finance:claims_advances',
  'feature:attendance:rosters',
  'feature:reports:standard',
  'feature:compliance:calendar',
  'feature:workflow:two_level',
  'feature:vault:documents',
  'feature:notifications:email',
  'feature:backup:daily',
  'feature:security:mfa',

  // Enterprise (Adds to Growth)
  'feature:recruitment:ats',
  'feature:performance:okr_360',
  'feature:workflow:custom_engine',
  'feature:entity:multi_branch',
  'feature:payroll:multi_country',
  'feature:analytics:anomalies',
  'feature:integrations:api_webhooks',
  'feature:security:sso',
  'feature:security:ip_allowlist',
  'feature:whitelabel:custom_brand',
  'feature:placement:dedicated_db',
  'feature:support:priority',
]);

export type FeatureKey = z.infer<typeof FeatureKeySchema>;

export interface FeatureMetadata {
  key: FeatureKey;
  name: string;
  category: 'core' | 'attendance' | 'payroll' | 'talent' | 'governance' | 'enterprise';
  minPlan: 'STARTER' | 'GROWTH' | 'ENTERPRISE';
  description: string;
}

export const FEATURE_CATALOG: Record<FeatureKey, FeatureMetadata> = {
  'feature:dashboard:core': {
    key: 'feature:dashboard:core',
    name: 'Core KPI Dashboard',
    category: 'core',
    minPlan: 'STARTER',
    description: 'Workforce headcount, active shifts, and top-level organizational metrics.',
  },
  'feature:employees:directory': {
    key: 'feature:employees:directory',
    name: 'Employee Directory & Profiles',
    category: 'core',
    minPlan: 'STARTER',
    description: 'Centralized employee records, job profiles, and CSV import/export.',
  },
  'feature:attendance:logs': {
    key: 'feature:attendance:logs',
    name: 'Attendance Tracking',
    category: 'attendance',
    minPlan: 'STARTER',
    description: 'Daily clock-in/out logs, shift reconciliation, and manual regularizations.',
  },
  'feature:attendance:biometric_sync': {
    key: 'feature:attendance:biometric_sync',
    name: 'Biometric Hardware Synchronization',
    category: 'attendance',
    minPlan: 'STARTER',
    description: 'Automated terminal punch bridge (1 terminal on Starter, up to 10 on Enterprise).',
  },
  'feature:leave:single_level': {
    key: 'feature:leave:single_level',
    name: 'Leave Management (Single-Level)',
    category: 'core',
    minPlan: 'STARTER',
    description: 'Leave balance quotas, request submissions, and supervisor approval.',
  },
  'feature:payroll:statutory_engine': {
    key: 'feature:payroll:statutory_engine',
    name: 'Statutory Payroll Engine',
    category: 'payroll',
    minPlan: 'STARTER',
    description: 'Cent-precise statutory deductions, salary structures, and run locks.',
  },
  'feature:payroll:standard_payslip': {
    key: 'feature:payroll:standard_payslip',
    name: 'Standard Payslip Generation',
    category: 'payroll',
    minPlan: 'STARTER',
    description: 'Standard printable PDF salary slips with base compensation breakdown.',
  },
  'feature:audit:view': {
    key: 'feature:audit:view',
    name: 'Audit Trail Viewer',
    category: 'governance',
    minPlan: 'STARTER',
    description: 'Tamper-evident record of administrative actions and data modifications.',
  },
  'feature:system:backup_basic': {
    key: 'feature:system:backup_basic',
    name: 'Basic Workspace Backup',
    category: 'governance',
    minPlan: 'STARTER',
    description: 'On-demand encrypted data exports and local recovery packages.',
  },
  'feature:support:ticket': {
    key: 'feature:support:ticket',
    name: 'Standard Help Desk Support',
    category: 'core',
    minPlan: 'STARTER',
    description: 'In-app support ticket submission and assistance portal.',
  },

  // Growth Tier Features
  'feature:payroll:custom_designer': {
    key: 'feature:payroll:custom_designer',
    name: 'Payslip Designer & Custom Branding',
    category: 'payroll',
    minPlan: 'GROWTH',
    description: 'Custom logo integration, banner styles, color palettes, and custom typography.',
  },
  'feature:certificates:library': {
    key: 'feature:certificates:library',
    name: 'Certificates & Attestations Designer',
    category: 'talent',
    minPlan: 'GROWTH',
    description: 'Experience letters, salary attestations, and authentic certificates with logo branding.',
  },
  'feature:inventory:tracking': {
    key: 'feature:inventory:tracking',
    name: 'Asset & Inventory Management',
    category: 'core',
    minPlan: 'GROWTH',
    description: 'Hardware assignments, serial number tracking, asset conditions, and return audits.',
  },
  'feature:performance:basic': {
    key: 'feature:performance:basic',
    name: 'Basic Performance Reviews',
    category: 'talent',
    minPlan: 'GROWTH',
    description: 'Quarterly review milestones and employee appraisal scoring.',
  },
  'feature:ess:portal': {
    key: 'feature:ess:portal',
    name: 'Employee Self-Service Portal (PWA)',
    category: 'core',
    minPlan: 'GROWTH',
    description: 'Employee mobile web interface for payslip downloads and leave submissions.',
  },
  'feature:finance:claims_advances': {
    key: 'feature:finance:claims_advances',
    name: 'Loans, Advances & Expense Claims',
    category: 'payroll',
    minPlan: 'GROWTH',
    description: 'Employee salary advance requests and automated payroll installment deduction schedules.',
  },
  'feature:attendance:rosters': {
    key: 'feature:attendance:rosters',
    name: 'Shift Rosters & Overtime Engine',
    category: 'attendance',
    minPlan: 'GROWTH',
    description: 'Configurable shift timetables, night shift handling, and automated overtime calculations.',
  },
  'feature:reports:standard': {
    key: 'feature:reports:standard',
    name: 'Standard Reporting Center',
    category: 'governance',
    minPlan: 'GROWTH',
    description: 'Exportable headcount, attrition, tax register, and statutory compliance reports.',
  },
  'feature:compliance:calendar': {
    key: 'feature:compliance:calendar',
    name: 'Compliance Calendar & Due Dates',
    category: 'governance',
    minPlan: 'GROWTH',
    description: 'Automated notifications for tax deposit deadlines and statutory submission dates.',
  },
  'feature:workflow:two_level': {
    key: 'feature:workflow:two_level',
    name: 'Two-Level Approval Hierarchies',
    category: 'governance',
    minPlan: 'GROWTH',
    description: 'Dual sign-off for leave requests, expense reimbursements, and salary adjustments.',
  },
  'feature:vault:documents': {
    key: 'feature:vault:documents',
    name: 'Document Vault with Quotas',
    category: 'core',
    minPlan: 'GROWTH',
    description: 'Secure cloud repository for employment contracts, ID documents, and credentials.',
  },
  'feature:notifications:email': {
    key: 'feature:notifications:email',
    name: 'Automated Email Notifications',
    category: 'core',
    minPlan: 'GROWTH',
    description: 'Transactional email delivery for payslip distribution and approval alerts.',
  },
  'feature:backup:daily': {
    key: 'feature:backup:daily',
    name: 'Automated Daily Cloud Backups',
    category: 'governance',
    minPlan: 'GROWTH',
    description: 'Nightly encrypted database backups to secondary object storage.',
  },
  'feature:security:mfa': {
    key: 'feature:security:mfa',
    name: 'Multi-Factor Authentication (TOTP)',
    category: 'governance',
    minPlan: 'GROWTH',
    description: 'Two-step authentication for organization administrators and finance officers.',
  },

  // Enterprise Tier Features
  'feature:recruitment:ats': {
    key: 'feature:recruitment:ats',
    name: 'Recruitment & Applicant Tracking (ATS)',
    category: 'enterprise',
    minPlan: 'ENTERPRISE',
    description: 'Applicant scoring, blind screening, stage pipeline tracking, and hiring workflows.',
  },
  'feature:performance:okr_360': {
    key: 'feature:performance:okr_360',
    name: '360° Feedback & OKR Tracking',
    category: 'enterprise',
    minPlan: 'ENTERPRISE',
    description: 'Peer reviews, multi-rater appraisals, and organizational objective alignment.',
  },
  'feature:workflow:custom_engine': {
    key: 'feature:workflow:custom_engine',
    name: 'Custom Multi-Step Approval Engine',
    category: 'enterprise',
    minPlan: 'ENTERPRISE',
    description: 'Dynamic approval chains, delegation rules, and escalation timers.',
  },
  'feature:entity:multi_branch': {
    key: 'feature:entity:multi_branch',
    name: 'Multi-Branch & Multiple Legal Entities',
    category: 'enterprise',
    minPlan: 'ENTERPRISE',
    description: 'Consolidated reporting across separate branch subsidiaries and company entities.',
  },
  'feature:payroll:multi_country': {
    key: 'feature:payroll:multi_country',
    name: 'Multi-Country Statutory Packs',
    category: 'enterprise',
    minPlan: 'ENTERPRISE',
    description: 'UAE WPS file export, Saudi wage files, and regional tax calculation packs.',
  },
  'feature:analytics:anomalies': {
    key: 'feature:analytics:anomalies',
    name: 'Workforce Analytics & Anomaly Detection',
    category: 'enterprise',
    minPlan: 'ENTERPRISE',
    description: 'Ghost-employee checks, duplicate bank account detection, and overtime variance audits.',
  },
  'feature:integrations:api_webhooks': {
    key: 'feature:integrations:api_webhooks',
    name: 'REST API & Outgoing Webhooks',
    category: 'enterprise',
    minPlan: 'ENTERPRISE',
    description: 'Programmatic API tokens, rate-limited query scopes, and event webhooks.',
  },
  'feature:security:sso': {
    key: 'feature:security:sso',
    name: 'Single Sign-On (SSO / SAML / OAuth)',
    category: 'enterprise',
    minPlan: 'ENTERPRISE',
    description: 'Enterprise identity federation via Microsoft Azure AD and Google Workspace.',
  },
  'feature:security:ip_allowlist': {
    key: 'feature:security:ip_allowlist',
    name: 'Workstation IP Allow-listing',
    category: 'enterprise',
    minPlan: 'ENTERPRISE',
    description: 'Network-level perimeter lock restricting administrator access to authorized office IPs.',
  },
  'feature:whitelabel:custom_brand': {
    key: 'feature:whitelabel:custom_brand',
    name: 'White-Label Branding',
    category: 'enterprise',
    minPlan: 'ENTERPRISE',
    description: 'Custom portal theme colors, organization subdomains, and co-branded documents.',
  },
  'feature:placement:dedicated_db': {
    key: 'feature:placement:dedicated_db',
    name: 'Dedicated Isolated Database Placement',
    category: 'enterprise',
    minPlan: 'ENTERPRISE',
    description: 'Guaranteed physically dedicated database cluster for enterprise tenancy.',
  },
  'feature:support:priority': {
    key: 'feature:support:priority',
    name: 'Priority Technical Support & SLA',
    category: 'enterprise',
    minPlan: 'ENTERPRISE',
    description: 'Direct priority ticket routing with accelerated response SLA.',
  },
};

/**
 * Checks if a given plan tier has access to a feature key
 */
export function isFeatureAllowedForPlan(planTier: string, featureKey: FeatureKey): boolean {
  const meta = FEATURE_CATALOG[featureKey];
  if (!meta) return false;

  const tier = (planTier || 'STARTER').toUpperCase();
  if (tier === 'ENTERPRISE') return true;
  if (tier === 'GROWTH' || tier === 'SCALE') {
    return meta.minPlan === 'STARTER' || meta.minPlan === 'GROWTH';
  }
  return meta.minPlan === 'STARTER';
}
