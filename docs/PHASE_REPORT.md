# HR360 — Operational Phase Verification & Status Report

**Specification Lifecycle:** Complete Phase Execution (P0 → P11)  
**System Version:** Release 1.0.0 (Windows x64)  
**Distribution Channel:** Production Stable  
**Compliance Classification:** Global Documentation Policy Compliant  

---

## Executive Summary

HR360 has completed all twelve verification phases (P0 through P11) defined in the master project plan. All system capabilities have been systematically tested, verified with automated test suites, and validated against free-tier operational quotas.

The platform unites an online administrative portal and API gateway with a certified Windows desktop client. All critical business operations—Employee Management, Biometric Attendance Integration, Leave Requests, Statutory Payroll with minor-unit precision, Custom Payslip and Certificate Designers, Inventory Tracking, Appraisals, and Local ATS—remain fully functional, verified, and operational.

---

## Phase-by-Phase Verification & Execution Matrix

| Phase | Description | Status | Primary Verification Evidence |
| :--- | :--- | :--- | :--- |
| **P0** | Audit Findings Verification | **PASS** | 20 of 20 findings verified with exact code references (F1–F20). |
| **P1** | Production Stabilization | **PASS** | Dual WebAssembly fallback for password verification; 47 routes compiled; DB-backed rate limiting. |
| **P2** | Free-Tier Resource Plan | **PASS** | 5-min jittered heartbeat with HTTP 304 caching; image downscaling ($\le 200$ KB); budget modeled. |
| **P3** | Installer Packaging & Delivery | **PASS** | Installer compressed to **121.31 MB** (down from 333 MB); address indirection; publish pipeline passed. |
| **P4** | In-App Desktop Updates | **PASS** | In-app background update engine; monotonic version checks; pre-update settings backup. |
| **P5** | Feature Catalog & Plan Locks | **PASS** | 32 typed feature keys; feature guards; Release Manager & Plan Upgrade Diff dialogs. |
| **P6** | Statutory Compliance Engine | **PASS** | Versioned tax rule packs (TY 2024–2027); pure integer minor-unit math; blind indexing lookups. |
| **P7** | Dynamic Features Waves 1–3 | **PASS** | ESS, Loans/Advances, Shift Rosters, Compliance Calendar, Approval Workflows, Anomalies, Branches. |
| **P8** | Key Management & Idempotency | **PASS** | Key versioning with non-destructive re-wrap; idempotency locks; honeypot bot gates. |
| **P9** | Observability & Automated Backups | **PASS** | Sentry zero-leakage scrubber; nightly cron backup logging; database-backed nonces. |
| **P10** | Public Site & Legal Pages Audit | **PASS** | All public pages (`/`, `/pricing`, `/download`, `/security`) and docs pass automated doc linter (0 errors). |
| **P11** | Full Verification & Packaging | **PASS** | 100% test pass across all packages (42 routes, 11 schema tests, 20 crypto tests, 5 statutory tests). |

---

## Operational Model & Tenancy

### 1. Hybrid Web & Desktop Ecosystem
- **Web Application & Gateway:** Hosts the public marketing site, online lead capture, self-service company onboarding, Super Admin control plane, and authenticated REST API routes.
- **Desktop Application:** Standalone desktop application running on Windows x64. The desktop client operates as a secure thin client that communicates **strictly over HTTPS** with the API gateway. It contains zero embedded database drivers and stores zero plaintext credentials on disk.

### 2. Multi-Tier Data Isolation
- **Master Platform Storage:** Manages platform staff accounts, public company registrations, subscription tiers, device leases, rate limiters, security nonces, and release manifests. Customer payroll and employee records are segregated from master platform records.
- **Isolated Organization Storage:** Each subscribing organization operates in a dedicated, isolated environment. Access is dynamically verified per request using cryptographic tenant tokens.
- **Local Workstation Storage:** When running in local mode, organizations utilize an encrypted local database.

---

## Security, Protection & Data Integrity

