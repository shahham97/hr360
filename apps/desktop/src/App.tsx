import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Users,
  DollarSign,
  Briefcase,
  LogIn,
  UserPlus,
  LogOut,
  LayoutDashboard,
  Calendar,
  FileText,
  Award,
  TrendingUp,
  Building2,
  Bell,
  Settings,
  ChevronDown,
  Fingerprint,
  Lock,
  WifiOff,
  RefreshCw,
  Package,
  Database
} from 'lucide-react';

import {
  Employee,
  AttendanceRecord,
  BiometricDevice,
  LeaveRequest,
  PayrollRun,
  PayslipTemplate,
  CertificateTemplate,
  BenefitPlan,
  AppraisalCycle,
  AppraisalRecord,
  JobOpening,
  Candidate,
  InterviewSchedule,
  AuditLogEntry,
  CompanySession,
  UserSession
} from './types/hr-types';

import {
  INITIAL_EMPLOYEES,
  INITIAL_ATTENDANCE,
  INITIAL_LEAVES,
  INITIAL_PAYROLL_RUNS,
  INITIAL_PAYSLIP_TEMPLATES,
  INITIAL_CERTIFICATE_TEMPLATES,
  INITIAL_BENEFITS,
  INITIAL_APPRAISAL_CYCLES,
  INITIAL_APPRAISAL_RECORDS,
  INITIAL_JOBS,
  INITIAL_CANDIDATES,
  INITIAL_INTERVIEWS,
  INITIAL_AUDIT_LOGS
} from './utils/initial-data';

// Specialized Modules
import { DashboardModule } from './modules/DashboardModule';
import { EmployeeModule } from './modules/EmployeeModule';
import { AttendanceModule } from './modules/AttendanceModule';
import { LeaveModule } from './modules/LeaveModule';
import { PayrollModule } from './modules/PayrollModule';
import { PayslipTemplateModule } from './modules/PayslipTemplateModule';
import { CertificatesModule } from './modules/CertificatesModule';
import { PerformanceAndBenefitsModule } from './modules/PerformanceAndBenefitsModule';
import { RecruitmentModule } from './modules/RecruitmentModule';
import { InventoryModule } from './modules/InventoryModule';
import { DatabaseManagementModule } from './modules/DatabaseManagementModule';
import { SystemAndSecurityModule } from './modules/SystemAndSecurityModule';
import { ErrorBoundary } from './ErrorBoundary';
import appIcon from './assets/icon.png';

// ---------------------------------------------------------------------------
// IPC-aware fetch: uses Electron native fetch (no CORS) when in desktop app,
// falls back to browser fetch when running in dev server / browser.
// ---------------------------------------------------------------------------
async function apiFetch(url: string, init?: RequestInit): Promise<Response> {
  const bridge = (window as any).hr360Desktop;
  if (bridge?.apiRequest) {
    const hdrs: Record<string, string> = {};
    if (init?.headers) {
      const h = init.headers as Record<string, string>;
      Object.keys(h).forEach((k) => { hdrs[k] = h[k]; });
    }
    const result = await bridge.apiRequest({
      url,
      method: init?.method || 'GET',
      headers: hdrs,
      body: init?.body ? (typeof init.body === 'string' ? init.body : undefined) : undefined,
    });
    // Build a Response-like object so callers work unchanged
    const status = (result.status >= 200 && result.status <= 599) ? result.status : 503;
    const body = typeof result.data === 'string'
      ? result.data
      : JSON.stringify(result.data || { error: { code: 'NETWORK_ERROR', message: result.error || result.statusText || 'Unable to reach HR360 Cloud Services' } });
    return new Response(body, {
      status,
      statusText: result.statusText || (status === 503 ? 'Service Unavailable' : 'OK'),
      headers: { 'content-type': 'application/json' },
    });
  }
  return fetch(url, init);
}

const DEFAULT_PAYROLL_RUN: PayrollRun = {
  id: 'run-initial',
  periodName: 'October 2026',
  startDate: '2026-10-01',
  endDate: '2026-10-31',
  status: 'DRAFT',
  totalEmployees: 0,
  totalGross: 0,
  totalDeductions: 0,
  totalNetPayable: 0,
  totalEobiEmployer: 0,
  isLocked: false,
};

const FALLBACK_SAMPLE_EMPLOYEE: Employee = {
  id: 'emp-sample-default',
  employeeCode: 'EMP-001',
  firstName: 'Sample',
  lastName: 'Employee',
  email: 'employee@company.com',
  phone: '+92 300 0000000',
  gender: 'Unspecified',
  dateOfBirth: '1995-01-01',
  nationalId: '42101-0000000-0',
  department: 'Administration',
  designation: 'Operations Specialist',
  branch: 'Headquarters',
  employmentType: 'PERMANENT',
  status: 'ACTIVE',
  joiningDate: '2026-01-01',
  baseSalary: 100000,
  bankName: 'Standard Chartered',
  bankAccount: 'PK00SCBL0000000000000000',
};

