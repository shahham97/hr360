export const runtime = 'nodejs';
// @ROUTE_EXEMPT: DESKTOP_LEASE - Desktop activation & ephemeral key release pipeline
import { NextRequest } from 'next/server';
import crypto from 'node:crypto';
import { z } from '@hr360/schema';
import { getMasterPrismaClient } from '@hr360/db-master';
import { EntitlementCrypto, HR360_ENTITLEMENT_PRIVATE_KEY } from '@hr360/crypto-audit';
import { apiError, apiSuccess, createRequestId } from '@/lib/api-response';
import { KmsEnvelopeService } from '@/lib/kms-envelope';

const LeaseRequestSchema = z.object({
  licenseKey: z.string().min(10),
  deviceId: z.string().min(8).max(64),
  deviceName: z.string().max(100).optional(),
  osVersion: z.string().max(100).optional(),
  appVersion: z.string().max(32),
  buildDigest: z.string().max(64).optional(),
});

export async function POST(req: NextRequest) {
  const requestId = createRequestId();
  const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1';

  try {
    const json = await req.json();
    const parsed = LeaseRequestSchema.safeParse(json);

    if (!parsed.success) {
      return apiError('BAD_REQUEST', 'Invalid lease request parameters.', 400, parsed.error.format(), requestId);
    }

    const { licenseKey, deviceId, deviceName, osVersion, appVersion, buildDigest } = parsed.data;
    const prisma = getMasterPrismaClient();

    // 1. Locate Company
    const company = await prisma.company.findFirst({
      where: {
        OR: [
          { licenseKey },
          { slug: licenseKey.toLowerCase() },
        ],
      },
      include: {
        subscriptions: {
          include: { plan: true },
          orderBy: { expiresAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!company) {
      // Record unknown license attempt
      await prisma.securityEvent.create({
        data: {
          deviceId,
          eventType: 'UNKNOWN_LICENSE_ATTEMPT',
          details: JSON.stringify({ licenseKey, ipAddress }),
          ipAddress,
        },
      });
      return apiError('NOT_FOUND', 'License key not recognized.', 404, undefined, requestId);
    }

    // 2. Check Company Status
    if (company.status !== 'ACTIVE') {
      await prisma.securityEvent.create({
        data: {
          companyId: company.id,
          deviceId,
          eventType: 'INACTIVE_COMPANY_LEASE_ATTEMPT',
          details: JSON.stringify({ status: company.status }),
          ipAddress,
        },
      });
      return apiError('TENANT_INACTIVE', `Company workspace is in ${company.status} status. Please contact support.`, 403, undefined, requestId);
    }

    if (!company.encryptedDek) {
      return apiError('INTERNAL_ERROR', 'Database encryption key not initialized for this company.', 500, undefined, requestId);
    }

    // 3. Verify Subscription
    const activeSub = company.subscriptions[0];
    const now = new Date();
    if (activeSub) {
      const gracePeriodEnd = new Date(activeSub.expiresAt.getTime() + (activeSub.graceDays || 0) * 24 * 60 * 60 * 1000);
      if (now > gracePeriodEnd) {
        return apiError('TENANT_EXPIRED', 'Company subscription has expired. Please renew your plan.', 403, undefined, requestId);
      }
    }

    const storageMode = company.storageMode || 'CLOUD_DEDICATED';

    // 4. Device Binding & Capacity Enforcement
    if (storageMode === 'LOCAL') {
      // Single-Device Binding Policy for LOCAL embedded SQLite mode
      const existingActiveLease = await prisma.licenseLease.findFirst({
        where: {
          companyId: company.id,
          isRevoked: false,
          expiresAt: { gt: now },
        },
      });

      if (existingActiveLease && existingActiveLease.deviceId !== deviceId) {
        await prisma.securityEvent.create({
          data: {
            companyId: company.id,
            deviceId,
            eventType: 'CONCURRENT_DEVICE_REJECTED',
            details: JSON.stringify({ activeDeviceId: existingActiveLease.deviceId, requestedDeviceId: deviceId }),
            ipAddress,
          },
        });
        return apiError(
          'FORBIDDEN',
          'License is already active on another workstation. Single-device license policy is in effect for local mode.',
          403,
          undefined,
          requestId
        );
      }
    } else {
      // CLOUD_DEDICATED thin-client mode: verify against max devices entitlement
      const policy = await prisma.companyAccessPolicy.findUnique({
        where: { companyId: company.id },
      });
      const maxDevices = policy?.maxDevicesAllowed ?? (activeSub?.plan?.maxInstalls || 10);

      const activeLeasesCount = await prisma.licenseLease.count({
        where: {
          companyId: company.id,
          isRevoked: false,
          expiresAt: { gt: now },
          deviceId: { not: deviceId },
        },
      });

      if (activeLeasesCount >= maxDevices) {
        return apiError(
          'FORBIDDEN',
          `Device quota reached (${activeLeasesCount}/${maxDevices} active workstations). Upgrade plan or revoke unused workstations in the portal.`,
          403,
          undefined,
          requestId
        );
      }
    }

    // 5. Database key resolution: NEVER send database key to desktop in CLOUD_DEDICATED mode
    let databaseKey: string | null = null;
    if (storageMode === 'LOCAL') {
      const kms = new KmsEnvelopeService();
      databaseKey = kms.unwrapDek(company.encryptedDek);
    }

    // 6. Generate Ephemeral Lease (24 hours validity)
    const leaseDurationHours = 24;
    const leaseExpiresAt = new Date(now.getTime() + leaseDurationHours * 60 * 60 * 1000);
    const leaseToken = crypto.randomUUID();

    // Revoke any old leases for this device and insert new lease
    await prisma.$transaction([
      prisma.licenseLease.updateMany({
        where: { companyId: company.id, deviceId, isRevoked: false },
        data: { isRevoked: true },
      }),
      prisma.licenseLease.create({
        data: {
          companyId: company.id,
          deviceId,
          leaseToken,
          expiresAt: leaseExpiresAt,
          ipAddress,
          appVersion,
          buildDigest: buildDigest || null,
          isRevoked: false,
        },
      }),
      // Upsert device install record
      prisma.deviceInstall.upsert({
        where: {
          companyId_deviceHash: {
            companyId: company.id,
            deviceHash: deviceId,
          },
        },
        create: {
          companyId: company.id,
          deviceHash: deviceId,
          deviceName: deviceName || null,
          osVersion: osVersion || null,
          appVersion,
          lastSeenAt: now,
        },
        update: {
          deviceName: deviceName || undefined,
          osVersion: osVersion || undefined,
          appVersion,
          lastSeenAt: now,
          isRevoked: false,
        },
      }),
    ]);

    // 7. Sign Asymmetric Ed25519 Entitlement Token
    const plan = activeSub?.plan;
    const entitlementToken = EntitlementCrypto.signEntitlement(
      {
        companyId: company.id,
        planCode: plan?.code || 'STARTER',
        status: company.status,
        limits: {
          employees: plan?.maxEmployees || 50,
          terminals: 5,
          adminUsers: 5,
          storageMb: 1024,
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
        serverTime: now.toISOString(),
        expiresAt: leaseExpiresAt.toISOString(),
        graceUntil: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      },
      HR360_ENTITLEMENT_PRIVATE_KEY
    );

    return apiSuccess({
      leaseToken,
      storageMode,
      databaseKey: storageMode === 'LOCAL' ? databaseKey : undefined,
      entitlementToken,
      expiresAt: leaseExpiresAt.toISOString(),
      company: {
        id: company.id,
        name: company.name,
        slug: company.slug,
        storageMode,
      },
    }, requestId);
  } catch (err: any) {
    return apiError('INTERNAL_ERROR', err.message || 'Failed to process license lease.', 500, undefined, requestId);
  }
}