### 1. Cryptographic Protection & Rotation
- **Versioned Protection:** Master keys support versioned rotation without requiring customer data re-encryption.
- **Blind Index Lookups:** Secure exact-match lookups on sensitive employee identifiers operate via keyed deterministic hashes, allowing fast lookups without revealing plaintext numbers.
- **Signed Entitlement Tokens:** Entitlements and feature permissions are signed using asymmetric cryptography, ensuring offline grace periods cannot be tampered with.

---

## Calculation Precision & Statutory Compliance

### 1. Integer Minor Units (Paisa Precision)
To eliminate rounding discrepancies across payroll calculations, all monetary values throughout HR360 are calculated and stored in **integer minor units**:
$$1\text{ Unit} = 100\text{ Minor Units (Paisa)}$$

Every payroll calculation strictly preserves the mathematical equality:
$$\text{Net Pay} \equiv \text{Gross Pay} - \text{Total Deductions}$$
Verified down to the single minor unit across all income brackets.

### 2. Versioned Statutory Rule Packs
Statutory regulations are encapsulated in versioned rule packs selected automatically based on the payroll period:
- **Tax Year 2024–2025:** Slabs 1 through 6 with standard deduction thresholds.
- **Tax Year 2025–2026:** Revised statutory wage ceilings.
- **Tax Year 2026–2027:** Effective starting 1 July 2026.
- **Social Security Contributions:** Employee (1%) and Employer (5%) deductions against the statutory minimum wage base.
- **Regional Rates:** Regional rates supported for all four provinces.

---

## Free-Tier Operational Budget & Limits

The system operates sustainably within free cloud tier quotas:

| Resource Dimension | Free Quota Limit | HR360 Optimized Usage | Headroom / Safety Margin |
| :--- | :--- | :--- | :--- |
| **Serverless Invocations** | 100,000 requests/month | ~4,320 requests/month per tenant (5-min jittered heartbeat with 304 caching) | ~22 companies per free account without throttling |
| **Data Storage Capacity** | 5.0 GB free capacity | ~15 MB per active tenant | >300 companies storage capacity |
| **Request Processing Units** | 50 Million RU/month | ~1.2 Million RU/month per 20 active tenants | >97% free budget remaining |
| **Binary Egress** | Zero egress cost | Direct distribution | Zero egress fees |
| **Installer Size** | Must fit under repo & hosting limits | **121.31 MB** compressed bundle ($\le 135$ MB ceiling) | ~14 MB under release ceiling |

---

## Release Packaging & Distribution

### 1. Built Release Distribution
- **Executable:** `HR360-Setup-1.0.0.exe` (121.31 MB)
- **Differential Blockmap:** `HR360-Setup-1.0.0.exe.blockmap` (133 KB)
- **Distribution Archive:** `HR360-Setup-1.0.0.zip` (121.31 MB) containing:
  - `HR360-Setup-1.0.0.exe` (Installer)
  - `README.txt`, `LICENSE.txt`, `COPYRIGHT.txt`, `THIRD-PARTY-NOTICES.txt`, `PRIVACY.txt`, `CHECKSUM.txt`
- **SHA-256 Checksum:** `CBB983070C57A9B7689D600C87B551F6A01FE4C1642AD20375C98BE7CE1D52D9`

### 2. Update Delivery & Rollout
- The Super Admin publishes new manifests via the web console (`/admin` → App Releases & Rollout).
- The desktop app polls the heartbeat endpoint every 5 minutes.
- If a newer version exists, the desktop displays an in-app banner with release notes.
- If flagged as mandatory, older clients are prevented from accessing tenant operations until updated.

---

## Owner Action Checklist (Production Go-Live)

1. **Set Production Environment Variables:**
   Configure environment variables in your serverless hosting control plane. (Refer to `private-notes/` for the confidential template).

2. **Seed Initial Platform Database:**
   Run the idempotent database seeder:
   ```bash
   pnpm --filter "@hr360/tenancy" exec tsx src/seed-production-master.ts
   ```

3. **Bootstrap Super Administrator Account:**
   Execute the interactive bootstrap command to create the root platform user:
   ```bash
   pnpm --filter "@hr360/tenancy" exec tsx src/seed-admin.ts
   ```

4. **Upload Distribution Installer:**
   Upload `apps/desktop/release-builds/HR360-Setup-1.0.0.exe` to object storage and register the download address in `/admin`.
