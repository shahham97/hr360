-- =============================================================================
-- Migration: 0001_init.sql
-- Database: tenant_<slug>
-- Description: Tenant database schema initialization
-- Conforms to: Section 8, 10 & 12 of HR360 Master Build Prompt
-- =============================================================================

-- Schema Migration Tracking (Idempotent execution with SHA-256 checksum)
CREATE TABLE IF NOT EXISTS schema_migrations (
    version INT NOT NULL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    checksum VARCHAR(64) NOT NULL,
    applied_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Roles & Central Permission Engine
CREATE TABLE IF NOT EXISTS roles (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    description VARCHAR(255) NULL,
    is_system BOOLEAN NOT NULL DEFAULT FALSE,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS permissions (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    code VARCHAR(100) NOT NULL UNIQUE,
    module VARCHAR(50) NOT NULL,
    description VARCHAR(255) NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS role_permissions (
    role_id VARCHAR(36) NOT NULL,
    permission_id VARCHAR(36) NOT NULL,
    PRIMARY KEY (role_id, permission_id),
    CONSTRAINT fk_rp_role FOREIGN KEY (role_id) REFERENCES roles (id) ON DELETE CASCADE,
    CONSTRAINT fk_rp_perm FOREIGN KEY (permission_id) REFERENCES permissions (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_roles (
    user_id VARCHAR(36) NOT NULL,
    role_id VARCHAR(36) NOT NULL,
    PRIMARY KEY (user_id, role_id),
    CONSTRAINT fk_ur_role FOREIGN KEY (role_id) REFERENCES roles (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Organization Hierarchy & Branch Scoping
CREATE TABLE IF NOT EXISTS branches (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(20) NOT NULL UNIQUE,
    timezone VARCHAR(50) NOT NULL DEFAULT 'Asia/Karachi',
    address TEXT NULL,
    city VARCHAR(50) NULL,
    country VARCHAR(2) NOT NULL DEFAULT 'PK',
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS departments (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(20) NOT NULL UNIQUE,
    branch_id VARCHAR(36) NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    CONSTRAINT fk_dept_branch FOREIGN KEY (branch_id) REFERENCES branches (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS designations (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    title VARCHAR(100) NOT NULL UNIQUE,
    description VARCHAR(255) NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Core HR Employees & Encrypted Sensitive Records
CREATE TABLE IF NOT EXISTS employees (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    employee_code VARCHAR(30) NOT NULL UNIQUE,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    phone VARCHAR(30) NULL,
    -- AES-256-GCM encrypted national ID (CNIC / SSN) at application layer
    encrypted_national_id TEXT NULL,
    date_of_birth DATE NULL,
    gender ENUM('MALE', 'FEMALE', 'OTHER') NULL,
    marital_status ENUM('SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED') NULL,
    joining_date DATE NOT NULL,
    termination_date DATE NULL,
    status ENUM('ACTIVE', 'ON_LEAVE', 'PROBATION', 'TERMINATED', 'RESIGNED') NOT NULL DEFAULT 'PROBATION',
    branch_id VARCHAR(36) NOT NULL,
    department_id VARCHAR(36) NOT NULL,
    designation_id VARCHAR(36) NOT NULL,
    manager_id VARCHAR(36) NULL,
    -- Encrypted Bank & Salary disbursement details
    encrypted_bank_details TEXT NULL,
    custom_fields_json TEXT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    INDEX idx_emp_branch_dept (branch_id, department_id),
    INDEX idx_emp_status (status),
    CONSTRAINT fk_emp_branch FOREIGN KEY (branch_id) REFERENCES branches (id),
    CONSTRAINT fk_emp_dept FOREIGN KEY (department_id) REFERENCES departments (id),
    CONSTRAINT fk_emp_desig FOREIGN KEY (designation_id) REFERENCES designations (id),
    CONSTRAINT fk_emp_mgr FOREIGN KEY (manager_id) REFERENCES employees (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS employee_documents (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    employee_id VARCHAR(36) NOT NULL,
    title VARCHAR(100) NOT NULL,
    document_type VARCHAR(50) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size_bytes INT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    sha256 VARCHAR(64) NOT NULL,
    uploaded_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    CONSTRAINT fk_docs_emp FOREIGN KEY (employee_id) REFERENCES employees (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS salary_revisions (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    employee_id VARCHAR(36) NOT NULL,
    effective_from DATE NOT NULL,
    base_salary DECIMAL(14, 4) NOT NULL,
    reason VARCHAR(255) NULL,
    approved_by_user_id VARCHAR(36) NOT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    INDEX idx_sal_rev_emp (employee_id, effective_from),
    CONSTRAINT fk_sal_rev_emp FOREIGN KEY (employee_id) REFERENCES employees (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Shifts, Rosters & Holidays
CREATE TABLE IF NOT EXISTS shifts (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    grace_in_minutes INT NOT NULL DEFAULT 15,
    grace_out_minutes INT NOT NULL DEFAULT 15,
    half_day_threshold_minutes INT NOT NULL DEFAULT 240,
    full_day_target_minutes INT NOT NULL DEFAULT 480,
    is_overnight BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS rosters (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    employee_id VARCHAR(36) NOT NULL,
    shift_id VARCHAR(36) NOT NULL,
    roster_date DATE NOT NULL,
    is_off_day BOOLEAN NOT NULL DEFAULT FALSE,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    UNIQUE KEY uq_roster_emp_date (employee_id, roster_date),
    INDEX idx_roster_date (roster_date),
    CONSTRAINT fk_roster_emp FOREIGN KEY (employee_id) REFERENCES employees (id) ON DELETE CASCADE,
    CONSTRAINT fk_roster_shift FOREIGN KEY (shift_id) REFERENCES shifts (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS holidays (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    holiday_date DATE NOT NULL,
    branch_id VARCHAR(36) NULL, -- NULL applies to all branches
    is_recurring BOOLEAN NOT NULL DEFAULT FALSE,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    INDEX idx_holiday_date (holiday_date),
    CONSTRAINT fk_holiday_branch FOREIGN KEY (branch_id) REFERENCES branches (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Biometric Devices, Cursors & Raw Punches (Immutable)
CREATE TABLE IF NOT EXISTS biometric_devices (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    branch_id VARCHAR(36) NOT NULL,
    name VARCHAR(100) NOT NULL,
    device_type ENUM('ZKTECO', 'HIKVISION') NOT NULL,
    ip_address VARCHAR(45) NOT NULL,
    port INT NOT NULL,
    -- AES-256-GCM encrypted device credentials (comm key / HTTP digest password)
    encrypted_credentials TEXT NULL,
    serial_number VARCHAR(100) NULL,
    last_ping_at DATETIME(3) NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    CONSTRAINT fk_dev_branch FOREIGN KEY (branch_id) REFERENCES branches (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS device_cursors (
    device_id VARCHAR(36) NOT NULL PRIMARY KEY,
    last_log_index BIGINT NOT NULL DEFAULT 0,
    last_synced_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    CONSTRAINT fk_cursor_device FOREIGN KEY (device_id) REFERENCES biometric_devices (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS raw_punches (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    device_id VARCHAR(36) NOT NULL,
    device_user_id VARCHAR(50) NOT NULL,
    punch_time DATETIME(3) NOT NULL,
    punch_type ENUM('CHECK_IN', 'CHECK_OUT', 'BREAK_OUT', 'BREAK_IN', 'UNKNOWN') NOT NULL DEFAULT 'UNKNOWN',
    synced_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    UNIQUE KEY uq_raw_punch (device_id, device_user_id, punch_time),
    INDEX idx_punch_time (punch_time),
    CONSTRAINT fk_punch_dev FOREIGN KEY (device_id) REFERENCES biometric_devices (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS daily_sheets (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    employee_id VARCHAR(36) NOT NULL,
    attendance_date DATE NOT NULL,
    first_in DATETIME(3) NULL,
    last_out DATETIME(3) NULL,
    work_minutes INT NOT NULL DEFAULT 0,
    late_minutes INT NOT NULL DEFAULT 0,
    early_exit_minutes INT NOT NULL DEFAULT 0,
    overtime_minutes INT NOT NULL DEFAULT 0,
    status ENUM('PRESENT', 'ABSENT', 'HALF_DAY', 'ON_LEAVE', 'HOLIDAY', 'REST_DAY') NOT NULL,
    is_manual_adjusted BOOLEAN NOT NULL DEFAULT FALSE,
    adjustment_reason TEXT NULL,
    adjusted_by_user_id VARCHAR(36) NULL,
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    UNIQUE KEY uq_daily_sheet (employee_id, attendance_date),
    INDEX idx_sheet_date (attendance_date),
    CONSTRAINT fk_sheet_emp FOREIGN KEY (employee_id) REFERENCES employees (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Leaves
CREATE TABLE IF NOT EXISTS leave_types (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    code VARCHAR(20) NOT NULL UNIQUE,
    quota_per_year INT NOT NULL DEFAULT 0,
    carry_forward_max INT NOT NULL DEFAULT 0,
    is_paid BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS leave_balances (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    employee_id VARCHAR(36) NOT NULL,
    leave_type_id VARCHAR(36) NOT NULL,
    year INT NOT NULL,
    allocated_days DECIMAL(5, 2) NOT NULL,
    used_days DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
    pending_days DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
    UNIQUE KEY uq_leave_bal (employee_id, leave_type_id, year),
    CONSTRAINT fk_lbal_emp FOREIGN KEY (employee_id) REFERENCES employees (id) ON DELETE CASCADE,
    CONSTRAINT fk_lbal_type FOREIGN KEY (leave_type_id) REFERENCES leave_types (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS leave_requests (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    employee_id VARCHAR(36) NOT NULL,
    leave_type_id VARCHAR(36) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_half_day BOOLEAN NOT NULL DEFAULT FALSE,
    days_count DECIMAL(5, 2) NOT NULL,
    reason TEXT NOT NULL,
    status ENUM('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    approved_by_user_id VARCHAR(36) NULL,
    action_notes TEXT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    INDEX idx_leave_emp_status (employee_id, status),
    CONSTRAINT fk_lreq_emp FOREIGN KEY (employee_id) REFERENCES employees (id) ON DELETE CASCADE,
    CONSTRAINT fk_lreq_type FOREIGN KEY (leave_type_id) REFERENCES leave_types (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Payroll & Statutory Engine (No floating points: DECIMAL(14,4))
CREATE TABLE IF NOT EXISTS salary_components (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    code VARCHAR(32) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    component_type ENUM('EARNING', 'DEDUCTION') NOT NULL,
    calculation_type ENUM('FIXED', 'PERCENTAGE', 'FORMULA') NOT NULL,
    formula_expression TEXT NULL,
    is_taxable BOOLEAN NOT NULL DEFAULT TRUE,
    is_statutory BOOLEAN NOT NULL DEFAULT FALSE,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS statutory_profiles (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    country VARCHAR(2) NOT NULL DEFAULT 'PK',
    eobi_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    eobi_employee_amount DECIMAL(14, 4) NOT NULL DEFAULT 130.0000,
    eobi_employer_amount DECIMAL(14, 4) NOT NULL DEFAULT 650.0000,
    provident_fund_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    provident_fund_employee_pct DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
    provident_fund_employer_pct DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
    social_security_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tax_slabs (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    fiscal_year VARCHAR(20) NOT NULL, -- e.g. '2025-2026'
    slab_order INT NOT NULL,
    min_income DECIMAL(14, 4) NOT NULL,
    max_income DECIMAL(14, 4) NULL,
    fixed_tax DECIMAL(14, 4) NOT NULL DEFAULT 0.0000,
    tax_rate_percentage DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
    source_citation VARCHAR(255) NOT NULL, -- Federal Board of Revenue Finance Act cite
    UNIQUE KEY uq_tax_slab (fiscal_year, slab_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS payroll_runs (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    month INT NOT NULL,
    year INT NOT NULL,
    status ENUM('DRAFT', 'REVIEW', 'LOCKED', 'PAID') NOT NULL DEFAULT 'DRAFT',
    total_gross DECIMAL(14, 4) NOT NULL DEFAULT 0.0000,
    total_deductions DECIMAL(14, 4) NOT NULL DEFAULT 0.0000,
    total_net DECIMAL(14, 4) NOT NULL DEFAULT 0.0000,
    locked_at DATETIME(3) NULL,
    locked_by_user_id VARCHAR(36) NULL,
    paid_at DATETIME(3) NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    UNIQUE KEY uq_payroll_period (year, month)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS payslips (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    payroll_run_id VARCHAR(36) NOT NULL,
    employee_id VARCHAR(36) NOT NULL,
    gross_pay DECIMAL(14, 4) NOT NULL,
    total_deductions DECIMAL(14, 4) NOT NULL,
    net_pay DECIMAL(14, 4) NOT NULL,
    income_tax DECIMAL(14, 4) NOT NULL DEFAULT 0.0000,
    eobi_employee DECIMAL(14, 4) NOT NULL DEFAULT 0.0000,
    details_json TEXT NOT NULL,
    pdf_path VARCHAR(500) NULL,
    is_reversal BOOLEAN NOT NULL DEFAULT FALSE,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    UNIQUE KEY uq_payslip_emp_run (payroll_run_id, employee_id),
    CONSTRAINT fk_slip_run FOREIGN KEY (payroll_run_id) REFERENCES payroll_runs (id) ON DELETE CASCADE,
    CONSTRAINT fk_slip_emp FOREIGN KEY (employee_id) REFERENCES employees (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ATS & Recruitment Module
CREATE TABLE IF NOT EXISTS jobs (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    title VARCHAR(100) NOT NULL,
    department_id VARCHAR(36) NOT NULL,
    branch_id VARCHAR(36) NOT NULL,
    jd_text TEXT NOT NULL,
    required_skills_json TEXT NOT NULL,
    preferred_skills_json TEXT NOT NULL,
    min_experience_years INT NOT NULL DEFAULT 0,
    min_education_tier INT NOT NULL DEFAULT 1,
    weight_hard DECIMAL(4, 2) NOT NULL DEFAULT 0.40,
    weight_soft DECIMAL(4, 2) NOT NULL DEFAULT 0.20,
    weight_exp DECIMAL(4, 2) NOT NULL DEFAULT 0.25,
    weight_edu DECIMAL(4, 2) NOT NULL DEFAULT 0.15,
    is_blind_screening BOOLEAN NOT NULL DEFAULT FALSE,
    status ENUM('DRAFT', 'OPEN', 'PAUSED', 'CLOSED') NOT NULL DEFAULT 'DRAFT',
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    CONSTRAINT fk_job_dept FOREIGN KEY (department_id) REFERENCES departments (id),
    CONSTRAINT fk_job_branch FOREIGN KEY (branch_id) REFERENCES branches (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS candidates (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    job_id VARCHAR(36) NOT NULL,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(30) NULL,
    resume_path VARCHAR(500) NOT NULL,
    score_hard DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
    score_soft DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
    score_exp DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
    score_edu DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
    final_score DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
    is_knocked_out BOOLEAN NOT NULL DEFAULT FALSE,
    knockout_reason VARCHAR(255) NULL,
    stage ENUM('APPLIED', 'SCREENING', 'INTERVIEW', 'OFFERED', 'HIRED', 'REJECTED') NOT NULL DEFAULT 'APPLIED',
    converted_employee_id VARCHAR(36) NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    INDEX idx_cand_job_score (job_id, final_score),
    CONSTRAINT fk_cand_job FOREIGN KEY (job_id) REFERENCES jobs (id) ON DELETE CASCADE,
    CONSTRAINT fk_cand_emp FOREIGN KEY (converted_employee_id) REFERENCES employees (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS candidate_events (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    candidate_id VARCHAR(36) NOT NULL,
    event_type VARCHAR(50) NOT NULL,
    notes TEXT NULL,
    actor_id VARCHAR(36) NOT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    CONSTRAINT fk_cev_cand FOREIGN KEY (candidate_id) REFERENCES candidates (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tenant Cryptographic Tamper-Evident Chained Audit Log (Section 8.6 & 10)
-- Formula: hash = SHA256(prevHash + canonicalJSON(row))
CREATE TABLE IF NOT EXISTS audit_log (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    prev_hash VARCHAR(64) NOT NULL,
    hash VARCHAR(64) NOT NULL UNIQUE,
    actor_id VARCHAR(36) NOT NULL,
    actor_type VARCHAR(32) NOT NULL,
    action VARCHAR(64) NOT NULL,
    entity_type VARCHAR(64) NOT NULL,
    entity_id VARCHAR(36) NOT NULL,
    metadata TEXT NULL,
    ip_address VARCHAR(45) NULL,
    user_agent TEXT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    INDEX idx_audit_actor_action (actor_id, action),
    INDEX idx_audit_entity (entity_type, entity_id),
    INDEX idx_audit_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
