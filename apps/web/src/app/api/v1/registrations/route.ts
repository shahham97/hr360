export const runtime = 'nodejs';
// @ROUTE_EXEMPT: PUBLIC_REGISTRATION_FLOW - Public company onboarding flow
import { NextRequest } from 'next/server';
import { CompanyRegistrationRequestSchema } from '@hr360/schema';
import { PasswordHasher } from '@hr360/crypto-audit';
import { getMasterPrismaClient } from '@hr360/db-master';
import { apiError, apiSuccess, createRequestId } from '@/lib/api-response';

export async function POST(req: NextRequest) {
  const requestId = createRequestId();

  try {
    const json = await req.json();
    const parsed = CompanyRegistrationRequestSchema.safeParse(json);

    if (!parsed.success) {
      return apiError(
        'BAD_REQUEST',
        'Validation failed for company registration.',
        400,
        { errors: parsed.error.flatten().fieldErrors },
        requestId
      );
    }

    const {
      companyName,
      adminEmail,
      adminPassword,
      adminFullName,
      phone,
      country,
      estimatedEmployees,
    } = parsed.data;

    const prisma = getMasterPrismaClient();

    // Check if registration with same admin email already exists
    const existing = await prisma.registration.findFirst({
      where: {
        adminEmail,
        status: { in: ['PENDING', 'APPROVED', 'PROVISIONING', 'ACTIVE'] },
      },
    });

    if (existing) {
      return apiError(
        'CONFLICT',
        'An active or pending registration already exists for this email address.',
        409,
        undefined,
        requestId
      );
    }

    // Hash admin password using Argon2id
    const adminPasswordHash = await PasswordHasher.hashPassword(adminPassword);

    const registration = await prisma.registration.create({
      data: {
        companyName,
        adminEmail,
        adminPasswordHash,
        adminFullName,
        phone,
        country,
        estimatedEmployees,
        selectedPlanTier: parsed.data.selectedPlanTier || 'STARTER',
        selectedInterval: parsed.data.selectedInterval || 'MONTHLY',
        status: 'PENDING',
      },
    });

    return apiSuccess(
      {
        registrationId: registration.id,
        status: registration.status,
        companyName: registration.companyName,
        adminEmail: registration.adminEmail,
        message: 'Your registration request has been submitted for verification. Please contact support/sales.',
      },
      requestId,
      201
    );
  } catch (err: any) {
    return apiError('INTERNAL_ERROR', err.message || 'Internal server error', 500, undefined, requestId);
  }
}
