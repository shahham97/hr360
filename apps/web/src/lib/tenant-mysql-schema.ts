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
    date VARCHAR(32) NOT NULL,
    check_in VARCHAR(32) NULL,
    check_out VARCHAR(32) NULL,
    status VARCHAR(32) NOT NULL,
    work_minutes INT NOT NULL DEFAULT 0,
    overtime_minutes INT NOT NULL DEFAULT 0,
    source VARCHAR(32) NOT NULL DEFAULT 'BIOMETRIC',
    is_manual_override TINYINT(1) NOT NULL DEFAULT 0,
    verified_by_device_id VARCHAR(64) NULL,
    device_signature VARCHAR(255) NULL,
    created_at VARCHAR(64) NOT NULL,
    updated_at VARCHAR(64) NOT NULL,
    INDEX idx_att_emp_date (employee_id, date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS leave_requests (
    id VARCHAR(64) PRIMARY KEY,
    employee_id VARCHAR(64) NOT NULL,
    leave_type VARCHAR(64) NOT NULL,
    start_date VARCHAR(32) NOT NULL,
    end_date VARCHAR(32) NOT NULL,
    total_days INT NOT NULL,
    reason TEXT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    applied_at VARCHAR(64) NOT NULL,
    decided_by VARCHAR(64) NULL,
    decided_at VARCHAR(64) NULL,
    rejection_reason TEXT NULL,
    created_at VARCHAR(64) NOT NULL,
    updated_at VARCHAR(64) NOT NULL,
    INDEX idx_leave_emp (employee_id),
    INDEX idx_leave_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS payroll_runs (
    id VARCHAR(64) PRIMARY KEY,
    period_name VARCHAR(64) NOT NULL,
    start_date VARCHAR(32) NOT NULL,
    end_date VARCHAR(32) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'DRAFT',
    total_employees INT NOT NULL DEFAULT 0,
    total_gross_minor BIGINT NOT NULL DEFAULT 0,
    total_deductions_minor BIGINT NOT NULL DEFAULT 0,
    total_net_payable_minor BIGINT NOT NULL DEFAULT 0,
    total_eobi_employer_minor BIGINT NOT NULL DEFAULT 0,
    is_locked TINYINT(1) NOT NULL DEFAULT 0,
    created_at VARCHAR(64) NOT NULL,
    updated_at VARCHAR(64) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS payroll_items (
    id VARCHAR(64) PRIMARY KEY,
    payroll_run_id VARCHAR(64) NOT NULL,
    employee_id VARCHAR(64) NOT NULL,
    base_salary_minor BIGINT NOT NULL,
    allowances_minor BIGINT NOT NULL DEFAULT 0,
    gross_pay_minor BIGINT NOT NULL,
    income_tax_minor BIGINT NOT NULL DEFAULT 0,
    eobi_employee_minor BIGINT NOT NULL DEFAULT 0,
    eobi_employer_minor BIGINT NOT NULL DEFAULT 0,
    provident_fund_minor BIGINT NOT NULL DEFAULT 0,
    custom_deductions_minor BIGINT NOT NULL DEFAULT 0,
    total_deductions_minor BIGINT NOT NULL DEFAULT 0,
    net_pay_minor BIGINT NOT NULL,
    days_worked INT NOT NULL DEFAULT 30,
    days_in_month INT NOT NULL DEFAULT 30,
    bank_account_number VARCHAR(128) NULL,
    bank_name VARCHAR(128) NULL,
    created_at VARCHAR(64) NOT NULL,
    INDEX idx_payroll_run (payroll_run_id),
    INDEX idx_payroll_emp (employee_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS inventory_items (
    id VARCHAR(64) PRIMARY KEY,
    asset_tag VARCHAR(64) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(64) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'AVAILABLE',
    serial_number VARCHAR(128) NULL,
    assigned_to_employee_id VARCHAR(64) NULL,
    assigned_date VARCHAR(32) NULL,
    purchase_date VARCHAR(32) NULL,
    purchase_cost_minor BIGINT NOT NULL DEFAULT 0,
    created_at VARCHAR(64) NOT NULL,
    updated_at VARCHAR(64) NOT NULL,
    INDEX idx_inv_status (status),
    INDEX idx_inv_assigned (assigned_to_employee_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS audit_logs (
    id VARCHAR(64) PRIMARY KEY,
    timestamp VARCHAR(64) NOT NULL,
    actor VARCHAR(191) NOT NULL,
    action VARCHAR(128) NOT NULL,
    module VARCHAR(64) NOT NULL,
    entity_id VARCHAR(64) NOT NULL,
    details TEXT NULL,
    ip_address VARCHAR(64) NULL,
    entry_hash VARCHAR(64) NOT NULL,
    previous_hash VARCHAR(64) NOT NULL,
    signature VARCHAR(255) NULL,
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
