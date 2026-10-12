import readline from 'node:readline/promises';
import { getMasterPrismaClient } from '@hr360/db-master';
import { PasswordHasher } from '@hr360/crypto-audit';

/**
 * One-time CLI Bootstrap Command for Initial Super Administrator
 * Complies with Section 2.3: Zero seeded default passwords.
 */
async function bootstrapSuperAdmin() {
  const prisma = getMasterPrismaClient();

  const email = process.env.SUPER_ADMIN_EMAIL || 'superadmin@hr360.local';
  let password = process.env.SUPER_ADMIN_INITIAL_PASSWORD;

  const existing = await prisma.platformStaff.findUnique({
    where: { email },
  });

  if (existing) {
    console.log(`[INFO] Super Administrator already initialized: ${email}`);
    process.exit(0);
  }

  if (!password) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    console.log(`\n=== HR360 Super Administrator Bootstrap ===`);
    console.log(`Setting up initial Super Administrator account for: ${email}`);
    password = await rl.question('Enter strong password for Super Administrator (min 12 chars): ');
    rl.close();
  }

  if (!password || password.length < 12) {
    console.error('[ERROR] Password must be at least 12 characters.');
    process.exit(1);
  }

  const passwordHash = await PasswordHasher.hashPassword(password);
  await prisma.platformStaff.create({
    data: {
      email,
      passwordHash,
      fullName: 'Super Administrator',
      role: 'SUPER_ADMIN',
      isActive: true,
      totpEnabled: false,
    },
  });

  console.log(`[SUCCESS] Initial Super Administrator created successfully: ${email}`);
  process.exit(0);
}

bootstrapSuperAdmin().catch((err) => {
  console.error('[ERROR] Bootstrap failed:', err.message);
  process.exit(1);
});
