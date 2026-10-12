import test from 'node:test';
import assert from 'node:assert/strict';
import { PrismaClient } from '@prisma/client';

test('T2 Master Schema Extension Invariants', async () => {
  const prisma = new PrismaClient();

  // Verify that core HR business tables (employees, attendance, payroll, leaves) do NOT exist on the master database schema
  const forbiddenTables = [
    'employees',
    'attendance_records',
    'leave_balances',
    'leave_requests',
    'payroll_runs',
    'payroll_items',
    'salary_structures',
    'certificates',
    'performance_reviews',
    'candidates',
    'job_openings',
  ];

  for (const table of forbiddenTables) {
    const res = await prisma.$queryRawUnsafe<any[]>(
      `SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
      table
    );
    assert.equal(res.length, 0, `Forbidden tenant HR table '${table}' must NOT exist in the master database.`);
  }

  // Verify required control tables DO exist in master database
  const requiredControlTables = [
    'companies',
    'tenant_db_connections',
    'db_provider_accounts',
    'support_access_sessions',
    'support_access_logs',
    'company_access_policies',
  ];

  for (const table of requiredControlTables) {
    const res = await prisma.$queryRawUnsafe<any[]>(
      `SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
      table
    );
    assert.equal(res.length, 1, `Required control table '${table}' must exist in master database.`);
  }

  await prisma.$disconnect();
});
