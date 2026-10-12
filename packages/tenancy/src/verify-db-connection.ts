import { getMasterPrismaClient } from '@hr360/db-master';

async function checkConnection() {
  const prisma = getMasterPrismaClient();
  try {
    const staff = await prisma.platformStaff.findMany();
    console.log(`[PASS] Live Database Connected! Staff records: ${staff.length}`);
    if (staff.length > 0) {
      console.log(`       First user: ${staff[0]?.email} (${staff[0]?.role})`);
    }

    const plans = await prisma.plan.findMany();
    console.log(`[PASS] Plans found in hr360: ${plans.length}`);
    if (plans.length > 0) {
      console.log(`       Plan Code: ${plans[0]?.code} (${plans[0]?.name})`);
    }

    const releases = await prisma.release.findMany();
    console.log(`[PASS] Releases found: ${releases.length}`);
    if (releases.length > 0) {
      console.log(`       Release Version: ${releases[0]?.version}`);
    }
  } catch (error: any) {
    console.error('[FAIL] Database check failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

checkConnection();
