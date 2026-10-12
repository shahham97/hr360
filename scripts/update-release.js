const dotenv = require('fs').readFileSync('packages/db-master/.env','utf8');
process.env.DATABASE_URL = dotenv.match(/DATABASE_URL="([^"]+)"/)[1];
const { PrismaClient } = require('D:/HR360/packages/db-master/dist/index.js');
const prisma = new PrismaClient();
prisma.release.updateMany({
  where: { channel: 'stable' },
  data: {
    sha256: 'a29f159c7cbb84c66e6de014499290fa583685b0222d05416a08bd29cb6f329b',
    downloadUrl: '/builds/HR360-Setup-1.0.0.zip'
  }
}).then(r => {
  console.log('Release records updated:', r.count);
  return prisma.$disconnect();
}).catch(e => { console.error(e); prisma.$disconnect(); });
