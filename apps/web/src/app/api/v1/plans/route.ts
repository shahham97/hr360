export const runtime = 'nodejs';
// @ROUTE_EXEMPT: PUBLIC_PLANS_CATALOG - Public subscription tiers and pricing
import { NextRequest } from 'next/server';
import { getMasterPrismaClient } from '@hr360/db-master';
import { apiError, apiSuccess, createRequestId } from '@/lib/api-response';

const FALLBACK_PLANS = [
  {
    id: 'plan_starter',
    code: 'STARTER',
    name: 'Starter Tier',
    description: 'Ideal for smaller organizations starting automated attendance and payroll.',
    priceMonthly: 99,
    priceAnnual: 79,
    priceLifetime: 899,
    maxEmployees: 50,
    maxBranches: 1,
    maxInstalls: 1,
    features: [
      'Up to 50 Active Employees',
      'Encrypted Local SQLCipher AES-256 Vault',
      '1 Biometric Device Connection (ZKTeco / Hikvision)',
      'Standard Leave & Holiday Management',
      'Pakistan Tax & EOBI Basic Reports',
    ],
  },
  {
    id: 'plan_growth',
    code: 'GROWTH',
    name: 'Growth & Scale',
    description: 'For mid-size enterprises requiring department management and advanced payroll.',
    priceMonthly: 179,
    priceAnnual: 149,
    priceLifetime: 1699,
    maxEmployees: 250,
    maxBranches: 5,
    maxInstalls: 1,
    features: [
      'Up to 250 Active Employees',
      'Encrypted Local SQLCipher AES-256 Vault',
      '1 Biometric Device Connection',
      'Multi-Department & Branch Scoping',
      'Full Statutory Decimal Payroll Engine & Bank CSV',
      'Payslip & Certificate Attestation Designer',
      'Recruitment ATS with Blind Screening',
    ],
  },
  {
    id: 'plan_enterprise',
    code: 'ENTERPRISE',
    name: 'Enterprise Core',
    description: 'Comprehensive human capital management for large-scale operations with unlimited headcount.',
    priceMonthly: 249,
    priceAnnual: 199,
    priceLifetime: 2399,
    maxEmployees: 999999,
    maxBranches: 99,
    maxInstalls: 1,
    features: [
      'Unlimited Active Employees & Headcount',
      'Encrypted Local SQLCipher AES-256 Vault',
      '1 Biometric Device Connection',
      'Multi-Tier Approval Hierarchies',
      'Custom AES-256 Envelope KMS Encryption',
      'Priority Technical Support',
    ],
  },
];

export async function GET(req: NextRequest) {
  const requestId = createRequestId();
  try {
    const prisma = getMasterPrismaClient();
    const plans = await prisma.plan.findMany({
      where: { isActive: true },
      orderBy: { priceMonthly: 'asc' },
    });

    if (!plans || plans.length === 0) {
      return apiSuccess(FALLBACK_PLANS, requestId);
    }

    const result = plans.map((p: any) => {
      let features: string[] = [];
      try {
        features = JSON.parse(p.features);
      } catch {
        features = [p.features];
      }

      return {
        id: p.id,
        code: p.code,
        name: p.name,
        description: p.description,
        priceMonthly: Number(p.priceMonthly),
        priceAnnual: Number(p.priceAnnual),
        priceLifetime: Number((p as any).priceLifetime || 899),
        maxEmployees: p.maxEmployees,
        maxBranches: p.maxBranches,
        maxInstalls: p.maxInstalls,
        features,
      };
    });

    return apiSuccess(result, requestId);
  } catch (err: any) {
    // Graceful fallback to guarantee page availability
    return apiSuccess(FALLBACK_PLANS, requestId);
  }
}

import { authenticateStaff } from '@/lib/auth-service';

export async function PUT(req: NextRequest) {
  const requestId = createRequestId();
  const auth = await authenticateStaff(req);

  if (!auth.success) {
    return apiError('FORBIDDEN', auth.error, auth.statusCode, undefined, requestId);
  }

  try {
    const body = await req.json();
    const { code, id, priceMonthly, priceAnnual, priceLifetime, maxEmployees, name, description } = body;
    const targetCode = code || (id?.startsWith('plan_') ? id.replace('plan_', '').toUpperCase() : undefined);

    if (!targetCode) {
      return apiError('BAD_REQUEST', 'Plan code is required.', 400, undefined, requestId);
    }

    const prisma = getMasterPrismaClient();
    const updated = await prisma.plan.update({
      where: { code: targetCode },
      data: {
        ...(name ? { name } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(priceMonthly !== undefined ? { priceMonthly } : {}),
        ...(priceAnnual !== undefined ? { priceAnnual } : {}),
        ...(priceLifetime !== undefined ? { priceLifetime } : {}),
        ...(maxEmployees !== undefined ? { maxEmployees } : {}),
      },
    });

    return apiSuccess(
      {
        code: updated.code,
        name: updated.name,
        priceMonthly: Number(updated.priceMonthly),
        priceAnnual: Number(updated.priceAnnual),
        priceLifetime: Number((updated as any).priceLifetime),
        message: `Plan ${updated.code} pricing updated successfully in master database.`,
      },
      requestId
    );
  } catch (err: any) {
    return apiError('INTERNAL_ERROR', err.message, 500, undefined, requestId);
  }
}
