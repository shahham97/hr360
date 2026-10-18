import { NextRequest } from 'next/server';
import { getMasterPrismaClient } from '@hr360/db-master';
import {
  EntitlementCrypto,
  SignedEntitlement,
  HR360_ENTITLEMENT_PRIVATE_KEY,
} from '@hr360/crypto-audit';

/**
 * Derives module permissions and hardware/employee limits for a plan tier
 */
export function getPlanEntitlementSpecs(planCode: string) {
  const code = (planCode || 'STARTER').toUpperCase();
  
  if (code === 'ENTERPRISE') {
    return {
      limits: {
        employees: 100000, // Unlimited
        terminals: 1,      // Requirement: "only 1 biometric device can be integrated for all plans"
        adminUsers: 50,
        storageMb: 100000,
      },
      modules: {
        dashboard: true,
        employees: true,
        attendance: true,
        leaves: true,
        payroll: true,
        payslipTemplate: true,
        certificates: true,
        performance: true,
        recruitment: true,
        system: true,
      },
    };
  }

  if (code === 'GROWTH' || code === 'SCALE') {
    return {
      limits: {
        employees: 250,
        terminals: 1,      // Requirement: "only 1 biometric device can be integrated for all plans"
        adminUsers: 10,
        storageMb: 25000,
      },
      modules: {
        dashboard: true,
        employees: true,
        attendance: true,
        leaves: true,
        payroll: true,
        payslipTemplate: true,
        certificates: true,
        performance: true,
        recruitment: false, // Recruitment gated to Enterprise
        system: true,
      },
    };
  }

  // STARTER Default
  return {
    limits: {
      employees: 50,
      terminals: 1,        // Requirement: "only 1 biometric device can be integrated for all plans"
      adminUsers: 3,
      storageMb: 5000,
    },
    modules: {
      dashboard: true,
      employees: true,
      attendance: true,
      leaves: true,
      payroll: true,
      payslipTemplate: false, // Advanced payslips gated
      certificates: false,    // Certificates gated
      performance: false,     // Performance gated
      recruitment: false,     // Recruitment gated
      system: true,
    },
  };
}

/**
 * Issues a cryptographically signed Ed25519 entitlement token for a tenant company
 */
