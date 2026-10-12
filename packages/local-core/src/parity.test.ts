import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { DatabaseConnection } from './database/connection';
import { DatabaseMigrator } from './database/migrator';
import { MoneyMinor } from './domain/money';
import { calculateAnnualIncomeTaxMinor, computeLocalPayrollItem } from './domain/payroll-engine';
import { EmployeeRepository } from './repositories/employee-repo';
import { PayrollRepository } from './repositories/payroll-repo';
import { AttendanceRepository } from './repositories/attendance-repo';
import { AuditRepository } from './repositories/audit-repo';
import { IpcDispatcher } from './ipc/dispatcher';

const TEST_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

test('HR360 Local Core - Parity & Security Test Suite', async (t) => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hr360-core-test-'));
  const dbPath = path.join(tmpDir, 'test_tenant.db');

  t.after(() => {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {}
  });

  await t.test('1. SQLCipher Encryption & Migration Verification', () => {
    const conn = new DatabaseConnection({
      dbPath,
      encryptionKey: TEST_KEY,
    });

    const migrator = new DatabaseMigrator(conn);
    const migrationRes = migrator.migrate({
      companyId: 'comp_test_001',
      appVersion: '1.0.0',
    });

    assert.ok(migrationRes.appliedCount >= 1, 'Initial migration applied');
    assert.strictEqual(conn.checkIntegrity().ok, true, 'Database integrity check passes');

    // Verify Header Record
    const headerCheck = migrator.verifyHeaderRecord('comp_test_001');
    assert.strictEqual(headerCheck.valid, true, 'Header record correctly anchored');

    const wrongHeaderCheck = migrator.verifyHeaderRecord('wrong_company');
    assert.strictEqual(wrongHeaderCheck.valid, false, 'Detects company header mismatch');

    conn.close();

    // Verify raw file is encrypted and cannot be opened with standard SQLite header
    const rawBytes = fs.readFileSync(dbPath);
    const headerStr = rawBytes.subarray(0, 16).toString('utf8');
    assert.notStrictEqual(headerStr, 'SQLite format 3\0', 'Raw DB file must not contain SQLite plaintext header');
  });

  await t.test('2. Minor Units (Paisa) & Money Math Parity', () => {
    // 50,000 PKR = 5,000,000 Paisa
    assert.strictEqual(MoneyMinor.fromPkr(50000), 5000000);
    assert.strictEqual(MoneyMinor.toPkr(5000000), 50000);

    // 123,456.78 PKR = 12,345,678 Paisa
    assert.strictEqual(MoneyMinor.fromPkr(123456.78), 12345678);
    assert.strictEqual(MoneyMinor.toPkr(12345678), 123456.78);

    // Minor ratio multiplication
    // 3,000,000 minor with 15/30 days = 1,500,000 minor
    const prorated = MoneyMinor.multiplyRatio(3000000, 15, 30);
    assert.strictEqual(prorated, 1500000);
  });

  await t.test('3. Pakistan Statutory Tax Engine Parity', () => {
    // Annual PKR 600,000 (PKR 50k/mo) -> 0 tax
    const taxZero = calculateAnnualIncomeTaxMinor(MoneyMinor.fromPkr(600000));
    assert.strictEqual(taxZero, 0);

    // Annual PKR 1,200,000 (PKR 100k/mo) -> 5% on 600,000 = PKR 30,000 (3,000,000 paisa)
    const tax30k = calculateAnnualIncomeTaxMinor(MoneyMinor.fromPkr(1200000));
    assert.strictEqual(tax30k, MoneyMinor.fromPkr(30000));

    // Full item calculation
    const calc = computeLocalPayrollItem({
      baseSalaryMinor: MoneyMinor.fromPkr(100000),
      allowancesMinor: 0,
      daysWorked: 30,
      daysInMonth: 30,
    });

    // Invariant: Net Pay = Gross Pay - Total Deductions
    assert.strictEqual(
      calc.netPayMinor,
      calc.grossPayMinor - calc.totalDeductionsMinor,
      'Exact payroll balance invariant holds'
    );
    assert.strictEqual(calc.eobiEmployeeMinor, 13000, 'EOBI employee deduction is PKR 130 (13,000 paisa)');
  });

  await t.test('4. Maker-Checker Payroll & Quota Enforcement', () => {
    const conn = new DatabaseConnection({
      dbPath,
      encryptionKey: TEST_KEY,
    });

    const empRepo = new EmployeeRepository(conn);
    const payrollRepo = new PayrollRepository(conn);

    // Create 2 employees
    const emp1 = empRepo.create({
      employeeCode: 'EMP001',
      firstName: 'Ahmed',
      lastName: 'Khan',
      email: 'ahmed@company.local',
      phone: '+923001112233',
      department: 'Engineering',
      designation: 'Senior Engineer',
      branch: 'Lahore',
      baseSalaryPkr: 150000,
      nationalId: '35201-1234567-1',
      dateOfBirth: '1990-05-15',
      gender: 'Male',
      joiningDate: '2024-01-01',
    });

    const emp2 = empRepo.create({
      employeeCode: 'EMP002',
      firstName: 'Fatima',
      lastName: 'Ali',
      email: 'fatima@company.local',
      phone: '+923002223344',
      department: 'Operations',
      designation: 'Operations Specialist',
      branch: 'Karachi',
      baseSalaryPkr: 95000,
      nationalId: '42101-7654321-2',
      dateOfBirth: '1995-08-20',
      gender: 'Female',
      joiningDate: '2024-03-01',
    });

    // Enforce quota limit test
    assert.throws(() => {
      empRepo.create({
        employeeCode: 'EMP003',
        firstName: 'Over',
        lastName: 'Limit',
        email: 'over@company.local',
        phone: '+923009999999',
        department: 'Operations',
        designation: 'Staff',
        branch: 'Karachi',
        nationalId: '42101-9999999-9',
        dateOfBirth: '1998-01-01',
        gender: 'Male',
        joiningDate: '2024-05-01',
      }, 2); // max limit = 2
    }, /Headcount quota reached/);

    // Prepare payroll run
    const run = payrollRepo.prepareRun({
      periodMonth: 10,
      periodYear: 2026,
      preparedBy: 'preparer_user_id',
    });

    assert.strictEqual(run.status, 'PREPARED');
    assert.strictEqual(run.items?.length, 2);

    // Maker-checker violation check: preparer cannot approve
    assert.throws(() => {
      payrollRepo.approveRun(run.id, 'preparer_user_id');
    }, /Maker-Checker violation/);

    // Different user approves
    const approved = payrollRepo.approveRun(run.id, 'approver_user_id');
    assert.strictEqual(approved.status, 'APPROVED');

    // Lock run
    const locked = payrollRepo.lockRun(run.id);
    assert.strictEqual(locked.status, 'LOCKED');

    conn.close();
  });

  await t.test('5. Biometric Punch Deduplication', () => {
    const conn = new DatabaseConnection({
      dbPath,
      encryptionKey: TEST_KEY,
    });

    const attendanceRepo = new AttendanceRepository(conn);
    const empRepo = new EmployeeRepository(conn);
    const emp = empRepo.getByCode('EMP001')!;

    const punch1 = attendanceRepo.logPunch({
      employeeId: emp.id,
      punchTime: '2026-10-12T09:00:00.000Z',
      punchType: 'CHECK_IN',
      terminalId: 'TERM-01',
    });

    assert.ok(punch1.id);

    // Duplicate punch within 60 seconds (same employee, same type)
    const syncRes = attendanceRepo.batchSyncPunches([
      {
        employeeId: emp.id,
        punchTime: '2026-10-12T09:00:30.000Z',
        punchType: 'CHECK_IN',
        terminalId: 'TERM-01',
      },
      {
        employeeId: emp.id,
        punchTime: '2026-10-12T17:30:00.000Z',
        punchType: 'CHECK_OUT',
        terminalId: 'TERM-01',
      },
    ]);

    assert.strictEqual(syncRes.duplicates, 1, 'First duplicate punch filtered out');
    assert.strictEqual(syncRes.inserted, 1, 'Second unique punch inserted');

    conn.close();
  });

  await t.test('6. Tamper-Evident Hash-Chained Audit Ledger', () => {
    const conn = new DatabaseConnection({
      dbPath,
      encryptionKey: TEST_KEY,
    });

    const auditRepo = new AuditRepository(conn);

    auditRepo.appendEvent({
      actor: 'admin@hr360.local',
      action: 'LOGIN',
      module: 'AUTH',
      entityId: 'usr_001',
      details: { method: 'local_password' },
    });

    auditRepo.appendEvent({
      actor: 'admin@hr360.local',
      action: 'UPDATE_SALARY',
      module: 'PAYROLL',
      entityId: 'EMP001',
      details: { oldSalary: 120000, newSalary: 150000 },
    });

    // Verification must pass
    const check1 = auditRepo.verifyChain();
    assert.strictEqual(check1.valid, true);
    assert.strictEqual(check1.totalEvents, 2);

    // If an attacker tampers directly with raw database row
    const raw = conn.getRawDb();
    raw.prepare(`UPDATE local_audit_log SET details = 'HACKED' WHERE sequence_number = 2`).run();

    // Verification must fail immediately!
    const check2 = auditRepo.verifyChain();
    assert.strictEqual(check2.valid, false, 'Tampered log detected');
    assert.strictEqual(check2.brokenAtSequence, 2);

    conn.close();
  });

  await t.test('7. IPC Dispatcher Integration & Feature Flags', async () => {
    const conn = new DatabaseConnection({
      dbPath,
      encryptionKey: TEST_KEY,
    });

    const dispatcher = new IpcDispatcher(conn);
    dispatcher.setEntitlements({
      companyId: 'comp_test_001',
      maxEmployees: 10,
      modules: {
        payroll: true,
        attendance: true,
        recruitment: false, // Disabled module
        performance: true,
        certificates: true,
      },
      expiresAt: '2027-01-01T00:00:00.000Z',
    });

    // Disabled module call should fail cleanly
    const recruitRes = await dispatcher.dispatch({
      channel: 'recruitment:listJobs',
      payload: {},
      userContext: {
        userId: 'u1',
        email: 'hr@company.local',
        role: 'HR_MANAGER',
        companyId: 'comp_test_001',
      },
    });

    assert.strictEqual(recruitRes.success, false);
    assert.match(recruitRes.error!, /is not enabled in your company subscription plan/);

    // Allowed module call should succeed
    const empRes = await dispatcher.dispatch({
      channel: 'employee:list',
      payload: {},
      userContext: {
        userId: 'u1',
        email: 'hr@company.local',
        role: 'HR_MANAGER',
        companyId: 'comp_test_001',
      },
    });

    assert.strictEqual(empRes.success, true);
    assert.ok(empRes.data.total >= 2);

    conn.close();
  });

  await t.test('8. Encrypted Backup and Restore Roundtrip', async () => {
    const backupDir = path.join(tmpDir, 'backups');
    const restoredDbPath = path.join(tmpDir, 'restored_tenant.db');

    const conn = new DatabaseConnection({
      dbPath,
      encryptionKey: TEST_KEY,
    });

    const { BackupManager } = await import('./database/backup-manager');
    const backupMgr = new BackupManager(conn, TEST_KEY, 'comp_test_001');

    const meta = backupMgr.createBackup(backupDir, 'test_export');
    assert.ok(fs.existsSync(meta.filePath), 'Backup file created on disk');
    assert.ok(meta.filePath.endsWith('.sql.hr360bak'), 'Correct extension');
    assert.ok(meta.sizeBytes > 0, 'Non-zero size');

    conn.close();

    // Verify backup file starts with magic header and not raw SQLite
    const rawBackup = fs.readFileSync(meta.filePath);
    assert.strictEqual(rawBackup.subarray(0, 9).toString('utf8'), 'HR360BAK1');
    assert.notStrictEqual(rawBackup.subarray(0, 16).toString('utf8'), 'SQLite format 3\0');

    // Restore to brand new database file
    const restoreRes = BackupManager.restoreBackup(meta.filePath, restoredDbPath, TEST_KEY);
    assert.strictEqual(restoreRes.success, true, 'Restore operation succeeds');
    assert.ok(fs.existsSync(restoredDbPath), 'Restored DB file exists');

    // Open restored database and verify data
    const restoredConn = new DatabaseConnection({
      dbPath: restoredDbPath,
      encryptionKey: TEST_KEY,
    });

    assert.strictEqual(restoredConn.checkIntegrity().ok, true, 'Restored DB passes integrity check');
    const empRepo = new EmployeeRepository(restoredConn);
    const count = empRepo.count();
    assert.strictEqual(count, 2, 'Employees restored with exact counts');
    const emp = empRepo.getByCode('EMP001');
    assert.strictEqual(emp?.firstName, 'Ahmed');

    restoredConn.close();
  });
});
