export const runtime = 'nodejs';
// @ROUTE_EXEMPT: PLATFORM_ADMIN_REGISTRATIONS - Platform registration approval pipeline
import { NextRequest } from 'next/server';
import crypto from 'node:crypto';
import { RegistrationActionSchema, generateSafeSlug } from '@hr360/schema';
import { getMasterPrismaClient } from '@hr360/db-master';
import { apiError, apiSuccess, createRequestId } from '@/lib/api-response';
import { authenticateStaff } from '@/lib/auth-service';
import { KmsEnvelopeService } from '@/lib/kms-envelope';

export async function GET(req: NextRequest) {
  const requestId = createRequestId();
  const auth = await authenticateStaff(req);

  if (!auth.success) {
    return apiError('FORBIDDEN', auth.error, auth.statusCode, undefined, requestId);
  }

  const prisma = getMasterPrismaClient();
  const registrations = await prisma.registration.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      companyName: true,
      adminEmail: true,
      adminFullName: true,
      phone: true,
      country: true,
      estimatedEmployees: true,
      status: true,
      rejectionReason: true,
      approvedAt: true,
      createdAt: true,
    },
  });

  return apiSuccess(registrations, requestId);
}

export async function POST(req: NextRequest) {
  const requestId = createRequestId();
  const auth = await authenticateStaff(req);

  if (!auth.success) {
    return apiError('FORBIDDEN', auth.error, auth.statusCode, undefined, requestId);
  }

  const staffId = auth.staff.staffId;

  try {
    const json = await req.json();
    const parsed = RegistrationActionSchema.safeParse(json);
    const { searchParams } = new URL(req.url);
    const registrationId = searchParams.get('id');

    if (!registrationId || !parsed.success) {
      return apiError('BAD_REQUEST', 'Missing registration ID or invalid action parameters.', 400, undefined, requestId);
    }

    const { action, reason, storageMode = 'CLOUD_DEDICATED', connectionString, providerAccountId, caCert } = parsed.data;
    const prisma = getMasterPrismaClient();

    const reg = await prisma.registration.findUnique({
      where: { id: registrationId },
    });

    if (!reg) {
      return apiError('NOT_FOUND', 'Registration not found.', 404, undefined, requestId);
    }

    if (action === 'REJECT') {
      const updated = await prisma.registration.update({
        where: { id: registrationId },
        data: {
          status: 'REJECTED',
          rejectionReason: reason || 'Registration rejected by administrator.',
        },
      });

      return apiSuccess({ id: updated.id, status: updated.status }, requestId);
    }

    const kms = new KmsEnvelopeService();
    const clusterMgr = new (await import('@/lib/tenant-cluster-manager')).TenantClusterManager(kms);

    let hostFingerprint = '';
    let encryptedConnection = '';

    if (storageMode === 'CLOUD_DEDICATED') {
      if (!connectionString) {
        return apiError(
          'BAD_REQUEST',
          'A valid cloud database connection string is required to approve in CLOUD_DEDICATED storage mode.',
          400,
          undefined,
          requestId
        );
      }

      // Test database connectivity, SSRF, TLS, and permissions (with optional CA cert)
      const testRes = await clusterMgr.testConnection(connectionString, caCert);
      if (!testRes.ok || !testRes.hostFingerprint) {
        return apiError(
          'BAD_REQUEST',
          `Target cloud cluster validation failed: ${testRes.error}`,
          400,
          undefined,
          requestId
        );
      }

      // Check whether this host fingerprint is already in use by another company
      const existingConn = await prisma.tenantDbConnection.findFirst({
        where: { hostFingerprint: testRes.hostFingerprint },
      });
      if (existingConn) {
        return apiError(
          'CONFLICT',
          'Target cluster is already allocated to another tenant. Each company must possess a dedicated, isolated database.',
          409,
          undefined,
          requestId
        );
      }

      // Automatically and idempotently provision dedicated tenant schema and initial company admin
      await clusterMgr.provisionDedicatedCluster(
        connectionString,
        {
          email: reg.adminEmail,
          fullName: reg.adminFullName,
          passwordHash: reg.adminPasswordHash,
        },
        caCert
      );

      hostFingerprint = testRes.hostFingerprint;
      encryptedConnection = clusterMgr.encryptConnectionString(connectionString, caCert);
    }

    // Generate KMS-wrapped DEK for local encryption / emergency lease
    const rawDek = kms.generateDek();
    const wrappedDek = kms.wrapDek(rawDek);
    const licenseKey = kms.generateLicenseKey();
    const slugSuffix = crypto.randomBytes(3).toString('hex');
    const companySlug = generateSafeSlug(reg.companyName, slugSuffix);

    // Transactionally create Company, Tenant Connection, Access Policy, Admin User, and Subscription
    const result = await prisma.$transaction(async (tx: any) => {
      // 1. Update Registration
      await tx.registration.update({
        where: { id: registrationId },
        data: {
          status: 'ACTIVE',
          approvedAt: new Date(),
          approvedByStaffId: staffId,
        },
      });

      // 2. Create Company
      const company = await tx.company.create({
        data: {
          registrationId,
          name: reg.companyName,
          slug: companySlug,
          storageMode: storageMode as any,
          encryptedDek: wrappedDek,
          status: 'ACTIVE',
          licenseKey,
          activatedAt: new Date(),
        },
      });

      // 3. Create TenantDbConnection for CLOUD_DEDICATED mode
      if (storageMode === 'CLOUD_DEDICATED' && encryptedConnection) {
        await tx.tenantDbConnection.create({
          data: {
            companyId: company.id,
            providerAccountId: providerAccountId || null,
            encryptedConnection,
            hostFingerprint,
            status: 'ACTIVE',
            schemaVersion: 1,
            provisionedAt: new Date(),
            lastTestedAt: new Date(),
          },
        });
      }

      // 4. Create default CompanyAccessPolicy
      await tx.companyAccessPolicy.create({
        data: {
          companyId: company.id,
          allowSupportAccess: true,
          requireCustomerMfa: false,
          maxDevicesAllowed: 10,
        },
      });

      // 5. Create Company Admin User in Master DB for auth
      await tx.companyUser.create({
        data: {
          companyId: company.id,
          email: reg.adminEmail.toLowerCase(),
          fullName: reg.adminFullName,
          passwordHash: reg.adminPasswordHash,
          role: 'COMPANY_ADMIN',
          isActive: true,
        },
      });

      // 6. Provision Subscription Plan
      const planTier = reg.selectedPlanTier || 'STARTER';
      const plan = await tx.plan.findFirst({
        where: { code: planTier, isActive: true },
      }) || await tx.plan.findFirst({ where: { isActive: true } });

      if (plan) {
        const now = new Date();
        const expiresAt = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000); // 1 year default
        await tx.subscription.create({
          data: {
            companyId: company.id,
            planId: plan.id,
            interval: (reg.selectedInterval as any) || 'ANNUAL',
            startsAt: now,
            expiresAt,
            graceDays: 14,
            autoRenew: true,
          },
        });
      }

      return {
        companyId: company.id,
        companySlug: company.slug,
        licenseKey: company.licenseKey,
      };
    }, { timeout: 35000, maxWait: 15000 });

    return apiSuccess({
      registrationId,
      companyId: result.companyId,
      companySlug: result.companySlug,
      licenseKey: result.licenseKey,
      storageMode,
      status: 'ACTIVE',
      message: 'Registration approved and company database provisioned successfully.',
    }, requestId);
  } catch (err: any) {
    return apiError('INTERNAL_ERROR', err.message, 500, undefined, requestId);
  }
}