export async function issueSignedEntitlement(companyId: string): Promise<{
  token: string;
  entitlement: SignedEntitlement;
}> {
  const prisma = getMasterPrismaClient();

  const company = await prisma.company.findUnique({
    where: { id: companyId },
    include: {
      tenant: true,
      tenantConnection: true,
      subscriptions: {
        include: { plan: true },
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  });

  if (!company) {
    throw new Error(`Company not found: ${companyId}`);
  }

  const activeSub = company.subscriptions[0];
  const planCode = activeSub?.plan?.code || 'STARTER';
  const tenantStatus = (company.status === 'ACTIVE' && (
    (company.tenantConnection && company.tenantConnection.status === 'ACTIVE') ||
    (company.tenant && company.tenant.status === 'ACTIVE') ||
    (!company.tenant && !company.tenantConnection)
  )) ? 'ACTIVE' : (company.status || 'PENDING');
  const specs = getPlanEntitlementSpecs(planCode);

  const now = new Date();
  const expiresAt = activeSub?.expiresAt || new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
  const graceDays = activeSub?.graceDays || 14;
  const graceUntil = new Date(expiresAt.getTime() + graceDays * 24 * 60 * 60 * 1000);

  const entitlement: SignedEntitlement = {
    companyId: company.id,
    planCode,
    status: tenantStatus,
    limits: {
      ...specs.limits,
      employees: activeSub?.plan?.maxEmployees || specs.limits.employees,
      terminals: 1, // Strictly 1 terminal for all plans per requirement
    },
    modules: specs.modules,
    serverTime: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    graceUntil: graceUntil.toISOString(),
  };

  const token = EntitlementCrypto.signEntitlement(
    entitlement,
    HR360_ENTITLEMENT_PRIVATE_KEY
  );

  return { token, entitlement };
}

/**
 * Server-side guard to verify that a tenant is authorized for a specific module or action
 */
export async function verifyTenantEntitlement(
  companyId: string,
  options?: {
    requiredModule?: keyof SignedEntitlement['modules'];
    checkEmployeeLimit?: boolean;
    currentEmployeeCount?: number;
    checkTerminalLimit?: boolean;
    currentTerminalCount?: number;
  }
): Promise<{ allowed: boolean; reason?: string; statusCode?: number; entitlement?: SignedEntitlement }> {
  const { entitlement } = await issueSignedEntitlement(companyId);

  // 1. Subscription / Tenant Status check
  if (entitlement.status !== 'ACTIVE') {
    return {
      allowed: false,
      reason: `Company account status is ${entitlement.status}. Please contact support or billing.`,
      statusCode: 403,
      entitlement,
    };
  }

  // 2. Expiration and Grace Period check
  const now = new Date();
  const graceDate = new Date(entitlement.graceUntil);
  if (now > graceDate) {
    return {
      allowed: false,
      reason: 'Subscription has expired and grace period ended. Please renew to continue.',
      statusCode: 402,
      entitlement,
    };
  }

  // 3. Module gating check
  if (options?.requiredModule) {
    const isModuleEnabled = entitlement.modules[options.requiredModule];
    if (!isModuleEnabled) {
      return {
        allowed: false,
        reason: `Module '${options.requiredModule}' is not available on the ${entitlement.planCode} plan. Upgrade required.`,
        statusCode: 403,
        entitlement,
      };
    }
  }

  // 4. Employee limit check
  if (options?.checkEmployeeLimit && options.currentEmployeeCount !== undefined) {
    if (options.currentEmployeeCount >= entitlement.limits.employees) {
      return {
        allowed: false,
        reason: `Employee limit of ${entitlement.limits.employees} reached for ${entitlement.planCode} plan. Upgrade required to add more employees.`,
        statusCode: 403,
        entitlement,
      };
    }
  }

  // 5. Terminal limit check (Strictly 1 biometric device for all plans)
  if (options?.checkTerminalLimit && options.currentTerminalCount !== undefined) {
    if (options.currentTerminalCount >= entitlement.limits.terminals) {
      return {
        allowed: false,
        reason: `Terminal limit reached. Only ${entitlement.limits.terminals} biometric device is permitted.`,
        statusCode: 403,
        entitlement,
      };
    }
  }

  return { allowed: true, entitlement };
}

/**
 * Server-side feature gate guard using the central Feature Catalog
 */
export async function requireFeature(
  companyId: string,
  featureKey: import('@hr360/schema').FeatureKey
): Promise<{
  allowed: boolean;
  reason?: string;
  statusCode?: number;
  entitlement?: SignedEntitlement;
  feature?: (typeof import('@hr360/schema').FEATURE_CATALOG)[import('@hr360/schema').FeatureKey];
}> {
  const { isFeatureAllowedForPlan, FEATURE_CATALOG } = await import('@hr360/schema');
  const { entitlement } = await issueSignedEntitlement(companyId);

  if (entitlement.status !== 'ACTIVE') {
    return {
      allowed: false,
      reason: `Company account status is ${entitlement.status}. Please contact support or billing.`,
      statusCode: 403,
      entitlement,
    };
  }

  const now = new Date();
  const graceDate = new Date(entitlement.graceUntil);
  if (now > graceDate) {
    return {
      allowed: false,
      reason: 'Subscription has expired and grace period ended. Please renew to continue.',
      statusCode: 402,
      entitlement,
    };
  }

  const allowed = isFeatureAllowedForPlan(entitlement.planCode, featureKey);
  const meta = FEATURE_CATALOG[featureKey];

  if (!allowed) {
    return {
      allowed: false,
      reason: `Feature '${meta ? meta.name : featureKey}' requires an upgrade to ${meta ? meta.minPlan : 'a higher'} plan. Current plan is ${entitlement.planCode}.`,
      statusCode: 403,
      entitlement,
      feature: meta,
    };
  }

  return { allowed: true, entitlement, feature: meta };
}
