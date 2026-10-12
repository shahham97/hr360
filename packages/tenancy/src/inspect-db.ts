import mysql from 'mysql2/promise';

async function inspectCompanies() {
  const conn = await mysql.createConnection({
    host: '127.0.0.1',
    port: 3306,
    user: 'root',
    password: '',
    database: 'hr360',
  });

  const [dbs] = await conn.query("SHOW DATABASES LIKE 'tenant_%'");
  console.log('Databases matching tenant_%:', dbs);

  const [companies] = await conn.query("SELECT id, name, slug FROM companies");
  console.log('Companies:', companies);

  const [tenants] = await conn.query("SELECT id, company_id, database_name, status FROM tenants");
  console.log('Tenants:', tenants);

  const [tenantTables] = await conn.query("SHOW TABLES FROM tenant_webbuggs");
  console.log('Tables in tenant_webbuggs:', tenantTables);

  const { PasswordHasher } = await import('@hr360/crypto-audit');
  const [users] = await conn.query<any[]>("SELECT email, password_hash FROM company_users WHERE email = 'developerforhirre@gmail.com'");
  if (users.length > 0) {
    console.log('User found:', users[0].email, 'Hash length:', users[0].password_hash?.length);
    const testMatch = await PasswordHasher.verifyPassword(users[0].password_hash, 'Password123!');
    console.log('Password123! matches?', testMatch);
  }

  await conn.end();
}

inspectCompanies().catch(console.error);
