import mysql from 'mysql2/promise';

export const MYSQL_TENANT_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS db_header_record (
    company_id VARCHAR(64) PRIMARY KEY,
    schema_version INT NOT NULL,
    created_by_build VARCHAR(64) NOT NULL,
    activated_at VARCHAR(64) NOT NULL,
    last_integrity_check VARCHAR(64) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS schema_migrations (
    version INT PRIMARY KEY,
    name VARCHAR(128) NOT NULL,
    applied_at VARCHAR(64) NOT NULL,
    checksum VARCHAR(128) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS local_users (
    id VARCHAR(64) PRIMARY KEY,
    email VARCHAR(191) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(64) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    failed_login_attempts INT NOT NULL DEFAULT 0,
    locked_until VARCHAR(64) NULL,
    created_at VARCHAR(64) NOT NULL,
    updated_at VARCHAR(64) NOT NULL,
    INDEX idx_local_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS employees (
    id VARCHAR(64) PRIMARY KEY,
    employee_code VARCHAR(64) UNIQUE NOT NULL,
    first_name VARCHAR(128) NOT NULL,
    last_name VARCHAR(128) NOT NULL,
    email VARCHAR(191) UNIQUE NOT NULL,
    phone VARCHAR(64) NOT NULL,
    department VARCHAR(128) NOT NULL,
    designation VARCHAR(128) NOT NULL,
    branch VARCHAR(128) NOT NULL,
    employment_type VARCHAR(64) NOT NULL,
    base_salary_minor BIGINT NOT NULL,
    national_id VARCHAR(64) NOT NULL,
    date_of_birth VARCHAR(32) NOT NULL,
    gender VARCHAR(32) NOT NULL,
    joining_date VARCHAR(32) NOT NULL,
    probation_end_date VARCHAR(32) NULL,
    contract_end_date VARCHAR(32) NULL,
    status VARCHAR(64) NOT NULL DEFAULT 'ACTIVE',
    address TEXT NULL,
    emergency_contact_name VARCHAR(128) NULL,
    emergency_contact_phone VARCHAR(64) NULL,
    bank_account_number VARCHAR(128) NULL,
    bank_name VARCHAR(128) NULL,
    created_at VARCHAR(64) NOT NULL,
    updated_at VARCHAR(64) NOT NULL,
    INDEX idx_employees_status (status),
    INDEX idx_employees_dept (department)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS attendance_records (
    id VARCHAR(64) PRIMARY KEY,
    employee_id VARCHAR(64) NOT NULL,
    punch_time VARCHAR(64) NOT NULL,
    punch_type VARCHAR(32) NOT NULL,
    terminal_id VARCHAR(64) NOT NULL,
    verified_mode VARCHAR(64) NOT NULL DEFAULT 'FINGERPRINT',
    status VARCHAR(64) NOT NULL DEFAULT 'ON_TIME',
    late_minutes INT NOT NULL DEFAULT 0,
    overtime_minutes INT NOT NULL DEFAULT 0,
    notes TEXT NULL,
    created_at VARCHAR(64) NOT NULL,
    INDEX idx_att_emp_time (employee_id, punch_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS leave_balances (
    id VARCHAR(64) PRIMARY KEY,
    employee_id VARCHAR(64) NOT NULL,
    leave_type VARCHAR(64) NOT NULL,
    year INT NOT NULL,
    allocated_days DOUBLE NOT NULL,
    used_days DOUBLE NOT NULL DEFAULT 0,
    created_at VARCHAR(64) NOT NULL,
    updated_at VARCHAR(64) NOT NULL,
    UNIQUE KEY uk_emp_leave_year (employee_id, leave_type, year)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS leave_requests (
    id VARCHAR(64) PRIMARY KEY,
    employee_id VARCHAR(64) NOT NULL,
    leave_type VARCHAR(64) NOT NULL,
    start_date VARCHAR(32) NOT NULL,
    end_date VARCHAR(32) NOT NULL,
    days_count DOUBLE NOT NULL,
    reason TEXT NOT NULL,
    status VARCHAR(64) NOT NULL DEFAULT 'PENDING',
    approved_by VARCHAR(64) NULL,
    action_notes TEXT NULL,
    created_at VARCHAR(64) NOT NULL,
    updated_at VARCHAR(64) NOT NULL,
    INDEX idx_lr_emp (employee_id),
    INDEX idx_lr_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS salary_structures (
    id VARCHAR(64) PRIMARY KEY,
    employee_id VARCHAR(64) UNIQUE NOT NULL,
    base_salary_minor BIGINT NOT NULL,
    house_rent_minor BIGINT NOT NULL DEFAULT 0,
    medical_allowance_minor BIGINT NOT NULL DEFAULT 0,
    conveyance_minor BIGINT NOT NULL DEFAULT 0,
    special_allowance_minor BIGINT NOT NULL DEFAULT 0,
    provident_fund_rate DOUBLE NOT NULL DEFAULT 0.0833,
    tax_exempt_minor BIGINT NOT NULL DEFAULT 0,
    effective_from VARCHAR(32) NOT NULL,
    created_at VARCHAR(64) NOT NULL,
    updated_at VARCHAR(64) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS payroll_runs (
    id VARCHAR(64) PRIMARY KEY,
    month INT NOT NULL,
    year INT NOT NULL,
    status VARCHAR(64) NOT NULL DEFAULT 'DRAFT',
    total_gross_minor BIGINT NOT NULL DEFAULT 0,
    total_deductions_minor BIGINT NOT NULL DEFAULT 0,
    total_net_minor BIGINT NOT NULL DEFAULT 0,
    total_tax_minor BIGINT NOT NULL DEFAULT 0,
    total_eobi_minor BIGINT NOT NULL DEFAULT 0,
    total_provident_fund_minor BIGINT NOT NULL DEFAULT 0,
    employee_count INT NOT NULL DEFAULT 0,
    processed_by VARCHAR(64) NOT NULL,
    approved_by VARCHAR(64) NULL,
    locked_at VARCHAR(64) NULL,
    created_at VARCHAR(64) NOT NULL,
    updated_at VARCHAR(64) NOT NULL,
    UNIQUE KEY uk_month_year (month, year)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS payroll_items (
    id VARCHAR(64) PRIMARY KEY,
    payroll_run_id VARCHAR(64) NOT NULL,
    employee_id VARCHAR(64) NOT NULL,
    base_salary_minor BIGINT NOT NULL,
    allowances_minor BIGINT NOT NULL,
    gross_salary_minor BIGINT NOT NULL,
    tax_deduction_minor BIGINT NOT NULL,
    eobi_employee_minor BIGINT NOT NULL,
    eobi_employer_minor BIGINT NOT NULL,
    provident_fund_employee_minor BIGINT NOT NULL,
    provident_fund_employer_minor BIGINT NOT NULL,
    unpaid_leave_deduction_minor BIGINT NOT NULL DEFAULT 0,
    other_deductions_minor BIGINT NOT NULL DEFAULT 0,
    net_salary_minor BIGINT NOT NULL,
    status VARCHAR(64) NOT NULL DEFAULT 'PENDING',
    created_at VARCHAR(64) NOT NULL,
    INDEX idx_pi_run (payroll_run_id),
    INDEX idx_pi_emp (employee_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS payslip_templates (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(128) NOT NULL,
    is_default TINYINT(1) NOT NULL DEFAULT 0,
    header_logo_url TEXT NULL,
    primary_color VARCHAR(32) NOT NULL DEFAULT '#0f172a',
    company_name VARCHAR(255) NOT NULL,
    footer_notes TEXT NULL,
    show_eobi TINYINT(1) NOT NULL DEFAULT 1,
    show_provident_fund TINYINT(1) NOT NULL DEFAULT 1,
    show_ytd_totals TINYINT(1) NOT NULL DEFAULT 0,
    created_at VARCHAR(64) NOT NULL,
    updated_at VARCHAR(64) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS certificate_records (
    id VARCHAR(64) PRIMARY KEY,
    employee_id VARCHAR(64) NOT NULL,
    certificate_type VARCHAR(64) NOT NULL,
    issue_date VARCHAR(32) NOT NULL,
    verification_code VARCHAR(64) UNIQUE NOT NULL,
    issued_by VARCHAR(64) NOT NULL,
    content TEXT NOT NULL,
    created_at VARCHAR(64) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS job_openings (
    id VARCHAR(64) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    department VARCHAR(128) NOT NULL,
    location VARCHAR(128) NOT NULL,
    status VARCHAR(64) NOT NULL DEFAULT 'OPEN',
    headcount INT NOT NULL DEFAULT 1,
    job_description TEXT NULL,
    created_at VARCHAR(64) NOT NULL,
    updated_at VARCHAR(64) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS candidates (
    id VARCHAR(64) PRIMARY KEY,
    job_opening_id VARCHAR(64) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(191) NOT NULL,
    phone VARCHAR(64) NULL,
    current_stage VARCHAR(64) NOT NULL DEFAULT 'APPLIED',
    blind_resume_text TEXT NULL,
    score DOUBLE NULL,
    notes TEXT NULL,
    created_at VARCHAR(64) NOT NULL,
    updated_at VARCHAR(64) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS performance_reviews (
    id VARCHAR(64) PRIMARY KEY,
    employee_id VARCHAR(64) NOT NULL,
    reviewer_id VARCHAR(64) NOT NULL,
    cycle_name VARCHAR(128) NOT NULL,
    period_start VARCHAR(32) NOT NULL,
    period_end VARCHAR(32) NOT NULL,
    rating_score DOUBLE NOT NULL,
    feedback_text TEXT NOT NULL,
    status VARCHAR(64) NOT NULL DEFAULT 'DRAFT',
    created_at VARCHAR(64) NOT NULL,
    updated_at VARCHAR(64) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS local_audit_log (
    id VARCHAR(64) PRIMARY KEY,
    prev_hash VARCHAR(128) NOT NULL,
    hash VARCHAR(128) NOT NULL,
    timestamp VARCHAR(64) NOT NULL,
    actor_id VARCHAR(64) NOT NULL,
    actor_role VARCHAR(64) NOT NULL,
    action VARCHAR(128) NOT NULL,
    entity_type VARCHAR(128) NOT NULL,
    entity_id VARCHAR(64) NOT NULL,
    metadata JSON NULL,
    INDEX idx_audit_time (timestamp)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS company_settings (
    id VARCHAR(64) PRIMARY KEY,
    company_name VARCHAR(255) NOT NULL,
    contact_email VARCHAR(191) NOT NULL,
    contact_phone VARCHAR(64) NULL,
    country VARCHAR(16) NOT NULL DEFAULT 'PK',
    fiscal_year_start_month INT NOT NULL DEFAULT 7,
    standard_working_hours_per_day INT NOT NULL DEFAULT 8,
    probation_duration_months INT NOT NULL DEFAULT 3,
    updated_at VARCHAR(64) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
`;

export async function initMysqlTenantSchema(pool: mysql.Pool | mysql.Connection): Promise<void> {
  const statements = MYSQL_TENANT_SCHEMA_SQL
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  for (const statement of statements) {
    await pool.query(statement);
  }
}
