import mysql from 'mysql2/promise';

async function resetFailedRegistrations() {
  const conn = await mysql.createConnection({
    host: '127.0.0.1',
    port: 3306,
    user: 'root',
    password: '',
    database: 'hr360',
  });

  const [allRows] = await conn.query('SELECT id, company_name, admin_email, status, rejection_reason FROM registrations');
  console.log('[REGISTRATIONS IN DB]:', JSON.stringify(allRows, null, 2));

  const [res] = await conn.query(
    "UPDATE registrations SET status = 'PENDING', rejection_reason = NULL WHERE status != 'ACTIVE';"
  );

  console.log('[SUCCESS] Reset registrations back to PENDING:', res);
  await conn.end();
}

resetFailedRegistrations().catch(console.error);
