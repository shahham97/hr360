const dotenv = require('fs').readFileSync('packages/db-master/.env', 'utf8');
process.env.DATABASE_URL = dotenv.match(/DATABASE_URL="([^"]+)"/)[1];
const { PrismaClient } = require('D:/HR360/packages/db-master/dist/index.js');
const prisma = new PrismaClient();

async function check() {
  const staff = await prisma.platformStaff.findMany({
    select: { id: true, email: true, role: true, isActive: true, fullName: true }
  });
  console.log('Current Platform Staff in DB:', staff);
  await prisma.$disconnect();
}
check();
