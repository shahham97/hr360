-- ============================================================================
-- HR360 Local Encrypted Database Schema - Migration 0001_init.sql
-- Embedded SQLCipher Engine (AES-256) - Enterprise Local Data Store
-- ============================================================================

-- Database Header & Integrity Anchor
CREATE TABLE IF NOT EXISTS db_header_record (
    company_id TEXT PRIMARY KEY,
    schema_version INTEGER NOT NULL,
    created_by_build TEXT NOT NULL,
    activated_at TEXT NOT NULL,
    last_integrity_check TEXT NOT NULL
);

-- Schema Migrations Tracking
CREATE TABLE IF NOT EXISTS schema_migrations (
    version INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    applied_at TEXT NOT NULL,
    checksum TEXT NOT NULL
);

-- Local User Accounts & Security Credentials
CREATE TABLE IF NOT EXISTS local_users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('COMPANY_ADMIN', 'HR_MANAGER', 'PAYROLL_OFFICER', 'RECRUITER', 'LINE_MANAGER', 'READ_ONLY')),
    password_hash TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
    failed_login_attempts INTEGER NOT NULL DEFAULT 0,
    locked_until TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_local_users_email ON local_users(email);

-- Employee Master Directory
CREATE TABLE IF NOT EXISTS employees (
    id TEXT PRIMARY KEY,
    employee_code TEXT UNIQUE NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT NOT NULL,
    department TEXT NOT NULL,
    designation TEXT NOT NULL,
    branch TEXT NOT NULL,
    employment_type TEXT NOT NULL CHECK (employment_type IN ('FULL_TIME', 'CONTRACT', 'PROBATION', 'INTERN')),
    base_salary_minor INTEGER NOT NULL, -- In Minor Units: Paisa (PKR * 100)
    national_id TEXT NOT NULL,
    date_of_birth TEXT NOT NULL,
    gender TEXT NOT NULL,
    joining_date TEXT NOT NULL,
    probation_end_date TEXT,
    contract_end_date TEXT,
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'ON_LEAVE', 'TERMINATED', 'RESIGNED')),
    address TEXT,
    emergency_contact_name TEXT,
    emergency_contact_phone TEXT,
    bank_account_number TEXT,
    bank_name TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_employees_status ON employees(status);
CREATE INDEX IF NOT EXISTS idx_employees_department ON employees(department);
CREATE INDEX IF NOT EXISTS idx_employees_code ON employees(employee_code);

