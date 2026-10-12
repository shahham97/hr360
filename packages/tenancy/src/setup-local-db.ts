import mysql from 'mysql2/promise';
import fs from 'node:fs';
import path from 'node:path';
import { PasswordHasher } from '@hr360/crypto-audit';

async function migrateLocalDb() {
  console.log('Connecting to local XAMPP MySQL database hr360...');
  const conn = await mysql.createConnection({
    host: '127.0.0.1',
    port: 3306,
    user: 'root',
    password: '',
    database: 'hr360',
    multipleStatements: true,
  });

  console.log('Connected! Executing migrations/master/0001_init.sql...');
  const ddlPath = path.resolve(process.cwd(), 'migrations/master/0001_init.sql');
  const ddl = fs.readFileSync(ddlPath, 'utf8');

  await conn.query(ddl);
  console.log('Master schema applied successfully.');

  // Seed initial Super Admin if not present
  const [staffRows] = await conn.query<any[]>(
    'SELECT id FROM platform_staff WHERE email = ?;',
    ['superadmin@hr360.local']
  );

  if (staffRows.length === 0) {
    const adminPasswordHash = await PasswordHasher.hashPassword('Admin123!Secure2026');
    await conn.query(
      `INSERT INTO platform_staff (id, email, password_hash, full_name, role, is_active)
       VALUES (UUID(), 'superadmin@hr360.local', ?, 'Platform Super Administrator', 'SUPER_ADMIN', TRUE);`,
      [adminPasswordHash]
    );
    console.log('Seeded Super Admin: superadmin@hr360.local (Password: Admin123!Secure2026)');
  }

  // Seed default Subscription Plan
  const [planRows] = await conn.query<any[]>(
    'SELECT id FROM plans WHERE code = ?;',
    ['ENTERPRISE_CORE']
  );

  if (planRows.length === 0) {
    await conn.query(
      `INSERT INTO plans (id, code, name, description, price_monthly, price_annual, max_employees, max_branches, max_installs, features, is_active)
       VALUES (UUID(), 'ENTERPRISE_CORE', 'HR360 Enterprise Core', 'Full core HR, biometric LAN bridge, exact decimal payroll', 150.0000, 1500.0000, 500, 10, 5, '{"ats": true, "biometrics": true, "payroll": true}', TRUE);`
    );
    console.log('Seeded default plan: ENTERPRISE_CORE');
  }

  // Seed initial baseline Release
  const [releaseRows] = await conn.query<any[]>(
    'SELECT id FROM releases WHERE version = ?;',
    ['1.0.0']
  );

  if (releaseRows.length === 0) {
    await conn.query(
      `INSERT INTO releases (id, version, channel, notes, download_url, sha256, is_mandatory)
       VALUES (UUID(), '1.0.0', 'stable', 'Production Windows x64 build', 'https://releases.hr360.local/builds/HR360-Setup-1.0.0.zip', 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', FALSE);`
    );
    console.log('Seeded initial release 1.0.0');
  }

  const [tables] = await conn.query<any[]>('SHOW TABLES;');
  const tableNames = tables.map((t) => Object.values(t)[0]);
  console.log('\nVerified tables created in hr360 database:');
  console.log(tableNames.join(', '));

  await conn.end();
  console.log('\nSetup completed successfully.');
}

migrateLocalDb().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
