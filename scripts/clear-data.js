const dotenv = require('fs').readFileSync('packages/db-master/.env','utf8');
process.env.DATABASE_URL = dotenv.match(/DATABASE_URL="([^"]+)"/)[1];

const { PrismaClient } = require('D:/HR360/packages/db-master/dist/index.js');
const prisma = new PrismaClient();

async function run() {
  try {
    const a = await prisma.masterAuditLog.deleteMany({}).catch(() => ({ count: 0 }));
    const b = await prisma.downloadEvent.deleteMany({});
    const c = await prisma.lead.deleteMany({});
    const d = await prisma.session.deleteMany({}).catch(() => ({ count: 0 }));
    const e = await prisma.platformStaff.deleteMany({}).catch(() => ({ count: 0 }));
    const f = await prisma.company.deleteMany({});
    const g = await prisma.registration.deleteMany({});
    console.log('Cleared:');
    console.log('  masterAuditLog:', a.count);
    console.log('  downloadEvents:', b.count);
    console.log('  leads:', c.count);
    console.log('  sessions:', d.count);
    console.log('  platformStaff (companies staff):', e.count);
    console.log('  companies:', f.count);
    console.log('  registrations:', g.count);
    console.log('✅ DB CLEANED - Plans, releases, admin accounts preserved.');
  } catch(err) {
    console.error('Error:', err.message);
    console.error(err);
  }
  await prisma.$disconnect();
}
run();