-- Biometric Attendance Ledger
CREATE TABLE IF NOT EXISTS attendance_records (
    id TEXT PRIMARY KEY,
    employee_id TEXT NOT NULL,
    punch_time TEXT NOT NULL, -- ISO-8601 UTC
    punch_type TEXT NOT NULL CHECK (punch_type IN ('CHECK_IN', 'CHECK_OUT', 'BREAK_START', 'BREAK_END')),
    terminal_id TEXT NOT NULL,
    verified_mode TEXT NOT NULL DEFAULT 'FINGERPRINT',
    status TEXT NOT NULL DEFAULT 'ON_TIME' CHECK (status IN ('ON_TIME', 'LATE', 'EARLY_DEPARTURE', 'HALF_DAY', 'OVERTIME')),
    late_minutes INTEGER NOT NULL DEFAULT 0,
    overtime_minutes INTEGER NOT NULL DEFAULT 0,
    notes TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_attendance_emp_date ON attendance_records(employee_id, punch_time);
CREATE INDEX IF NOT EXISTS idx_attendance_punch_time ON attendance_records(punch_time);

-- Leave Policies & Balances
CREATE TABLE IF NOT EXISTS leave_balances (
    id TEXT PRIMARY KEY,
    employee_id TEXT NOT NULL,
    leave_type TEXT NOT NULL CHECK (leave_type IN ('CASUAL', 'SICK', 'ANNUAL', 'MATERNITY', 'UNPAID')),
    year INTEGER NOT NULL,
    allocated_days REAL NOT NULL,
    used_days REAL NOT NULL DEFAULT 0.0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE(employee_id, leave_type, year),
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_leave_balances_emp ON leave_balances(employee_id, year);

-- Leave Requests & Approvals
CREATE TABLE IF NOT EXISTS leave_requests (
    id TEXT PRIMARY KEY,
    employee_id TEXT NOT NULL,
    leave_type TEXT NOT NULL CHECK (leave_type IN ('CASUAL', 'SICK', 'ANNUAL', 'MATERNITY', 'UNPAID')),
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    days_count REAL NOT NULL,
    reason TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED')),
    approved_by TEXT,
    action_notes TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_leave_requests_emp ON leave_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_status ON leave_requests(status);

-- Payroll Runs (Maker-Checker Architecture)
CREATE TABLE IF NOT EXISTS payroll_runs (
    id TEXT PRIMARY KEY,
    period_month INTEGER NOT NULL,
    period_year INTEGER NOT NULL,
    total_gross_minor INTEGER NOT NULL,
    total_deductions_minor INTEGER NOT NULL,
    total_net_minor INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'PREPARED', 'APPROVED', 'LOCKED', 'REVERSED')),
    prepared_by TEXT NOT NULL,
    prepared_at TEXT NOT NULL,
    approved_by TEXT,
    approved_at TEXT,
    locked_at TEXT,
    reversal_reason TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE(period_month, period_year)
);

CREATE INDEX IF NOT EXISTS idx_payroll_runs_period ON payroll_runs(period_year, period_month);

-- Payroll Line Items
CREATE TABLE IF NOT EXISTS payroll_items (
    id TEXT PRIMARY KEY,
    payroll_run_id TEXT NOT NULL,
    employee_id TEXT NOT NULL,
    base_salary_minor INTEGER NOT NULL,
    allowances_minor INTEGER NOT NULL DEFAULT 0,
    gross_pay_minor INTEGER NOT NULL,
    days_worked INTEGER NOT NULL,
    days_in_month INTEGER NOT NULL,
    tax_minor INTEGER NOT NULL DEFAULT 0,
    eobi_employee_minor INTEGER NOT NULL DEFAULT 0,
    eobi_employer_minor INTEGER NOT NULL DEFAULT 0,
    pessi_employer_minor INTEGER NOT NULL DEFAULT 0,
    provident_fund_minor INTEGER NOT NULL DEFAULT 0,
    other_deductions_minor INTEGER NOT NULL DEFAULT 0,
    total_deductions_minor INTEGER NOT NULL,
    net_pay_minor INTEGER NOT NULL,
    bank_account_number TEXT,
    bank_name TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (payroll_run_id) REFERENCES payroll_runs(id) ON DELETE CASCADE,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_payroll_items_run ON payroll_items(payroll_run_id);
CREATE INDEX IF NOT EXISTS idx_payroll_items_emp ON payroll_items(employee_id);

-- Payslip Templates
CREATE TABLE IF NOT EXISTS payslip_templates (
    id TEXT PRIMARY KEY,
    template_name TEXT NOT NULL,
    is_default INTEGER NOT NULL DEFAULT 0 CHECK (is_default IN (0, 1)),
    config_json TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- HR Certificates & Credentials (with Verification Code)
CREATE TABLE IF NOT EXISTS certificates (
    id TEXT PRIMARY KEY,
    employee_id TEXT NOT NULL,
    certificate_type TEXT NOT NULL CHECK (certificate_type IN ('EXPERIENCE', 'SALARY_INCREMENT', 'SERVICE', 'RELIEVING')),
    verification_code TEXT UNIQUE NOT NULL,
    issue_date TEXT NOT NULL,
    title TEXT NOT NULL,
    details_json TEXT NOT NULL,
    is_revoked INTEGER NOT NULL DEFAULT 0 CHECK (is_revoked IN (0, 1)),
    created_at TEXT NOT NULL,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_certificates_code ON certificates(verification_code);

-- Performance Reviews & Appraisals
CREATE TABLE IF NOT EXISTS performance_reviews (
    id TEXT PRIMARY KEY,
    employee_id TEXT NOT NULL,
    reviewer_id TEXT NOT NULL,
    review_cycle TEXT NOT NULL,
    rating REAL NOT NULL,
    strengths TEXT,
    areas_for_growth TEXT,
    goals_json TEXT,
    status TEXT NOT NULL DEFAULT 'COMPLETED' CHECK (status IN ('DRAFT', 'SUBMITTED', 'COMPLETED')),
    created_at TEXT NOT NULL,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
);

-- Recruitment Job Openings
CREATE TABLE IF NOT EXISTS job_openings (
    id TEXT PRIMARY KEY,
    job_title TEXT NOT NULL,
    department TEXT NOT NULL,
    branch TEXT NOT NULL,
    openings_count INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'HOLD', 'CLOSED')),
    min_experience_years INTEGER NOT NULL DEFAULT 0,
    salary_range TEXT,
    requirements_json TEXT NOT NULL,
    application_deadline TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- Candidates & ATS Pipeline
CREATE TABLE IF NOT EXISTS candidates (
    id TEXT PRIMARY KEY,
    job_id TEXT NOT NULL,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    experience_years REAL NOT NULL DEFAULT 0,
    education TEXT,
    skills_json TEXT,
    cv_file_name TEXT,
    match_score INTEGER NOT NULL DEFAULT 0,
    recruitment_stage TEXT NOT NULL DEFAULT 'APPLIED' CHECK (recruitment_stage IN ('APPLIED', 'SHORTLISTED', 'TECHNICAL_ASSESSMENT', 'INTERVIEW_SCHEDULED', 'OFFERED', 'HIRED', 'REJECTED')),
    notes TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (job_id) REFERENCES job_openings(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_candidates_job ON candidates(job_id);
CREATE INDEX IF NOT EXISTS idx_candidates_stage ON candidates(recruitment_stage);

-- Encrypted Document Vault Metadata
CREATE TABLE IF NOT EXISTS document_vault (
    id TEXT PRIMARY KEY,
    employee_id TEXT NOT NULL,
    document_type TEXT NOT NULL CHECK (document_type IN ('CNIC_SCAN', 'CONTRACT', 'RESUME', 'ACADEMIC', 'CERTIFICATE', 'OTHER')),
    file_name TEXT NOT NULL,
    file_size_bytes INTEGER NOT NULL,
    file_sha256 TEXT NOT NULL,
    encrypted_file_path TEXT NOT NULL,
    expiry_date TEXT,
    uploaded_at TEXT NOT NULL,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
);

-- Local Hash-Chained Audit Ledger (Tamper-Evident)
CREATE TABLE IF NOT EXISTS local_audit_log (
    id TEXT PRIMARY KEY,
    sequence_number INTEGER UNIQUE NOT NULL,
    prev_hash TEXT NOT NULL,
    hash TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    actor TEXT NOT NULL,
    action TEXT NOT NULL,
    module TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    details TEXT NOT NULL,
    ip_address TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_local_audit_seq ON local_audit_log(sequence_number);

-- Local Key-Value Settings & Configuration
CREATE TABLE IF NOT EXISTS local_settings (
    setting_key TEXT PRIMARY KEY,
    setting_value TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- Local User Notifications & System Alerts
CREATE TABLE IF NOT EXISTS local_notifications (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    level TEXT NOT NULL DEFAULT 'INFO' CHECK (level IN ('INFO', 'WARNING', 'CRITICAL', 'SUCCESS')),
    read_flag INTEGER NOT NULL DEFAULT 0 CHECK (read_flag IN (0, 1)),
    created_at TEXT NOT NULL
);
