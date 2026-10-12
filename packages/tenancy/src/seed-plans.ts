import fs from 'node:fs';
import mysql from 'mysql2/promise';

async function seedPlans() {
  const ca = fs.readFileSync('D:/HR360/isrgrootx1.pem');
  const conn = await mysql.createConnection({
    host: 'gateway01.ap-northeast-1.prod.aws.tidbcloud.com',
    port: 4000,
    user: '2ZiFanR6Z4DyD1j.root',
    password: 'HKryUMm8cPcMlI6v',
    database: 'hr360',
    ssl: { ca, rejectUnauthorized: true }
  });

  const plans = [
    {
      id: 'plan_starter',
      code: 'STARTER',
      name: 'Starter Tier',
      description: 'Ideal for smaller organizations starting automated attendance and payroll.',
      priceMonthly: 99.00,
      priceAnnual: 79.00,
      priceLifetime: 899.00,
      maxEmployees: 50,
      maxBranches: 1,
      maxInstalls: 1, // Only 1 biometric device for all plans
      features: JSON.stringify([
        'Up to 50 Active Employees',
        'Dedicated Cloud Database Tenancy',
        '1 Biometric Device Connection (ZKTeco / Hikvision)',
        'Standard Leave & Holiday Management',
        'Pakistan Tax & EOBI Basic Reports'
      ])
    },
    {
      id: 'plan_growth',
      code: 'GROWTH',
      name: 'Growth & Scale',
      description: 'For mid-size enterprises requiring department management and advanced payroll.',
      priceMonthly: 179.00,
      priceAnnual: 149.00,
      priceLifetime: 1699.00,
      maxEmployees: 250,
      maxBranches: 5,
      maxInstalls: 1, // Only 1 biometric device for all plans
      features: JSON.stringify([
        'Up to 250 Active Employees',
        'Dedicated Cloud Database Tenancy',
        '1 Biometric Device Connection',
        'Multi-Department & Branch Scoping',
        'Full Statutory Decimal Payroll Engine & Bank CSV',
        'Payslip & Certificate Attestation Designer',
        'Recruitment ATS with Blind Screening'
      ])
    },
    {
      id: 'plan_enterprise',
      code: 'ENTERPRISE',
      name: 'Enterprise Core',
      description: 'Comprehensive human capital management for large-scale operations with unlimited headcount.',
      priceMonthly: 249.00,
      priceAnnual: 199.00,
      priceLifetime: 2399.00,
      maxEmployees: 999999,
      maxBranches: 99,
      maxInstalls: 1, // Only 1 biometric device for all plans
      features: JSON.stringify([
        'Unlimited Active Employees & Headcount',
        'Dedicated Cloud Database Tenancy',
        '1 Biometric Device Connection',
        'Multi-Tier Approval Hierarchies',
        'Custom AES-256 Envelope KMS Encryption',
        'Priority Technical Support'
      ])
    }
  ];

  for (const p of plans) {
    await conn.query(
      `INSERT INTO plans (id, code, name, description, price_monthly, price_annual, price_lifetime, max_employees, max_branches, max_installs, features, is_active, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE, NOW())
       ON DUPLICATE KEY UPDATE
         name = VALUES(name),
         description = VALUES(description),
         price_monthly = VALUES(price_monthly),
         price_annual = VALUES(price_annual),
         price_lifetime = VALUES(price_lifetime),
         max_employees = VALUES(max_employees),
         max_branches = VALUES(max_branches),
         max_installs = VALUES(max_installs),
         features = VALUES(features),
         updated_at = NOW();`,
      [p.id, p.code, p.name, p.description, p.priceMonthly, p.priceAnnual, p.priceLifetime, p.maxEmployees, p.maxBranches, p.maxInstalls, p.features]
    );
  }

  const [dbPlans] = await conn.query('SELECT code, name, price_monthly, price_annual, price_lifetime, max_installs FROM plans');
  console.log('Seeded Master DB Plans:', dbPlans);

  await conn.end();
}

seedPlans().catch(console.error);
