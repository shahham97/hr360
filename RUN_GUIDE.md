# HR360 — Operational Run Guide & Live Console Manual

This document provides exact instructions to run the web portal, access the Admin and secret Super Admin live consoles, and execute and validate the desktop client.

---

## 1. Prerequisites Check
1. **Database Service**: Ensure the local database service is active on port 3306.
2. **Environment Configuration**: Configured in `.env` and `apps/web/.env.local`.

---

## 2. How to Start the Web Portal & API

Run the following command in PowerShell from the project root (`d:\HR360`):

```powershell
pnpm --filter @hr360/web run dev
```

The portal will start on **`http://localhost:3000`**.

### What to Verify on the Web Portal:
* **Landing Page (`http://localhost:3000`)**:
  - Click **"Download Client"** or the download button.
  - A modal appears requesting Full Name, Work Email, Company Name, and Consent.
  - Submitting it triggers `POST /api/v1/download/request`, logs a Lead, records the client IP hash, and returns a signed 5-minute URL with SHA-256 verification.

---

## 3. How Platform Administrator Logs In

Administrators sign in through the console gateway.

### Access URL:
Open **`http://localhost:3000/admin`** in your browser.

### Credentials:
* **Platform Administrator**:
  - **Email / Username**: `admin` or `admin@hr360.local`
  - **Role Badge**: `ADMIN`
  - **Administrator Capabilities**:
    - Manage customer company registrations and tenant moderation.
    - Provision licenses, manage plans, and inspect usage.

### Company Registration Moderation Queue:
1. When a company registers (via Desktop or API `POST /api/v1/registrations`), it enters the queue with status `PENDING`.
2. In the Admin console under **Registrations Queue**, the request is displayed.
3. Click **"Approve & Provision"** to trigger the dynamic tenant DB provisioning pipeline, or **"Reject"** with a stated reason.

---

## 4. How the Desktop Client Runs and Validates

The desktop client is a Windows-only client built with Tauri v2 (Rust core + WebView2 + React UI).

### How to Run the Desktop Frontend:
```powershell
pnpm --filter @hr360/desktop run dev
```
Open **`http://localhost:1420`** in your browser to inspect the desktop interface.

### Zero-Offline Policy & Validation Mechanism (Section 7 & 9):
The desktop client enforces an uncompromising zero-offline policy:
1. **Live Heartbeat**:
   - The desktop client continuously pings `POST /api/v1/desktop/heartbeat` with its salted hardware hash (`deviceHash`) and application version.
   - The server verifies tenant status and returns whether the client is active or revoked.
2. **Instant Revocation (SSE Stream)**:
   - The desktop shell maintains an active Server-Sent Events connection to `GET /api/v1/events/status?companyId=<companyId>`.
   - If an Administrator toggles a company to `INACTIVE`, or if the subscription expires (`EXPIRED`), the server broadcasts a status event.
   - Within seconds, the desktop application enters the **"Access Locked"** screen.
   - No data is saved to disk; in-progress form entries exist in volatile memory only.

---

## 5. Verification Commands

To verify all packages, cryptographic engines, and contract tests:

```powershell
# Run full build across all packages
pnpm run build

# Run all test suites
pnpm run test

# Verification of database connection health
node --env-file=.env packages/tenancy/dist/verify-db-connection.js
```
