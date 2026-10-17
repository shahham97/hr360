import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import mysql from 'mysql2/promise';
import { DatabaseConnection, DatabaseMigrator } from '@hr360/local-core';
import { SqliteTenantServices } from './adapters/sqlite';
import { MysqlTenantServices } from './adapters/mysql';
import { initMysqlTenantSchema } from './adapters/mysql/schema';
import { ActorContext } from './types';

const TEST_DIR = path.resolve(__dirname, '../test-scratch');
const SQLITE_FILE = path.join(TEST_DIR, 'parity-test.db');
const TEST_KEY = 'test-secret-key-parity-32-chars-long!';

const MYSQL_CONFIG = {
  host: process.env.TEST_DB_HOST || process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.TEST_DB_PORT || process.env.DB_PORT || 3306),
  user: process.env.TEST_DB_USER || process.env.DB_USER || 'root',
  password: process.env.TEST_DB_PASSWORD || process.env.DB_PASSWORD || '',
  database: process.env.TEST_DB_NAME || 'test',
  ssl: process.env.TEST_DB_SSL === 'true' ? { rejectUnauthorized: true } : undefined,
};

test('T1 Storage Abstraction - Parity Test Suite (SQLite vs Cloud MySQL)', async (t) => {
  if (!fs.existsSync(TEST_DIR)) {
    fs.mkdirSync(TEST_DIR, { recursive: true });
  }
  if (fs.existsSync(SQLITE_FILE)) {
    fs.unlinkSync(SQLITE_FILE);
  }

  // 1. Setup SQLite Adapter
  const sqliteConn = new DatabaseConnection({
    dbPath: SQLITE_FILE,
    encryptionKey: TEST_KEY,
  });
  const migrator = new DatabaseMigrator(sqliteConn);
  migrator.migrate({ companyId: 'comp-parity-001', appVersion: '1.0.0' });
  const sqliteServices = new SqliteTenantServices(sqliteConn);

  // 2. Setup MySQL Adapter
  const mysqlConn = await mysql.createConnection(MYSQL_CONFIG);
  await initMysqlTenantSchema(mysqlConn);
  // Clear any existing test data from test schema
  await mysqlConn.query('DELETE FROM payroll_items');
  await mysqlConn.query('DELETE FROM payroll_runs');
  await mysqlConn.query('DELETE FROM salary_structures');
  await mysqlConn.query('DELETE FROM leave_requests');
  await mysqlConn.query('DELETE FROM leave_balances');
  await mysqlConn.query('DELETE FROM attendance_records');
  await mysqlConn.query('DELETE FROM employees');
  await mysqlConn.query('DELETE FROM local_audit_log');
  await mysqlConn.query('DELETE FROM local_users');

  const mysqlServices = new MysqlTenantServices(mysqlConn);

  const ctx: ActorContext = {
    companyId: 'comp-parity-001',
    userId: 'user-parity-admin',
    role: 'COMPANY_ADMIN',
  };

  let createdSqliteEmpId = '';
  let createdMysqlEmpId = '';

  await t.test('1. Employee Creation & Directory Parity', async () => {
    const employeeData = {
      employeeCode: 'EMP-PARITY-01',
      firstName: 'Tariq',
      lastName: 'Mehmood',
      email: 'tariq.mehmood@company.com',
      phone: '+92 300 1234567',
      department: 'Engineering',
      designation: 'Senior Architect',
      branch: 'Lahore HQ',
      employmentType: 'FULL_TIME' as const,
      baseSalaryMinor: 15000000, // PKR 150,000 in Paisa
      nationalId: '35201-1234567-1',
      dateOfBirth: '1990-05-15',
      gender: 'MALE',
      joiningDate: '2024-01-01',
    };

    const sqliteEmp = await sqliteServices.employee.create(ctx, employeeData);
    const mysqlEmp = await mysqlServices.employee.create(ctx, employeeData);

    createdSqliteEmpId = sqliteEmp.id;
    createdMysqlEmpId = mysqlEmp.id;

    assert.equal(sqliteEmp.employeeCode, mysqlEmp.employeeCode);
    assert.equal(sqliteEmp.firstName, mysqlEmp.firstName);
    assert.equal(sqliteEmp.lastName, mysqlEmp.lastName);
    assert.equal(sqliteEmp.email, mysqlEmp.email);
    assert.equal(sqliteEmp.baseSalaryMinor, mysqlEmp.baseSalaryMinor);
    assert.equal(sqliteEmp.status, 'ACTIVE');
    assert.equal(mysqlEmp.status, 'ACTIVE');

    const sqliteCount = await sqliteServices.employee.count(ctx);
    const mysqlCount = await mysqlServices.employee.count(ctx);
    assert.equal(sqliteCount, 1);
    assert.equal(mysqlCount, 1);
  });

  await t.test('2. Attendance Punch Deduplication & Late Detection Parity', async () => {
    const punchTime1 = '2026-10-12T09:05:00.000Z'; // 09:05 - On time
    const punchTimeDup = '2026-10-12T09:05:25.000Z'; // 25s later - Should deduplicate
    const punchTime2 = '2026-10-12T09:45:00.000Z'; // 09:45 - Late (30 min late from 09:15)

    const sqlitePunches = [
      { employeeId: createdSqliteEmpId, punchTime: punchTime1, punchType: 'CHECK_IN' as const, terminalId: 'TERM-01' },
      { employeeId: createdSqliteEmpId, punchTime: punchTimeDup, punchType: 'CHECK_IN' as const, terminalId: 'TERM-01' },
    ];
    const mysqlPunches = [
      { employeeId: createdMysqlEmpId, punchTime: punchTime1, punchType: 'CHECK_IN' as const, terminalId: 'TERM-01' },
      { employeeId: createdMysqlEmpId, punchTime: punchTimeDup, punchType: 'CHECK_IN' as const, terminalId: 'TERM-01' },
    ];

    const sqliteSync = await sqliteServices.attendance.syncBatch(ctx, sqlitePunches);
    const mysqlSync = await mysqlServices.attendance.syncBatch(ctx, mysqlPunches);

    assert.equal(sqliteSync.synced, 1);
    assert.equal(sqliteSync.deduped, 1);
    assert.equal(mysqlSync.synced, 1);
    assert.equal(mysqlSync.deduped, 1);

    const sqliteLate = await sqliteServices.attendance.recordPunch(ctx, {
      employeeId: createdSqliteEmpId,
      punchTime: punchTime2,
      punchType: 'CHECK_IN',
      terminalId: 'TERM-01',
    });
    const mysqlLate = await mysqlServices.attendance.recordPunch(ctx, {
      employeeId: createdMysqlEmpId,
      punchTime: punchTime2,
      punchType: 'CHECK_IN',
      terminalId: 'TERM-01',
    });

    assert.equal(sqliteLate.status, 'LATE');
    assert.equal(mysqlLate.status, 'LATE');
    assert.equal(sqliteLate.lateMinutes, 45); // 09:45 is 45 min after 09:00
    assert.equal(mysqlLate.lateMinutes, 45);
  });

  await t.test('3. Leave Balances & Approval Workflow Parity', async () => {
    await sqliteServices.leave.setBalance(ctx, {
      employeeId: createdSqliteEmpId,
      leaveType: 'CASUAL',
      year: 2026,
      allocatedDays: 10,
    });
    await mysqlServices.leave.setBalance(ctx, {
      employeeId: createdMysqlEmpId,
      leaveType: 'CASUAL',
      year: 2026,
      allocatedDays: 10,
    });

    const sqliteReq = await sqliteServices.leave.createRequest(ctx, {
      employeeId: createdSqliteEmpId,
      leaveType: 'CASUAL',
      startDate: '2026-11-01',
      endDate: '2026-11-03',
      daysCount: 3,
      reason: 'Family event',
    });
    const mysqlReq = await mysqlServices.leave.createRequest(ctx, {
      employeeId: createdMysqlEmpId,
      leaveType: 'CASUAL',
      startDate: '2026-11-01',
      endDate: '2026-11-03',
      daysCount: 3,
      reason: 'Family event',
    });

    assert.equal(sqliteReq.status, 'PENDING');
    assert.equal(mysqlReq.status, 'PENDING');

    await sqliteServices.leave.reviewRequest(ctx, sqliteReq.id, 'APPROVED', 'Approved by lead');
    await mysqlServices.leave.reviewRequest(ctx, mysqlReq.id, 'APPROVED', 'Approved by lead');

    const sqliteBalances = await sqliteServices.leave.getBalances(ctx, createdSqliteEmpId, 2026);
    const mysqlBalances = await mysqlServices.leave.getBalances(ctx, createdMysqlEmpId, 2026);

    const sBal = sqliteBalances.find((b) => b.leaveType === 'CASUAL')!;
    const mBal = mysqlBalances.find((b) => b.leaveType === 'CASUAL')!;

    assert.equal(sBal.allocatedDays, 10);
    assert.equal(mBal.allocatedDays, 10);
    assert.equal(sBal.usedDays, 3);
    assert.equal(mBal.usedDays, 3);
    assert.equal(sBal.availableDays, 7);
    assert.equal(mBal.availableDays, 7);
  });

  await t.test('4. Deterministic Payroll Calculation & Minor Units Parity', async () => {
    // Both adapters already have Tariq Mehmood with baseSalaryMinor 15,000,000 (PKR 150,000)
    const sqliteRun = await sqliteServices.payroll.executePayrollRun(ctx, 7, 2026);
    const mysqlRun = await mysqlServices.payroll.executePayrollRun(ctx, 7, 2026);

    assert.equal(sqliteRun.month, mysqlRun.month);
    assert.equal(sqliteRun.year, mysqlRun.year);
    assert.equal(sqliteRun.employeeCount, mysqlRun.employeeCount);

    // Assert exact minor units parity
    assert.equal(sqliteRun.totalGrossMinor, mysqlRun.totalGrossMinor);
    assert.equal(sqliteRun.totalTaxMinor, mysqlRun.totalTaxMinor);
    assert.equal(sqliteRun.totalEobiMinor, mysqlRun.totalEobiMinor);
    assert.equal(sqliteRun.totalProvidentFundMinor, mysqlRun.totalProvidentFundMinor);
    assert.equal(sqliteRun.totalDeductionsMinor, mysqlRun.totalDeductionsMinor);
    assert.equal(sqliteRun.totalNetMinor, mysqlRun.totalNetMinor);

    // Verify statutory exact amounts for 150k PKR
    assert.equal(sqliteRun.totalEobiMinor, 13000); // PKR 130 employee contribution = 13,000 paisa
    assert.equal(mysqlRun.totalEobiMinor, 13000);
    assert.ok(sqliteRun.totalNetMinor > 0);
    assert.ok(mysqlRun.totalNetMinor === sqliteRun.totalNetMinor);
  });

  await t.test('5. Cryptographic Hash-Chained Audit Ledger Parity', async () => {
    const sqliteAudit1 = await sqliteServices.audit.logAction(ctx, 'EMPLOYEE_CREATED', 'EMPLOYEE', 'emp-01', { name: 'Tariq' });
    const mysqlAudit1 = await mysqlServices.audit.logAction(ctx, 'EMPLOYEE_CREATED', 'EMPLOYEE', 'emp-01', { name: 'Tariq' });

    assert.equal(sqliteAudit1.action, mysqlAudit1.action);
    assert.equal(sqliteAudit1.entityType, mysqlAudit1.entityType);
    assert.equal(sqliteAudit1.entityId, mysqlAudit1.entityId);
    assert.ok(sqliteAudit1.hash.length === 64);
    assert.ok(mysqlAudit1.hash.length === 64);

    const sqliteLogs = await sqliteServices.audit.listLogs(ctx, { limit: 10 });
    const mysqlLogs = await mysqlServices.audit.listLogs(ctx, { limit: 10 });

    assert.equal(sqliteLogs.length, 1);
    assert.equal(mysqlLogs.length, 1);
  });

  // Cleanup
  sqliteConn.close();
  await mysqlConn.end();
  try {
    fs.rmSync(TEST_DIR, { recursive: true, force: true });
  } catch {}
});
