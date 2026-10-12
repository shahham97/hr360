import { getMasterPrismaClient } from '@hr360/db-master';
import mysql from 'mysql2/promise';
import path from 'node:path';
import { TenancyProvisioner } from './provisioner.js';
import { EnvelopeCrypto } from '@hr360/crypto-audit';

async function testProvision() {
  const prisma = getMasterPrismaClient();

  const reg = await prisma.registration.findFirst({
    where: { status: 'PENDING' },
  });

  if (!reg) {
    console.log('No PENDING registration found!');
    return;
  }

  console.log('Testing provision for registration:', reg.id, reg.companyName);

  const rootConn = await mysql.createConnection({
    host: '127.0.0.1',
    port: 3306,
    user: 'root',
    password: '',
    multipleStatements: true,
  });

  const migrationsDir = path.resolve(process.cwd(), 'migrations/tenant');
  console.log('Using migrationsDir:', migrationsDir);

  const provisioner = new TenancyProvisioner(prisma, rootConn, {
    dbHost: '127.0.0.1',
    dbPort: 3306,
    migrationsDir,
    cryptoEngine: new EnvelopeCrypto(),
  });

  const res = await provisioner.provisionCompany(reg.id);
  console.log('Provision result:', JSON.stringify(res, null, 2));

  await rootConn.end();
  await prisma.$disconnect();
}

testProvision().catch(console.error);
