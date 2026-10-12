const fs = require('fs');
const dotenv = fs.readFileSync('packages/db-master/.env', 'utf8');
process.env.DATABASE_URL = dotenv.match(/DATABASE_URL="([^"]+)"/)[1];

const { PrismaClient } = require('D:/HR360/packages/db-master/dist/index.js');
const { PasswordHasher } = require('D:/HR360/packages/crypto-audit/dist/index.js');

const prisma = new PrismaClient();

async function seedAdminUsers() {
  console.log('[Seed] Seeding Super Admin and Admin accounts...');

  const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD || 'SuperAdmin@HR360#2026!';
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@HR360#2026!';

  const superAdminHash = await PasswordHasher.hashPassword(superAdminPassword);
  const adminHash = await PasswordHasher.hashPassword(adminPassword);

  // 1. Super Admin
  const superAdmin = await prisma.platformStaff.upsert({
    where: { email: 'superadmin@hr360.local' },
    update: {
      passwordHash: superAdminHash,
      role: 'SUPER_ADMIN',
      fullName: 'Chief Super Administrator',
      isActive: true,
      totpEnabled: false,
    },
    create: {
      email: 'superadmin@hr360.local',
      passwordHash: superAdminHash,
      fullName: 'Chief Super Administrator',
      role: 'SUPER_ADMIN',
      isActive: true,
      totpEnabled: false,
    },
  });

  // 2. Regular Admin
  const admin = await prisma.platformStaff.upsert({
    where: { email: 'admin@hr360.local' },
    update: {
      passwordHash: adminHash,
      role: 'ADMIN',
      fullName: 'Operations Administrator',
      isActive: true,
      totpEnabled: false,
    },
    create: {
      email: 'admin@hr360.local',
      passwordHash: adminHash,
      fullName: 'Operations Administrator',
      role: 'ADMIN',
      isActive: true,
      totpEnabled: false,
    },
  });

  console.log('✅ [Seed Completed]');
  console.log('  Super Admin:', superAdmin.email, '(Role:', superAdmin.role, ')');
  console.log('  Admin:', admin.email, '(Role:', admin.role, ')');

  await prisma.$disconnect();
}

seedAdminUsers().catch(err => {
  console.error('[Seed Error]:', err);
  process.exit(1);
});