export default function App() {
  const [mode, setMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');
  const [session, setSession] = useState<{ user: UserSession; company: CompanySession; accessToken?: string } | null>(() => {
    try {
      const raw = localStorage.getItem('hr360_desktop_session');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.company?.status === 'LOCKED') {
          parsed.company.status = 'ACTIVE';
        }
        return parsed;
      }
      return null;
    } catch {
      return null;
    }
  });

  const handleLogout = () => {
    try {
      localStorage.removeItem('hr360_desktop_session');
    } catch {}
    setSession(null);
  };

  // Sign In Form States (Strictly Blank by default)
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');

  // Register Form States
  const [regCompanyName, setRegCompanyName] = useState('');
  const [regAdminName, setRegAdminName] = useState('');
  const [regAdminEmail, setRegAdminEmail] = useState('');
  const [regAdminPassword, setRegAdminPassword] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regCountry, setRegCountry] = useState('PK');
  const [regPlanTier, setRegPlanTier] = useState<'STARTER' | 'GROWTH' | 'ENTERPRISE'>('STARTER');
  const [regInterval, setRegInterval] = useState<'MONTHLY' | 'ANNUAL' | 'LIFETIME'>('MONTHLY');
  const [regLoading, setRegLoading] = useState(false);
  const [regSuccessNotice, setRegSuccessNotice] = useState('');
  const [regError, setRegError] = useState('');

  // Master Server Endpoint (Auto-configured)
  const [serverUrl] = useState<string>(() => {
    try {
      const stored = localStorage.getItem('hr360_server_url');
      if (stored) return stored;
    } catch {}
    if (typeof window !== 'undefined' && window.location.origin.startsWith('http') && !window.location.origin.includes(':1420')) {
      return window.location.origin;
    }
    // Dynamic address indirection (F19)
    try {
      const { getActiveServerAddress } = require('./utils/remote-config');
      return getActiveServerAddress();
    } catch {
      return (import.meta as any).env?.VITE_API_URL || 'https://hr360-w3fm.vercel.app';
    }
  });
  const cleanUrl = serverUrl.replace(/\/$/, '');

  // Active Workspace Tab Navigation
  type TabType =
    | 'dashboard'
    | 'employees'
    | 'attendance'
    | 'leaves'
    | 'payroll'
    | 'payslip-template'
    | 'certificates'
    | 'performance'
    | 'recruitment'
    | 'inventory'
    | 'database'
    | 'system';

  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [companyStatus, setCompanyStatus] = useState<'ACTIVE' | 'INACTIVE' | 'EXPIRED' | 'LOCKED'>('ACTIVE');
  const [lockReason, setLockReason] = useState<string>('');
  const [upgradeModal, setUpgradeModal] = useState<{ open: boolean; moduleName: string; requiredPlan: string } | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'ONLINE' | 'NO_INTERNET' | 'SERVICE_UNAVAILABLE'>(
    navigator.onLine ? 'ONLINE' : 'NO_INTERNET'
  );
  const [lastConnectedAt, setLastConnectedAt] = useState<string>(new Date().toLocaleTimeString());
  const [retryCountdown, setRetryCountdown] = useState(10);
  const [updateInfo, setUpdateInfo] = useState<{
    updateAvailable: boolean;
    currentVersion?: string;
    latestVersion?: string;
    downloadUrl?: string;
    notes?: string;
    isMandatory?: boolean;
    requiresImmediateUpdate?: boolean;
  } | null>(null);
  const [showUpdateDialog, setShowUpdateDialog] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateDownloaded, setUpdateDownloaded] = useState(false);

  // Monitor network connectivity & health probe
  useEffect(() => {
    let active = true;
    let backoffMs = 2000;

    const checkHealth = async () => {
      if (!navigator.onLine) {
        if (active) setConnectionStatus('NO_INTERNET');
        return;
      }
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);
        const res = await apiFetch(`${cleanUrl}/api/v1/health`, { signal: controller.signal });
        clearTimeout(timeoutId);
        if (active) {
          if (res.ok) {
            setConnectionStatus('ONLINE');
            setLastConnectedAt(new Date().toLocaleTimeString());
            backoffMs = 2000;
          } else {
            setConnectionStatus('SERVICE_UNAVAILABLE');
            backoffMs = Math.min(30000, backoffMs * 1.5);
          }
        }
      } catch {
        if (active) {
          if (!navigator.onLine) {
            setConnectionStatus('NO_INTERNET');
          } else {
            setConnectionStatus('SERVICE_UNAVAILABLE');
          }
          backoffMs = Math.min(30000, backoffMs * 1.5);
        }
      }
    };

    const handleOnline = () => {
      checkHealth();
    };
    const handleOffline = () => {
      setConnectionStatus('NO_INTERNET');
      setRetryCountdown(10);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const interval = setInterval(checkHealth, 15000);

    return () => {
      active = false;
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [serverUrl]);

  // Auto-retry countdown timer when disconnected
  useEffect(() => {
    if (connectionStatus === 'ONLINE') return;
    const timer = setInterval(() => {
      setRetryCountdown((prev) => {
        if (prev <= 1) {
          if (navigator.onLine) {
            fetch(`${cleanUrl}/api/v1/health`)
              .then((r) => {
                if (r.ok) {
                  setConnectionStatus('ONLINE');
                  setLastConnectedAt(new Date().toLocaleTimeString());
                } else {
                  setConnectionStatus('SERVICE_UNAVAILABLE');
                }
              })
              .catch(() => setConnectionStatus(navigator.onLine ? 'SERVICE_UNAVAILABLE' : 'NO_INTERNET'));
          }
          return 10;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [connectionStatus, serverUrl]);

  // Check for updates on mount and every 4 hours with jitter (Batch A requirement)
  useEffect(() => {
    const runUpdateCheck = () => {
      if (typeof window !== 'undefined' && window.hr360Desktop?.checkUpdate) {
        window.hr360Desktop.checkUpdate(serverUrl).then((info) => {
          if (info && info.updateAvailable) {
            setUpdateInfo(info);
          }
        }).catch(() => {});
      }
    };

    runUpdateCheck();

    // 4 hours with +/- 15 min random jitter
    const intervalMs = (4 * 60 * 60 + Math.floor((Math.random() - 0.5) * 30 * 60)) * 1000;
    const timer = setInterval(runUpdateCheck, intervalMs);

    return () => clearInterval(timer);
  }, [serverUrl]);

  // Dynamic HR Data State (Empty for dynamic companies)
  const [employees, setEmployees] = useState<Employee[]>(() => (session ? [] : INITIAL_EMPLOYEES));
  const [devices, setDevices] = useState<BiometricDevice[]>(() => {
    try {
      const stored = localStorage.getItem('hr360_biometric_terminals');
      if (stored) return JSON.parse(stored);
    } catch {}
    return [];
  });

  useEffect(() => {
    try {
      localStorage.setItem('hr360_biometric_terminals', JSON.stringify(devices));
    } catch {}
  }, [devices]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>(() => (session ? [] : INITIAL_ATTENDANCE));
  const [leaves, setLeaves] = useState<LeaveRequest[]>(() => (session ? [] : INITIAL_LEAVES));
  const [payrollRuns, setPayrollRuns] = useState<PayrollRun[]>(() => (session ? [] : INITIAL_PAYROLL_RUNS));
  const [payslipTemplate, setPayslipTemplate] = useState<PayslipTemplate>(() => {
    const base = INITIAL_PAYSLIP_TEMPLATES[0]!;
    return session?.company?.name ? { ...base, companyName: session.company.name } : base;
  });
  const [certTemplates, setCertTemplates] = useState<CertificateTemplate[]>(INITIAL_CERTIFICATE_TEMPLATES);
  const [benefits, setBenefits] = useState<BenefitPlan[]>(() => (session ? [] : INITIAL_BENEFITS));
  const [appraisalCycles, setAppraisalCycles] = useState<AppraisalCycle[]>(() => (session ? [] : INITIAL_APPRAISAL_CYCLES));
  const [appraisalRecords, setAppraisalRecords] = useState<AppraisalRecord[]>(() => (session ? [] : INITIAL_APPRAISAL_RECORDS));
  const [jobs, setJobs] = useState<JobOpening[]>(() => (session ? [] : INITIAL_JOBS));
  const [candidates, setCandidates] = useState<Candidate[]>(() => {
    try {
      const stored = localStorage.getItem('hr360_ats_candidates');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return session ? [] : INITIAL_CANDIDATES;
  });

  useEffect(() => {
    try {
      localStorage.setItem('hr360_ats_candidates', JSON.stringify(candidates));
    } catch {}
  }, [candidates]);
  const [interviews, setInterviews] = useState<InterviewSchedule[]>(() => (session ? [] : INITIAL_INTERVIEWS));
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(() => (session ? [] : INITIAL_AUDIT_LOGS));

  // Dynamically load company employees from allocated database
  const loadEmployeesFromApi = async () => {
    if (!session?.company?.id) return;
    try {
      const clean = serverUrl.replace(/\/$/, '');
      const token = (session as any)?.accessToken || localStorage.getItem('hr360_access_token');
      const res = await apiFetch(`${clean}/api/v1/employees`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'x-company-id': session.company.id,
        },
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data?.data)) {
          setEmployees(
            data.data.map((r: any) => ({
              id: r.id,
              employeeCode: r.employeeCode,
              firstName: r.firstName,
              lastName: r.lastName,
              email: r.email,
              phone: r.phone || '',
              gender: r.gender || 'OTHER',
              dateOfBirth: r.dateOfBirth?.slice(0, 10) || '1995-01-01',
              nationalId: r.nationalId || '********',
              department: r.department || 'General',
              designation: r.designation || 'Staff Member',
              branch: r.branch || 'Main Branch',
              employmentType: r.employmentType || 'PERMANENT',
              status: r.status || 'ACTIVE',
              joiningDate: r.joiningDate?.slice(0, 10) || '2026-01-01',
              baseSalary: Number(r.baseSalary || 100000),
              bankName: r.bankName || '',
              bankAccount: r.bankAccount || '',
            }))
          );
        }
      }
    } catch {}
  };

  useEffect(() => {
    if (session?.company?.id) {
      loadEmployeesFromApi();
    }
  }, [session?.company?.id]);

  // Record an immutable audit log entry
  const addAuditLog = (action: string, details: string) => {
    const entry: AuditLogEntry = {
      id: `audit-${Date.now()}`,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
      actor: session?.user.email || 'system_operator',
      action,
      module: activeTab.toUpperCase(),
      entityId: session?.company.id || 'local_desktop',
      details,
      ipAddress: '10.14.0.1 (Workstation Client)',
    };
    setAuditLogs((prev) => [entry, ...prev]);
  };

  // Consolidated Session Heartbeat & Health Check (P2.2 Free-Tier Resource Model)
  // Consolidates lease, license status, update checks, and suspension in a single jittered 5-minute ping with ETag/304 caching
  useEffect(() => {
    if (!session?.company?.id) return;

    const cleanUrl = serverUrl.replace(/\/$/, '');
    let active = true;
    let timerId: ReturnType<typeof setTimeout> | null = null;
    let lastCheckTime = 0;
    let lastEtag: string | null = null;

    const runSessionHeartbeat = async () => {
      lastCheckTime = Date.now();
      try {
        const token = (session as any)?.accessToken || localStorage.getItem('hr360_access_token');
        if (!token) return;

        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        };
        if (lastEtag) headers['If-None-Match'] = lastEtag;

        const res = await apiFetch(`${cleanUrl}/api/v1/desktop/heartbeat`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            appVersion: '1.0.0',
            deviceHash: 'desktop-client-session',
            deviceName: 'Windows Client',
            osVersion: 'Windows',
          }),
        });

        if (!active) return;

        if (res.status === 304) {
          // Unchanged: zero bandwidth, stay ACTIVE
          return;
        }

        const etagHeader = res.headers.get('ETag');
        if (etagHeader) lastEtag = etagHeader;

        if (res.ok) {
          const hb = await res.json();
          const currentStatus = hb?.data?.companyStatus;
          if (currentStatus === 'SUSPENDED') {
            setCompanyStatus('LOCKED');
            setLockReason('Account suspended. Access has been locked by administrator.');
            setSession((prev) => (prev ? { ...prev, company: { ...prev.company, status: 'LOCKED' } } : null));
            try { localStorage.removeItem('hr360_access_token'); } catch {}
          } else {
            setCompanyStatus('ACTIVE');
          }
        } else if (res.status === 401) {
          // Token expired, clear token
          try { localStorage.removeItem('hr360_access_token'); } catch {}
        }
      } catch (err) {
        // Network offline / unreachable: NEVER lock app immediately (offline grace policy applies)
      } finally {
        if (active) {
          // Schedule next run: 5 minutes +- 20% jitter (240s - 360s)
          const jitteredDelay = 240000 + Math.floor(Math.random() * 120000);
          timerId = setTimeout(runSessionHeartbeat, jitteredDelay);
        }
      }
    };

    // Immediate first check
    runSessionHeartbeat();

    // Re-check on window focus only if older than 60 seconds
    const onFocus = () => {
      if (Date.now() - lastCheckTime > 60000) {
        if (timerId) clearTimeout(timerId);
        runSessionHeartbeat();
      }
    };
    window.addEventListener('focus', onFocus);

    return () => {
      active = false;
      if (timerId) clearTimeout(timerId);
      window.removeEventListener('focus', onFocus);
    };
  }, [session, serverUrl]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError('');

    try {
      const cleanUrl = serverUrl.replace(/\/$/, '');
      const res = await apiFetch(`${cleanUrl}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });

      const data = await res.json();
      if (!res.ok) {
        const errorMsg = data?.error?.message || '';
        const lower = errorMsg.toLowerCase();
        if (
          lower.includes('deactivated') ||
          lower.includes('inactive') ||
          lower.includes('suspended') ||
          lower.includes('tenant_inactive')
        ) {
          throw new Error('Deactivated user');
        } else if (
          lower.includes('database') ||
          lower.includes('db not responding') ||
          lower.includes('prisma') ||
          lower.includes('econnrefused') ||
          lower.includes('cant reach') ||
          lower.includes("can't reach")
        ) {
          throw new Error('DB not responding');
        }
        throw new Error(errorMsg || 'Invalid credentials or tenant inactive.');
      }

      // Clock Rollback Detection (Batch D requirement)
      if (data.data.entitlement?.serverTime) {
        const serverEpoch = new Date(data.data.entitlement.serverTime).getTime();
        const localEpoch = Date.now();
        const storedLastSeen = parseInt(localStorage.getItem('hr360_last_server_time') || '0', 10);
        if (localEpoch < storedLastSeen - 300000) {
          throw new Error('System clock rollback detected. Please synchronize system time with network clock.');
        }
        if (serverEpoch > storedLastSeen) {
          localStorage.setItem('hr360_last_server_time', serverEpoch.toString());
        }
      }

      const companyData: CompanySession = {
        id: data.data.company.id,
        name: data.data.company.name,
        slug: data.data.company.slug,
        databaseName: data.data.company.databaseName || 'Cloud Database: Isolated',
        status: data.data.company.status || 'ACTIVE',
        licenseTier: data.data.company.licenseTier || 'STARTER',
        employeeLimit: data.data.company.employeeLimit || 50,
        licenseExpires: data.data.company.licenseExpires || '2027-10-10',
        offlineGraceDays: data.data.company.offlineGraceDays || 14,
        modules: data.data.entitlement?.modules || {
          dashboard: true,
          employees: true,
          attendance: true,
          leaves: true,
          payroll: true,
          payslipTemplate: data.data.company.licenseTier !== 'STARTER',
          certificates: data.data.company.licenseTier !== 'STARTER',
          performance: data.data.company.licenseTier !== 'STARTER',
          recruitment: data.data.company.licenseTier === 'ENTERPRISE',
          system: true,
        },
        limits: data.data.entitlement?.limits || {
          employees: data.data.company.employeeLimit || 50,
          terminals: 1,
          adminUsers: 5,
          storageMb: 10000,
        },
      };

      const userData: UserSession = {
        id: data.data.user.id,
        email: data.data.user.email,
        fullName: data.data.user.fullName,
        role: data.data.user.role || 'HR_MANAGER',
      };

      // Store access token and refresh token in safeStorage if running in desktop Electron
      if (typeof window !== 'undefined' && window.hr360Desktop) {
        if (data.data.accessToken) {
          window.hr360Desktop.storeSecure('access_token', data.data.accessToken).catch(() => {});
        }
        if (data.data.refreshToken) {
          window.hr360Desktop.storeSecure('refresh_token', data.data.refreshToken).catch(() => {});
        }
        if (data.data.entitlementToken) {
          window.hr360Desktop.storeSecure('entitlement_token', data.data.entitlementToken).catch(() => {});
        }
      }

      const sessionObj = {
        user: userData,
        company: companyData,
        accessToken: data.data.accessToken,
      };
      setSession(sessionObj);
      try {
        localStorage.setItem('hr360_desktop_session', JSON.stringify(sessionObj));
        localStorage.setItem('hr360_access_token', data.data.accessToken);
      } catch {}

      // Newly activated company starts strictly empty in dynamic database
      setEmployees([]);
      setAttendance([]);
      setLeaves([]);
      setPayrollRuns([]);
      setBenefits([]);
      setAppraisalRecords([]);
      setJobs([]);
      // Preserved candidate resumes from ATS import (kept)
      setInterviews([]);
      // Fetch existing company records from cloud API
      try {
        const empRes = await apiFetch(`${cleanUrl}/api/v1/employees`, {
          headers: {
            Authorization: `Bearer ${data.data.accessToken}`,
            'x-company-id': companyData.id,
          },
        });
        if (empRes.ok) {
          const empData = await empRes.json();
          if (Array.isArray(empData?.data)) {
            setEmployees(
              empData.data.map((r: any) => ({
                id: r.id,
                employeeCode: r.employeeCode,
                firstName: r.firstName,
                lastName: r.lastName,
                email: r.email,
                phone: r.phone || '',
                gender: r.gender || 'OTHER',
                dateOfBirth: r.dateOfBirth?.slice(0, 10) || '1995-01-01',
                nationalId: r.nationalId || '********',
                department: r.department || 'General',
                designation: r.designation || 'Staff Member',
                branch: r.branch || 'Main Branch',
                employmentType: r.employmentType || 'PERMANENT',
                status: r.status || 'ACTIVE',
                joiningDate: r.joiningDate?.slice(0, 10) || '2026-01-01',
                baseSalary: Number(r.baseSalary || 100000),
                bankName: r.bankName || '',
                bankAccount: r.bankAccount || '',
              }))
            );
          }
        }
      } catch {}

      // Update template with company name
      setPayslipTemplate((prev) => ({
        ...prev,
        companyName: companyData.name,
      }));

      setCompanyStatus(companyData.status);
      addAuditLog('USER_AUTHENTICATION', `Successful authenticated sign in for ${userData.email} (${userData.role})`);
    } catch (err: any) {
      const msg = err?.message || '';
      const lower = msg.toLowerCase();
      if (
        lower.includes('deactivated') ||
        lower.includes('inactive') ||
        lower.includes('suspended') ||
        lower.includes('tenant inactive')
      ) {
        setAuthError('Deactivated user');
      } else if (
        err.name === 'TypeError' ||
        lower.includes('fetch') ||
        lower.includes('database') ||
        lower.includes('db not responding') ||
        lower.includes('prisma') ||
        lower.includes('connection refused') ||
        lower.includes('econnrefused') ||
        lower.includes('network error')
      ) {
        setAuthError('DB not responding');
      } else {
        setAuthError(msg);
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegLoading(true);
    setRegError('');
    setRegSuccessNotice('');

    try {
      const cleanUrl = serverUrl.replace(/\/$/, '');
      const res = await apiFetch(`${cleanUrl}/api/v1/registrations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: regCompanyName,
          adminFullName: regAdminName,
          adminEmail: regAdminEmail,
          adminPassword: regAdminPassword,
          phone: regPhone,
          country: regCountry,
          selectedPlanTier: regPlanTier,
          selectedInterval: regInterval,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (data?.error?.details?.errors) {
          const fieldErrors = Object.entries(data.error.details.errors)
            .map(([field, errs]) => `${field}: ${(errs as string[]).join(', ')}`)
            .join(' | ');
          throw new Error(fieldErrors);
        }
        throw new Error(data?.error?.message || 'Registration failed.');
      }

      setRegSuccessNotice(
        `Registration for "${regCompanyName}" has been submitted (Status: PENDING). An administrator must approve it on the admin console before access is provisioned.`
      );
      setLoginEmail(regAdminEmail);
      setLoginPassword(regAdminPassword);
    } catch (err: any) {
      const msg = err?.message || '';
      const lower = msg.toLowerCase();
      if (
        err.name === 'TypeError' ||
        lower.includes('fetch') ||
        lower.includes('database') ||
        lower.includes('db not responding') ||
        lower.includes('prisma') ||
        lower.includes('connection refused') ||
        lower.includes('econnrefused') ||
        lower.includes('network error')
      ) {
        setRegError('DB not responding');
      } else {
        setRegError(msg);
      }
    } finally {
      setRegLoading(false);
    }
  };

  // -------------------------------------------------------------
  // Sign In Screen
  // -------------------------------------------------------------
  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-100 p-4 font-sans select-none">
        <div className="w-full max-w-md bg-white border border-slate-300 shadow-md p-8">
          <div className="text-center mb-6 flex flex-col items-center">
            <img src={appIcon} alt="Logo" className="w-20 h-20 rounded-2xl shadow-sm object-contain mb-3" />
            <h1 className="text-xl font-bold tracking-tight text-slate-900">Workspace Sign In</h1>
            <p className="text-xs text-slate-500 mt-1 uppercase tracking-wider font-semibold">
              Complete Human Capital Management System
            </p>
          </div>

          <div className="flex border-b border-slate-200 mb-6 text-xs font-semibold">
            <button
              onClick={() => setMode('LOGIN')}
              className={`flex-1 py-2 text-center border-b-2 ${
                mode === 'LOGIN' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              Sign In to Workspace
            </button>
            <button
              onClick={() => setMode('REGISTER')}
              className={`flex-1 py-2 text-center border-b-2 ${
                mode === 'REGISTER' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              First-Time Company Setup
            </button>
          </div>

          {mode === 'LOGIN' ? (
            <div>
              {authError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 text-xs text-red-700 flex items-start">
                  <ShieldAlert className="w-4 h-4 mr-2 shrink-0 mt-0.5" />
                  <span>{authError}</span>
                </div>
              )}
              {regSuccessNotice && (
                <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-xs text-emerald-800">
                  {regSuccessNotice}
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Administrator / Staff Email</label>
                  <input
                    type="email"
                    required
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 text-sm focus:outline-none focus:border-slate-800"
                    placeholder="e.g. admin@company.com"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
                  <input
                    type="password"
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 text-sm focus:outline-none focus:border-slate-800"
                  />
                </div>
                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full py-2.5 bg-slate-900 text-white font-semibold text-xs uppercase tracking-wider hover:bg-slate-800 flex items-center justify-center transition-colors"
                >
                  <LogIn className="w-4 h-4 mr-2" />
                  {authLoading ? 'Verifying Tenant Status...' : 'Sign In to Workspace'}
                </button>
              </form>
            </div>
          ) : (
            <div>
              {regError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 text-xs text-red-700">
                  {regError}
                </div>
              )}
              {regSuccessNotice ? (
                <div className="space-y-4">
                  <div className="p-3 bg-emerald-50 border border-emerald-200 text-xs text-emerald-800">
                    {regSuccessNotice}
                  </div>
                  <button
                    onClick={() => setMode('LOGIN')}
                    className="w-full py-2 bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800"
                  >
                    Proceed to Sign In Screen
                  </button>
                </div>
              ) : (
                <form onSubmit={handleRegister} className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Company Legal Name</label>
                    <input
                      type="text"
                      required
                      value={regCompanyName}
                      onChange={(e) => setRegCompanyName(e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-300 text-xs focus:outline-none focus:border-slate-800"
                      placeholder="e.g. Acme Corporation"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Administrator Full Name</label>
                    <input
                      type="text"
                      required
                      value={regAdminName}
                      onChange={(e) => setRegAdminName(e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-300 text-xs focus:outline-none focus:border-slate-800"
                      placeholder="e.g. Hammad Saifullah"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Administrator Email</label>
                    <input
                      type="email"
                      required
                      value={regAdminEmail}
                      onChange={(e) => setRegAdminEmail(e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-300 text-xs focus:outline-none focus:border-slate-800"
                      placeholder="admin@company.com"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Administrator Password</label>
                    <input
                      type="password"
                      required
                      value={regAdminPassword}
                      onChange={(e) => setRegAdminPassword(e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-300 text-xs focus:outline-none focus:border-slate-800"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Phone</label>
                      <input
                        type="text"
                        required
                        value={regPhone}
                        onChange={(e) => setRegPhone(e.target.value)}
                        className="w-full px-3 py-1.5 border border-slate-300 text-xs focus:outline-none"
                        placeholder="+92 300 1234567"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Country</label>
                      <input
                        type="text"
                        required
                        value={regCountry}
                        onChange={(e) => setRegCountry(e.target.value.toUpperCase())}
                        maxLength={2}
                        className="w-full px-3 py-1.5 border border-slate-300 text-xs focus:outline-none"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Select Tier *</label>
                      <select
                        value={regPlanTier}
                        onChange={(e) => setRegPlanTier(e.target.value as any)}
                        className="w-full px-3 py-1.5 border border-slate-300 text-xs bg-white focus:outline-none focus:border-slate-800"
                      >
                        <option value="STARTER">Starter Tier ($99/mo)</option>
                        <option value="GROWTH">Growth & Scale ($179/mo)</option>
                        <option value="ENTERPRISE">Enterprise Core ($249/mo)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Billing Package *</label>
                      <select
                        value={regInterval}
                        onChange={(e) => setRegInterval(e.target.value as any)}
                        className="w-full px-3 py-1.5 border border-slate-300 text-xs bg-white focus:outline-none focus:border-slate-800"
                      >
                        <option value="MONTHLY">Monthly</option>
                        <option value="ANNUAL">Annually (Discounted)</option>
                        <option value="LIFETIME">Lifetime Perpetual</option>
                      </select>
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={regLoading}
                    className="w-full py-2.5 bg-slate-900 text-white font-semibold text-xs uppercase tracking-wider hover:bg-slate-800 flex items-center justify-center mt-2"
                  >
                    <UserPlus className="w-4 h-4 mr-2" />
                    {regLoading ? 'Submitting Registration...' : 'Submit Company Registration'}
                  </button>
                </form>
              )}
            </div>
          )}

          <div className="mt-4 pt-3 border-t border-slate-200 text-[10px] text-slate-400 text-center">
            Zero-Offline Architecture: Secure authenticated connection to HR360 Cloud Services.
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // Full-Window Availability Screens (Batch E Requirement)
  // -------------------------------------------------------------
  if (connectionStatus === 'NO_INTERNET') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#0B132B] p-6 select-none font-sans text-slate-100">
        <div className="max-w-md w-full bg-white text-slate-900 border border-slate-300 shadow-2xl p-8 text-center rounded-xl">
          <div className="w-16 h-16 rounded-full bg-rose-100 flex items-center justify-center text-rose-700 mx-auto mb-4">
            <WifiOff className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">No Internet Connection</h2>
          <p className="text-xs text-slate-600 mb-4 leading-relaxed">
            HR360 operates with a zero-local-data security architecture and requires an active network connection to communicate securely with the cloud API.
          </p>

          <div className="text-[11px] text-slate-400 font-mono mb-4">
            Last Connected: <strong className="text-slate-600">{lastConnectedAt}</strong>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded p-3 mb-6 text-xs text-slate-600 flex items-center justify-center space-x-2">
            <RefreshCw className="w-3.5 h-3.5 text-blue-600 animate-spin" />
            <span>Retrying in <strong className="text-slate-900 font-mono">{retryCountdown}s</strong>...</span>
          </div>

          <div className="flex flex-col space-y-2.5">
            <button
              onClick={() => {
                fetch(`${cleanUrl}/api/v1/health`)
                  .then((r) => {
                    if (r.ok) {
                      setConnectionStatus('ONLINE');
                      setLastConnectedAt(new Date().toLocaleTimeString());
                    } else {
                      setConnectionStatus('SERVICE_UNAVAILABLE');
                    }
                  })
                  .catch(() => setConnectionStatus(navigator.onLine ? 'SERVICE_UNAVAILABLE' : 'NO_INTERNET'));
              }}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs uppercase tracking-wider rounded transition-colors shadow"
            >
              Retry Connection Now
            </button>
            <button
              onClick={() => {
                if (typeof window !== 'undefined' && window.hr360Desktop?.openNetworkSettings) {
                  window.hr360Desktop.openNetworkSettings();
                }
              }}
              className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded border border-slate-300 transition-colors"
            >
              Open Network Settings
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (connectionStatus === 'SERVICE_UNAVAILABLE') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#0B132B] p-6 select-none font-sans text-slate-100">
        <div className="max-w-md w-full bg-white text-slate-900 border border-slate-300 shadow-2xl p-8 text-center rounded-xl">
          <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 mx-auto mb-4">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Service Temporarily Unavailable</h2>
          <p className="text-xs text-slate-600 mb-4 leading-relaxed">
            The HR360 Cloud Service is currently undergoing scheduled maintenance or experiencing a temporary interruption. All organizational records and sessions are secure.
          </p>

          <div className="text-[11px] text-slate-400 font-mono mb-4">
            Last Connected: <strong className="text-slate-600">{lastConnectedAt}</strong>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded p-3 mb-6 text-xs text-slate-600 flex items-center justify-center space-x-2">
            <RefreshCw className="w-3.5 h-3.5 text-blue-600 animate-spin" />
            <span>Retrying in <strong className="text-slate-900 font-mono">{retryCountdown}s</strong>...</span>
          </div>

          <div className="flex flex-col space-y-2.5">
            <button
              onClick={() => {
                fetch(`${cleanUrl}/api/v1/health`)
                  .then((r) => {
                    if (r.ok) {
                      setConnectionStatus('ONLINE');
                      setLastConnectedAt(new Date().toLocaleTimeString());
                    } else {
                      setConnectionStatus('SERVICE_UNAVAILABLE');
                    }
                  })
                  .catch(() => setConnectionStatus(navigator.onLine ? 'SERVICE_UNAVAILABLE' : 'NO_INTERNET'));
              }}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs uppercase tracking-wider rounded transition-colors shadow"
            >
              Retry Connection Now
            </button>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // Mandatory Application Update Screen (Phase 4.2 Requirement)
  // -------------------------------------------------------------
  if (updateInfo?.requiresImmediateUpdate) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#0B132B] p-6 select-none font-sans text-slate-100">
        <div className="max-w-md w-full bg-white text-slate-900 border border-slate-300 shadow-2xl p-8 text-center rounded-xl">
          <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 mx-auto mb-4">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Update Required</h2>
          <p className="text-xs text-slate-600 mb-6 leading-relaxed">
            A critical system update (v{updateInfo.latestVersion}) is required to connect to the HR360 Cloud Services securely. Your current version ({updateInfo.currentVersion || '1.0.0'}) is no longer supported.
          </p>
          <button
            onClick={async () => {
              if (updateInfo.downloadUrl && window.hr360Desktop) {
                const res = await window.hr360Desktop.startDownload(updateInfo.downloadUrl);
                if (!res?.fallback && window.hr360Desktop?.quitAndInstall) {
                  window.hr360Desktop.quitAndInstall({ forceRestart: true });
                }
              }
            }}
            className="w-full py-2.5 bg-blue-600 text-white font-semibold text-xs uppercase tracking-wider hover:bg-blue-700 rounded shadow"
          >
            Update & Restart Now
          </button>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // Company Locked Screen (Unbypassable Full-Screen Lockout)
  // -------------------------------------------------------------
  if (companyStatus === 'LOCKED' || session?.company?.status === 'LOCKED' || session?.company?.status === 'INACTIVE') {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950 p-6 select-none font-sans">
        <div className="max-w-md w-full bg-white border border-red-300 shadow-2xl rounded-2xl p-8 text-center animate-in zoom-in-95 duration-200">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center text-red-600 mx-auto mb-4">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Access Locked</h2>
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800 font-semibold mb-4">
            {lockReason || 'Company account has been suspended or deactivated by the platform administrator.'}
          </div>
          <p className="text-xs text-slate-500 mb-6 leading-relaxed">
            All workstation interactions and data queries are locked under zero-offline policy. Please contact your platform administrator to restore company authorization.
          </p>
          <div className="space-y-2">
            <button
              onClick={() => {
                try {
                  localStorage.removeItem('hr360_desktop_session');
                  localStorage.removeItem('hr360_access_token');
                } catch {}
                setSession(null);
                setCompanyStatus('ACTIVE');
                window.location.reload();
              }}
              className="w-full py-2.5 bg-slate-900 text-white font-semibold text-xs rounded-lg hover:bg-slate-800 transition-colors shadow"
            >
              Sign Out & Return to Sign In
            </button>
            <button
              onClick={() => window.location.reload()}
              className="w-full py-2 bg-slate-100 text-slate-700 font-medium text-xs rounded-lg hover:bg-slate-200 border border-slate-300 transition-colors"
            >
              Check Company Status Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // Active Desktop Workspace Layout
  // -------------------------------------------------------------
  return (
    <div className="flex flex-col h-screen bg-slate-100 font-sans text-slate-800 select-none">
      {/* Top Application Bar */}
      <header className="h-14 bg-[#0B132B] text-slate-200 flex items-center justify-between px-5 text-xs border-b border-slate-800 select-none">
        <div className="flex items-center space-x-3">
          <img src={appIcon} alt="Logo" className="w-7 h-7 object-contain" />
          <span className="font-bold text-white text-base tracking-tight">HR360</span>
          <div className="h-5 w-px bg-slate-700/80 mx-1" />
          <div className="flex items-center space-x-2 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/70 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-200 transition-colors">
            <Building2 className="w-3.5 h-3.5 text-slate-400" />
            <span>{session.company.name || 'Enterprise Workspace'}</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </div>
        </div>
        <div className="flex items-center space-x-3">
          {updateInfo?.updateAvailable && (
            <button
              onClick={() => setShowUpdateDialog(true)}
              className="flex items-center space-x-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-2.5 py-1 rounded-full text-[11px] font-bold shadow animate-pulse transition-all"
              title={updateInfo.notes || 'A new version of HR360 is ready.'}
            >
              <span>Update Available ({updateInfo.latestVersion})</span>
            </button>
          )}
          <button title="Notifications" className="relative p-2 text-slate-300 hover:text-white hover:bg-slate-800/80 rounded-lg transition-colors">
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-blue-500 rounded-full" />
          </button>
          <button
            title="Settings"
            onClick={() => setShowSettingsModal(true)}
            className="p-2 text-slate-300 hover:text-white hover:bg-slate-800/80 rounded-lg transition-colors"
          >
            <Settings className="w-4 h-4" />
          </button>
          <div className="flex items-center space-x-2 bg-slate-800/80 border border-slate-700/80 px-3 py-1.5 rounded-full text-xs font-medium text-slate-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Online</span>
          </div>
        </div>
      </header>

      {/* Main Workspace with Full Sidebar */}
      <div className="flex flex-1 overflow-hidden">
        {/* Navigation Sidebar (All 10 Core Functional Categories) */}
        <aside className="w-64 bg-[#0B132B] text-slate-300 flex flex-col border-r border-slate-800/80 select-none">
          <div className="px-4 pt-4 pb-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            Enterprise Modules
          </div>

          <nav className="flex-1 space-y-1 px-3 py-2 overflow-y-auto">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`w-full flex items-center px-3 py-2.5 text-xs rounded-xl transition-all ${
                activeTab === 'dashboard' ? 'bg-[#1D68F2] text-white font-semibold shadow-md shadow-blue-900/30' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <LayoutDashboard className="w-4 h-4 mr-3 shrink-0" />
              Executive Dashboard
            </button>

            <button
              onClick={() => setActiveTab('employees')}
              className={`w-full flex items-center px-3 py-2.5 text-xs rounded-xl transition-all ${
                activeTab === 'employees' ? 'bg-[#1D68F2] text-white font-semibold shadow-md shadow-blue-900/30' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Users className="w-4 h-4 mr-3 shrink-0" />
              Employee Directory ({employees.length})
            </button>

            <button
              onClick={() => setActiveTab('attendance')}
              className={`w-full flex items-center px-3 py-2.5 text-xs rounded-xl transition-all ${
                activeTab === 'attendance' ? 'bg-[#1D68F2] text-white font-semibold shadow-md shadow-blue-900/30' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Fingerprint className="w-4 h-4 mr-3 shrink-0" />
              Biometrics & Attendance
            </button>

            <button
              onClick={() => setActiveTab('leaves')}
              className={`w-full flex items-center px-3 py-2.5 text-xs rounded-xl transition-all ${
                activeTab === 'leaves' ? 'bg-[#1D68F2] text-white font-semibold shadow-md shadow-blue-900/30' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Calendar className="w-4 h-4 mr-3 shrink-0" />
              Leave Approvals ({leaves.filter((l) => l.status === 'PENDING').length})
            </button>

            <button
              onClick={() => setActiveTab('payroll')}
              className={`w-full flex items-center px-3 py-2.5 text-xs rounded-xl transition-all ${
                activeTab === 'payroll' ? 'bg-[#1D68F2] text-white font-semibold shadow-md shadow-blue-900/30' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <DollarSign className="w-4 h-4 mr-3 shrink-0" />
              Payroll & Statutory Engine
            </button>

            {/* Payslip Template Designer - Gated for Starter */}
            {session.company.modules?.payslipTemplate === false ? (
              <button
                onClick={() => setUpgradeModal({ open: true, moduleName: 'Payslip Template Designer', requiredPlan: 'Growth or Enterprise' })}
                className="w-full flex items-center justify-between px-3 py-2.5 text-xs rounded-xl text-slate-500 hover:text-slate-400 hover:bg-slate-800/30 transition-all opacity-70"
                title="Available on Growth or Enterprise plan"
              >
                <div className="flex items-center">
                  <FileText className="w-4 h-4 mr-3 shrink-0" />
                  <span>Payslip Designer</span>
                </div>
                <Lock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              </button>
            ) : (
              <button
                onClick={() => setActiveTab('payslip-template')}
                className={`w-full flex items-center px-3 py-2.5 text-xs rounded-xl transition-all ${
                  activeTab === 'payslip-template' ? 'bg-[#1D68F2] text-white font-semibold shadow-md shadow-blue-900/30' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <FileText className="w-4 h-4 mr-3 shrink-0" />
                Payslip Template Designer
              </button>
            )}

            {/* Benefits & Certificates - Gated for Starter */}
            {session.company.modules?.certificates === false ? (
              <button
                onClick={() => setUpgradeModal({ open: true, moduleName: 'Benefits & HR Certificates', requiredPlan: 'Growth or Enterprise' })}
                className="w-full flex items-center justify-between px-3 py-2.5 text-xs rounded-xl text-slate-500 hover:text-slate-400 hover:bg-slate-800/30 transition-all opacity-70"
                title="Available on Growth or Enterprise plan"
              >
                <div className="flex items-center">
                  <Award className="w-4 h-4 mr-3 shrink-0" />
                  <span>HR Certificates</span>
                </div>
                <Lock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              </button>
            ) : (
              <button
                onClick={() => setActiveTab('certificates')}
                className={`w-full flex items-center px-3 py-2.5 text-xs rounded-xl transition-all ${
                  activeTab === 'certificates' ? 'bg-[#1D68F2] text-white font-semibold shadow-md shadow-blue-900/30' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Award className="w-4 h-4 mr-3 shrink-0" />
                Benefits & HR Certificates
              </button>
            )}

            {/* Performance & Increments - Gated for Starter */}
            {session.company.modules?.performance === false ? (
              <button
                onClick={() => setUpgradeModal({ open: true, moduleName: 'Performance & Increments', requiredPlan: 'Growth or Enterprise' })}
                className="w-full flex items-center justify-between px-3 py-2.5 text-xs rounded-xl text-slate-500 hover:text-slate-400 hover:bg-slate-800/30 transition-all opacity-70"
                title="Available on Growth or Enterprise plan"
              >
                <div className="flex items-center">
                  <TrendingUp className="w-4 h-4 mr-3 shrink-0" />
                  <span>Performance Reviews</span>
                </div>
                <Lock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              </button>
            ) : (
              <button
                onClick={() => setActiveTab('performance')}
                className={`w-full flex items-center px-3 py-2.5 text-xs rounded-xl transition-all ${
                  activeTab === 'performance' ? 'bg-[#1D68F2] text-white font-semibold shadow-md shadow-blue-900/30' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <TrendingUp className="w-4 h-4 mr-3 shrink-0" />
                Performance & Increments
              </button>
            )}

            {/* Recruitment & ATS - Gated for Non-Enterprise */}
            {session.company.modules?.recruitment === false ? (
              <button
                onClick={() => setUpgradeModal({ open: true, moduleName: 'Recruitment & ATS', requiredPlan: 'Enterprise Tier' })}
                className="w-full flex items-center justify-between px-3 py-2.5 text-xs rounded-xl text-slate-500 hover:text-slate-400 hover:bg-slate-800/30 transition-all opacity-70"
                title="Available on Enterprise plan only"
              >
                <div className="flex items-center">
                  <Briefcase className="w-4 h-4 mr-3 shrink-0" />
                  <span>Recruitment & ATS</span>
                </div>
                <Lock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              </button>
            ) : (
              <button
                onClick={() => setActiveTab('recruitment')}
                className={`w-full flex items-center px-3 py-2.5 text-xs rounded-xl transition-all ${
                  activeTab === 'recruitment' ? 'bg-[#1D68F2] text-white font-semibold shadow-md shadow-blue-900/30' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Briefcase className="w-4 h-4 mr-3 shrink-0" />
                Recruitment & Local ATS
              </button>
            )}

            <button
              onClick={() => setActiveTab('inventory')}
              className={`w-full flex items-center px-3 py-2.5 text-xs rounded-xl transition-all ${
                activeTab === 'inventory' ? 'bg-[#1D68F2] text-white font-semibold shadow-md shadow-blue-900/30' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Package className="w-4 h-4 mr-3 shrink-0" />
              Inventory & Assets
            </button>

            <button
              onClick={() => setActiveTab('database')}
              className={`w-full flex items-center px-3 py-2.5 text-xs rounded-xl transition-all ${
                activeTab === 'database' ? 'bg-[#1D68F2] text-white font-semibold shadow-md shadow-blue-900/30' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Database className="w-4 h-4 mr-3 shrink-0" />
              Database & Storage
            </button>

            <button
              onClick={() => setActiveTab('system')}
              className={`w-full flex items-center px-3 py-2.5 text-xs rounded-xl transition-all ${
                activeTab === 'system' ? 'bg-[#1D68F2] text-white font-semibold shadow-md shadow-blue-900/30' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <ShieldCheck className="w-4 h-4 mr-3 shrink-0" />
              Audit & System Health
            </button>
          </nav>

          {/* License & Quota Status Pill */}
          <div className="px-4 py-3 border-t border-slate-800/80 bg-slate-900/40">
            <div className="flex items-center justify-between text-[11px] mb-1.5">
              <span className="text-slate-400 font-medium">Plan Tier:</span>
              <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 font-bold rounded text-[10px] uppercase border border-blue-500/30">
                {session.company.licenseTier || 'STARTER'}
              </span>
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono">
                <span>Headcount Usage</span>
                <span className="flex items-center space-x-1.5">
                  {session.company.employeeLimit <= 9999 && employees.length >= session.company.employeeLimit * 0.9 && (
                    <span className="text-[9px] px-1 py-0.2 bg-amber-500/20 text-amber-400 rounded">90% CAP</span>
                  )}
                  <span>
                    {employees.length} / {session.company.employeeLimit > 9999 ? 'Unlimited' : session.company.employeeLimit}
                  </span>
                </span>
              </div>
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    session.company.employeeLimit > 9999
                      ? 'bg-emerald-500 w-1/4'
                      : employees.length >= session.company.employeeLimit
                      ? 'bg-rose-500'
                      : employees.length >= session.company.employeeLimit * 0.9
                      ? 'bg-amber-400'
                      : 'bg-emerald-500'
                  }`}
                  style={{
                    width:
                      session.company.employeeLimit > 9999
                        ? '10%'
                        : `${Math.min(100, Math.round((employees.length / session.company.employeeLimit) * 100))}%`,
                  }}
                />
              </div>

              {/* Terminal Limit Meter */}
              <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono pt-1">
                <span>Biometric Terminals</span>
                <span>1 / {session.company.limits?.terminals || 1} (Max)</span>
              </div>
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 w-full" />
              </div>
            </div>
          </div>

          {/* User Status Bar */}
          <div className="p-3 border-t border-slate-800/80">
            <div className="bg-[#111A38] border border-slate-800 rounded-xl p-3 flex items-center justify-between">
              <div className="flex items-center min-w-0 mr-2">
                <div className="w-9 h-9 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-xs shadow-inner shrink-0 mr-2.5">
                  {(session.user.fullName || 'U').split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() || 'AD'}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-xs text-white truncate">{session.user.fullName}</div>
                  <div className="text-[10px] text-slate-400 font-mono truncate">{session.user.email}</div>
                  <div className="text-[9px] font-bold text-cyan-400 uppercase tracking-wider mt-0.5">ROLE: {session.user.role || 'COMPANY_ADMIN'}</div>
                </div>
              </div>
              <button
                onClick={handleLogout}
                title="Sign Out"
                className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800/80 rounded-lg transition-colors shrink-0"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </aside>

        {/* Dynamic Workspace Content */}
        <main className="flex-1 flex flex-col bg-slate-50 overflow-y-auto p-6">
          <ErrorBoundary>
            {activeTab === 'dashboard' && (
              <DashboardModule
                employees={employees}
                attendance={attendance}
                payrollRun={payrollRuns[0] || DEFAULT_PAYROLL_RUN}
                candidates={candidates}
                leaves={leaves}
                devices={devices}
                onNavigateTab={(t) => setActiveTab(t)}
              />
            )}

            {activeTab === 'employees' && (
              <EmployeeModule
                employees={employees}
                setEmployees={setEmployees}
                onAudit={addAuditLog}
                userRole={session?.user?.role}
                serverUrl={serverUrl}
                session={session}
                apiFetch={apiFetch}
                onRefresh={loadEmployeesFromApi}
              />
            )}

            {activeTab === 'attendance' && (
              <AttendanceModule
                attendance={attendance}
                setAttendance={setAttendance}
                devices={devices}
                setDevices={setDevices}
                onAudit={addAuditLog}
              />
            )}

            {activeTab === 'leaves' && (
              <LeaveModule
                leaves={leaves}
                setLeaves={setLeaves}
                employees={employees}
                onAudit={addAuditLog}
                serverUrl={serverUrl}
                session={session}
                apiFetch={apiFetch}
              />
            )}

            {activeTab === 'payroll' && (
              <PayrollModule
                payrollRuns={payrollRuns}
                setPayrollRuns={setPayrollRuns}
                employees={employees}
                payslipTemplate={payslipTemplate}
                onAudit={addAuditLog}
              />
            )}

            {activeTab === 'payslip-template' && (
              <PayslipTemplateModule
                template={payslipTemplate}
                setTemplate={setPayslipTemplate}
                sampleEmployee={employees[0] || FALLBACK_SAMPLE_EMPLOYEE}
                onAudit={addAuditLog}
              />
            )}

            {activeTab === 'certificates' && (
              <CertificatesModule
                templates={certTemplates}
                setTemplates={setCertTemplates}
                employees={employees}
                companyName={session.company.name}
                onAudit={addAuditLog}
              />
            )}

            {activeTab === 'performance' && (
              <PerformanceAndBenefitsModule
                cycles={appraisalCycles}
                setCycles={setAppraisalCycles}
                records={appraisalRecords}
                setRecords={setAppraisalRecords}
                benefits={benefits}
                setBenefits={setBenefits}
                employees={employees}
                setEmployees={setEmployees}
                onAudit={addAuditLog}
              />
            )}

            {activeTab === 'recruitment' && (
              <RecruitmentModule
                jobs={jobs}
                setJobs={setJobs}
                candidates={candidates}
                setCandidates={setCandidates}
                interviews={interviews}
                setInterviews={setInterviews}
                employees={employees}
                setEmployees={setEmployees}
                onAudit={addAuditLog}
                serverUrl={serverUrl}
              />
            )}

            {activeTab === 'inventory' && (
              <InventoryModule
                employees={employees}
                onAudit={addAuditLog}
                serverUrl={serverUrl}
                session={session}
                apiFetch={apiFetch}
              />
            )}

            {activeTab === 'database' && (
              <DatabaseManagementModule
                session={session}
                serverUrl={serverUrl}
                apiFetch={apiFetch}
                onAudit={addAuditLog}
              />
            )}

            {activeTab === 'system' && (
              <SystemAndSecurityModule
                auditLogs={auditLogs}
                companySession={session.company}
                activeEmployeeCount={employees.length}
                onAudit={addAuditLog}
              />
            )}
          </ErrorBoundary>
        </main>
      </div>

      {/* Enterprise Status Footer */}
      <footer className="h-6 bg-slate-200 border-t border-slate-300 text-[11px] flex items-center justify-between px-3 select-none">
        <div>
          {connectionStatus === 'ONLINE' ? (
            <span className="text-slate-700 font-medium">DB connected</span>
          ) : (
            <span className="text-red-600 font-bold">DB not responding</span>
          )}
        </div>
        <div>
          {connectionStatus === 'ONLINE' ? (
            <span className="text-slate-600">Online</span>
          ) : (
            <span className="text-red-600 font-bold">Offline</span>
          )}
        </div>
      </footer>

      {/* Upgrade Required Modal */}
      {upgradeModal?.open && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white border border-slate-300 shadow-2xl max-w-md w-full p-6 text-slate-900 rounded-lg">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-700">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900">Module Upgrade Required</h3>
                <p className="text-[11px] text-slate-500">Feature not available in your current license tier</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              The <strong>{upgradeModal.moduleName}</strong> module is exclusively included in the{' '}
              <strong className="text-blue-700">{upgradeModal.requiredPlan}</strong>. To unlock this module and higher employee quotas, upgrade your subscription from the web portal.
            </p>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded text-[11px] space-y-1 mb-5">
              <div className="flex justify-between">
                <span className="text-slate-500">Current Plan:</span>
                <span className="font-bold text-slate-800">{session.company.licenseTier || 'STARTER'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Required Plan:</span>
                <span className="font-bold text-blue-700">{upgradeModal.requiredPlan}</span>
              </div>
            </div>

            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setUpgradeModal(null)}
                className="px-4 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 border border-slate-300 rounded"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* In-App Update Dialog (Batch A UX Flow) */}
      {showUpdateDialog && updateInfo && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white border border-slate-300 shadow-2xl max-w-md w-full p-6 text-slate-900 rounded-lg">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700">
                <RefreshCw className={`w-5 h-5 ${isUpdating ? 'animate-spin' : ''}`} />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900">Software Update Available</h3>
                <p className="text-[11px] text-slate-500">Version {updateInfo.latestVersion} is ready for installation</p>
              </div>
            </div>

            <div className="space-y-3 mb-5">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded text-xs space-y-1">
                <div className="flex justify-between text-slate-500">
                  <span>Current Version:</span>
                  <span className="font-mono text-slate-700">{updateInfo.currentVersion || '1.0.0'}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>New Version:</span>
                  <span className="font-mono font-bold text-blue-700">{updateInfo.latestVersion}</span>
                </div>
              </div>

              {updateInfo.notes && (
                <div className="p-3 bg-blue-50/50 border border-blue-200 rounded text-[11px] text-slate-700">
                  <div className="font-semibold text-blue-900 mb-1">Release Highlights:</div>
                  <p>{updateInfo.notes}</p>
                </div>
              )}

              <p className="text-[11px] text-slate-500">
                Your user session, local preferences, and active company data are automatically backed up and preserved across updates.
              </p>
            </div>

            <div className="flex justify-end space-x-2">
              <button
                disabled={isUpdating}
                onClick={() => setShowUpdateDialog(false)}
                className="px-4 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 border border-slate-300 rounded"
              >
                Later (Install on next quit)
              </button>
              {updateDownloaded ? (
                <button
                  onClick={() => {
                    if (window.hr360Desktop?.quitAndInstall) {
                      window.hr360Desktop.quitAndInstall({ forceRestart: true });
                    }
                  }}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded shadow"
                >
                  Restart & Install Now
                </button>
              ) : (
                <button
                  disabled={isUpdating}
                  onClick={async () => {
                    setIsUpdating(true);
                    if (window.hr360Desktop?.startDownload && updateInfo.downloadUrl) {
                      const res = await window.hr360Desktop.startDownload(updateInfo.downloadUrl);
                      if (res?.fallback) {
                        setShowUpdateDialog(false);
                      } else {
                        setUpdateDownloaded(true);
                      }
                    }
                    setIsUpdating(false);
                  }}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded shadow flex items-center"
                >
                  {isUpdating ? 'Downloading Update...' : 'Update Now'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Workstation & App Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white border border-slate-300 shadow-2xl max-w-lg w-full p-6 text-slate-900 rounded-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-800">
                  <Settings className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Workstation & Application Settings</h3>
                  <p className="text-[11px] text-slate-500">Configure client endpoint, auto-lock policies, and active workspace preferences</p>
                </div>
              </div>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="font-bold text-base text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Company Workspace</label>
                <input
                  type="text"
                  disabled
                  value={session?.company?.name || 'Enterprise Client'}
                  className="w-full px-3 py-2 bg-slate-100 border border-slate-300 rounded font-semibold text-slate-700 text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">API Server Connection URL</label>
                <input
                  type="text"
                  disabled
                  value={serverUrl}
                  className="w-full px-3 py-2 bg-slate-100 border border-slate-300 rounded font-mono text-[11px] text-slate-600"
                />
                <p className="text-[10px] text-slate-400 mt-1">Configured automatically from workstation client bootstrap.</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded">
                  <div className="font-semibold text-slate-700">Database Status</div>
                  <div className="text-[11px] font-mono text-emerald-700 font-bold mt-0.5">
                    {connectionStatus === 'ONLINE' ? 'DB connected' : 'DB not responding'}
                  </div>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded">
                  <div className="font-semibold text-slate-700">License Tier</div>
                  <div className="text-[11px] font-mono text-blue-700 font-bold mt-0.5">
                    {session?.company?.licenseTier || 'STARTER'}
                  </div>
                </div>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded space-y-1">
                <div className="flex justify-between text-slate-600">
                  <span>Client Version:</span>
                  <span className="font-mono font-semibold">1.0.0</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Inactivity Lockout:</span>
                  <span className="font-semibold">30 minutes</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Zero-Offline Enforcement:</span>
                  <span className="text-emerald-700 font-semibold">Enabled</span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setShowSettingsModal(false)}
                className="px-4 py-2 bg-slate-900 text-white font-semibold text-xs rounded hover:bg-slate-800"
              >
                Close Settings
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

