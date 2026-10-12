-- =============================================================================
-- Migration: 0001_init.sql
-- Database: hr360_master
-- Description: Master platform database schema initialization
-- Conforms to: Section 10 & 12 of HR360 Master Build Prompt
-- =============================================================================

CREATE TABLE IF NOT EXISTS platform_staff (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role ENUM('SUPER_ADMIN', 'ADMIN') NOT NULL,
    totp_secret VARCHAR(255) NULL,
    totp_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    INDEX idx_staff_role_active (role, is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS registrations (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    company_name VARCHAR(100) NOT NULL,
    admin_email VARCHAR(255) NOT NULL,
    admin_password_hash VARCHAR(255) NOT NULL,
    admin_full_name VARCHAR(100) NOT NULL,
    phone VARCHAR(30) NOT NULL,
    country VARCHAR(2) NOT NULL,
    estimated_employees INT NULL,
    status ENUM('PENDING', 'APPROVED', 'REJECTED', 'PROVISIONING', 'ACTIVE', 'PROVISION_FAILED') NOT NULL DEFAULT 'PENDING',
    rejection_reason TEXT NULL,
    approved_at DATETIME(3) NULL,
    approved_by_staff_id VARCHAR(36) NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    INDEX idx_registrations_status_created (status, created_at),
    INDEX idx_registrations_email (admin_email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS companies (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    registration_id VARCHAR(36) NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(40) NOT NULL UNIQUE,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    CONSTRAINT fk_companies_registration FOREIGN KEY (registration_id) REFERENCES registrations (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tenants (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    company_id VARCHAR(36) NOT NULL UNIQUE,
    database_name VARCHAR(64) NOT NULL UNIQUE,
    db_user VARCHAR(64) NOT NULL,
    encrypted_connection_info TEXT NOT NULL,
    schema_version INT NOT NULL DEFAULT 0,
    status ENUM('PENDING', 'ACTIVE', 'INACTIVE', 'EXPIRED', 'SUSPENDED', 'REJECTED', 'PROVISION_FAILED', 'MIGRATION_BLOCKED') NOT NULL DEFAULT 'PENDING',
    migration_blocked_reason TEXT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    CONSTRAINT fk_tenants_company FOREIGN KEY (company_id) REFERENCES companies (id) ON DELETE CASCADE,
    INDEX idx_tenants_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS company_users (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    company_id VARCHAR(36) NOT NULL,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'COMPANY_ADMIN',
    totp_secret VARCHAR(255) NULL,
    totp_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    last_login_at DATETIME(3) NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    UNIQUE KEY uq_company_user (company_id, email),
    INDEX idx_company_users_email (email),
    CONSTRAINT fk_company_users_company FOREIGN KEY (company_id) REFERENCES companies (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sessions (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    token_hash VARCHAR(64) NOT NULL UNIQUE,
    ip_address VARCHAR(45) NULL,
    user_agent TEXT NULL,
    expires_at DATETIME(3) NOT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    INDEX idx_sessions_user_expires (user_id, expires_at),
    CONSTRAINT fk_sessions_user FOREIGN KEY (user_id) REFERENCES company_users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS otps (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    code_hash VARCHAR(64) NOT NULL,
    purpose VARCHAR(32) NOT NULL,
    expires_at DATETIME(3) NOT NULL,
    used_at DATETIME(3) NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    INDEX idx_otps_lookup (email, purpose, expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS plans (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    code VARCHAR(32) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    description TEXT NULL,
    price_monthly DECIMAL(14, 4) NOT NULL,
    price_annual DECIMAL(14, 4) NOT NULL,
    max_employees INT NOT NULL,
    max_branches INT NOT NULL,
    max_installs INT NOT NULL,
    features TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS subscriptions (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    company_id VARCHAR(36) NOT NULL,
    plan_id VARCHAR(36) NOT NULL,
    interval_unit ENUM('MONTHLY', 'ANNUAL') NOT NULL DEFAULT 'MONTHLY',
    starts_at DATETIME(3) NOT NULL,
    expires_at DATETIME(3) NOT NULL,
    grace_days INT NOT NULL DEFAULT 0,
    auto_renew BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    CONSTRAINT fk_subscriptions_company FOREIGN KEY (company_id) REFERENCES companies (id) ON DELETE CASCADE,
    CONSTRAINT fk_subscriptions_plan FOREIGN KEY (plan_id) REFERENCES plans (id),
    INDEX idx_subscriptions_company_expires (company_id, expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS invoices (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    company_id VARCHAR(36) NOT NULL,
    subscription_id VARCHAR(36) NULL,
    invoice_number VARCHAR(50) NOT NULL UNIQUE,
    status ENUM('DRAFT', 'ISSUED', 'PAID', 'VOID', 'OVERDUE') NOT NULL DEFAULT 'ISSUED',
    amount_subtotal DECIMAL(14, 4) NOT NULL,
    amount_tax DECIMAL(14, 4) NOT NULL,
    amount_total DECIMAL(14, 4) NOT NULL,
    issued_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    due_at DATETIME(3) NOT NULL,
    paid_at DATETIME(3) NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    CONSTRAINT fk_invoices_company FOREIGN KEY (company_id) REFERENCES companies (id),
    CONSTRAINT fk_invoices_subscription FOREIGN KEY (subscription_id) REFERENCES subscriptions (id),
    INDEX idx_invoices_company_status (company_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS payments (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    invoice_id VARCHAR(36) NOT NULL,
    amount DECIMAL(14, 4) NOT NULL,
    method ENUM('CARD', 'BANK_TRANSFER', 'LOCAL_WALLET', 'MANUAL_ADMIN') NOT NULL,
    status ENUM('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED') NOT NULL DEFAULT 'COMPLETED',
    reference_number VARCHAR(100) NULL,
    notes TEXT NULL,
    recorded_by_staff VARCHAR(36) NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    CONSTRAINT fk_payments_invoice FOREIGN KEY (invoice_id) REFERENCES invoices (id),
    INDEX idx_payments_invoice_status (invoice_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS device_installs (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    company_id VARCHAR(36) NOT NULL,
    device_hash VARCHAR(64) NOT NULL,
    device_name VARCHAR(100) NULL,
    os_version VARCHAR(50) NULL,
    app_version VARCHAR(32) NOT NULL,
    is_revoked BOOLEAN NOT NULL DEFAULT FALSE,
    last_seen_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    UNIQUE KEY uq_device_install (company_id, device_hash),
    INDEX idx_device_installs_revoked (company_id, is_revoked),
    CONSTRAINT fk_device_installs_company FOREIGN KEY (company_id) REFERENCES companies (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS heartbeats (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    company_id VARCHAR(36) NOT NULL,
    device_id VARCHAR(36) NOT NULL,
    app_version VARCHAR(32) NOT NULL,
    ip_address VARCHAR(45) NULL,
    timestamp DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    CONSTRAINT fk_heartbeats_company FOREIGN KEY (company_id) REFERENCES companies (id) ON DELETE CASCADE,
    INDEX idx_heartbeats_company_time (company_id, timestamp)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS leads (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    work_email VARCHAR(255) NOT NULL,
    company_name VARCHAR(100) NOT NULL,
    ip_hash VARCHAR(64) NOT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    INDEX idx_leads_email (work_email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS releases (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    version VARCHAR(32) NOT NULL UNIQUE,
    channel VARCHAR(32) NOT NULL DEFAULT 'stable',
    notes TEXT NULL,
    download_url VARCHAR(500) NOT NULL,
    sha256 VARCHAR(64) NOT NULL,
    is_mandatory BOOLEAN NOT NULL DEFAULT FALSE,
    min_version VARCHAR(32) NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS download_events (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    lead_id VARCHAR(36) NULL,
    user_id VARCHAR(36) NULL,
    version VARCHAR(32) NOT NULL,
    ip_hash VARCHAR(64) NOT NULL,
    user_agent TEXT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    INDEX idx_downloads_created (created_at),
    CONSTRAINT fk_downloads_lead FOREIGN KEY (lead_id) REFERENCES leads (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS migration_runs (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    tenant_slug VARCHAR(40) NOT NULL,
    migration_name VARCHAR(100) NOT NULL,
    checksum VARCHAR(64) NOT NULL,
    execution_time_ms INT NOT NULL,
    status VARCHAR(20) NOT NULL,
    error_message TEXT NULL,
    applied_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    INDEX idx_migration_runs_tenant (tenant_slug, migration_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS announcements (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    starts_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    expires_at DATETIME(3) NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS feature_flags (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    flag_key VARCHAR(64) NOT NULL UNIQUE,
    description VARCHAR(255) NULL,
    is_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    rules_json TEXT NULL,
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
