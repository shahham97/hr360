import { getMasterPrismaClient } from '@hr360/db-master';

/**
 * Idempotent, Non-Destructive Production Master Database Seeder
 * Populates:
 * 1. Subscription Plans (Starter, Growth, Enterprise)
 * 2. Feature Flags / Capabilities Matrix
 * 3. Primary Database Cluster Registry
 * 4. Known Releases and Attestations
 * Zero demo accounts, zero customer data, zero hardcoded passwords.
 */
export async function seedProductionMaster() {
  const prisma = getMasterPrismaClient();
  console.log('[SEED] Connecting to Master Database...');

  // 1. Seed Subscription Plans
  const plans = [
    {
      id: 'plan_starter',
      code: 'STARTER',
      name: 'Starter Tier',
      description: 'Core attendance, payroll calculations, and employee administration.',
      priceMonthly: 99.0,
      priceAnnual: 79.0,
      priceLifetime: 899.0,
      maxEmployees: 50,
      maxBranches: 1,
      maxInstalls: 1,
      features: JSON.stringify([
        'feature:dashboard:core',
        'feature:employees:directory',
        'feature:attendance:logs',
        'feature:attendance:biometric_sync',
        'feature:leave:single_level',
        'feature:payroll:statutory_engine',
        'feature:payroll:standard_payslip',
        'feature:audit:view',
        'feature:system:backup_basic',
      ]),
    },
    {
      id: 'plan_growth',
      code: 'GROWTH',
      name: 'Growth Tier',
      description: 'Extended capabilities including payslip designer, asset management, and self-service.',
      priceMonthly: 179.0,
      priceAnnual: 149.0,
      priceLifetime: 1699.0,
      maxEmployees: 250,
      maxBranches: 5,
      maxInstalls: 3,
      features: JSON.stringify([
        'feature:dashboard:core',
        'feature:employees:directory',
        'feature:attendance:logs',
        'feature:attendance:biometric_sync',
        'feature:leave:single_level',
        'feature:payroll:statutory_engine',
        'feature:payroll:standard_payslip',
        'feature:audit:view',
        'feature:system:backup_basic',
        'feature:payroll:custom_designer',
        'feature:certificates:library',
        'feature:inventory:tracking',
        'feature:performance:basic',
        'feature:ess:portal',
        'feature:finance:claims_advances',
        'feature:attendance:rosters',
        'feature:reports:standard',
        'feature:workflow:two_level',
        'feature:vault:documents',
      ]),
    },
    {
      id: 'plan_enterprise',
      code: 'ENTERPRISE',
      name: 'Enterprise Tier',
      description: 'Full organizational suite with advanced workflows, multi-entity, and dedicated placement.',
      priceMonthly: 249.0,
      priceAnnual: 199.0,
      priceLifetime: 2399.0,
      maxEmployees: 999999,
      maxBranches: 99,
      maxInstalls: 10,
      features: JSON.stringify([
        'feature:dashboard:core',
        'feature:employees:directory',
        'feature:attendance:logs',
        'feature:attendance:biometric_sync',
        'feature:leave:single_level',
        'feature:payroll:statutory_engine',
        'feature:payroll:standard_payslip',
        'feature:audit:view',
        'feature:system:backup_basic',
        'feature:payroll:custom_designer',
        'feature:certificates:library',
        'feature:inventory:tracking',
        'feature:performance:basic',
        'feature:ess:portal',
        'feature:finance:claims_advances',
        'feature:attendance:rosters',
        'feature:reports:standard',
        'feature:workflow:two_level',
        'feature:vault:documents',
        'feature:recruitment:ats',
        'feature:performance:okr_360',
        'feature:workflow:custom_engine',
        'feature:entity:multi_branch',
        'feature:payroll:multi_country',
        'feature:analytics:anomalies',
        'feature:integrations:api_webhooks',
        'feature:security:sso',
        'feature:whitelabel:custom_brand',
        'feature:placement:dedicated_db',
      ]),
    },
  ];

  for (const plan of plans) {
    await prisma.plan.upsert({
      where: { code: plan.code },
      create: {
        id: plan.id,
        code: plan.code,
        name: plan.name,
        description: plan.description,
        priceMonthly: plan.priceMonthly,
        priceAnnual: plan.priceAnnual,
        priceLifetime: plan.priceLifetime,
        maxEmployees: plan.maxEmployees,
        maxBranches: plan.maxBranches,
        maxInstalls: plan.maxInstalls,
        features: plan.features,
        isActive: true,
      },
      update: {
        name: plan.name,
        description: plan.description,
        priceMonthly: plan.priceMonthly,
        priceAnnual: plan.priceAnnual,
        priceLifetime: plan.priceLifetime,
        maxEmployees: plan.maxEmployees,
        maxBranches: plan.maxBranches,
        maxInstalls: plan.maxInstalls,
        features: plan.features,
        isActive: true,
      },
    });
    console.log(`[SEED] Verified Plan: ${plan.code}`);
  }

  // 2. Seed Primary Cluster Registry
  const clusterLabel = 'primary-cluster-01';
  const existingCluster = await prisma.dbProviderAccount.findUnique({
    where: { label: clusterLabel },
  });

  if (!existingCluster) {
    await prisma.dbProviderAccount.create({
      data: {
        label: clusterLabel,
        region: 'ap-northeast-1',
        capacity: 100,
        status: 'ACTIVE',
        notes: 'Default serverless database cluster registry entry',
      },
    });
    console.log(`[SEED] Created Cluster Registry: ${clusterLabel}`);
  }

  // 3. Seed Production Release Record
  const v1Release = await prisma.release.findUnique({
    where: { version: '1.0.0' },
  });

  if (!v1Release) {
    await prisma.release.create({
      data: {
        version: '1.0.0',
        channel: 'stable',
        notes: 'Initial production stable release. Includes Employee Directory, Attendance Synchronization, Payroll Calculation Engine, Template Designers, Inventory Management, and System Backup facilities.',
        downloadUrl: '/api/v1/download/request',
        sha256: 'e4994c7421c357020fd37996a525544bd97ddea944e52423dda2ebc66fbc6c9e',
        isMandatory: false,
        minVersion: '1.0.0',
      },
    });
    console.log('[SEED] Registered Production Release: 1.0.0');
  }

  console.log('[SEED] Production Master Database seeding completed successfully.');
}

if (require.main === module) {
  seedProductionMaster()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[SEED_ERROR]', err);
      process.exit(1);
    });
}
