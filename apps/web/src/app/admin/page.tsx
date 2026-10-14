'use client';

import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  Users,
  CheckCircle,
  XCircle,
  FileText,
  Layers,
  LogOut,
  Building,
  Key,
  Search,
  Filter,
  RefreshCw,
  Power,
  Lock,
  Eye,
  AlertTriangle,
  Clock,
  MessageSquare,
  DollarSign,
  CheckCircle2,
  Phone,
  Save,
  Edit2,
  UserCheck,
  UserX,
  CreditCard,
  Database
} from 'lucide-react';

interface StaffUser {
  id: string;
  email: string;
  fullName: string;
  role: 'SUPER_ADMIN' | 'ADMIN';
}

interface RegistrationRecord {
  id: string;
  companyName: string;
  adminEmail: string;
  adminFullName: string;
  phone: string;
  country: string;
  status: string;
  selectedPlanTier?: string | null;
  selectedInterval?: string | null;
  createdAt: string;
}

interface LeadRecord {
  id: string;
  fullName: string;
  companyName: string;
  email: string;
  phone: string | null;
  whatsapp: string | null;
  selectedTier: string | null;
  selectedPackage: string | null;
  isEngaged: boolean;
  notes: string | null;
  createdAt: string;
}

interface PlanRecord {
  id: string;
  name: string;
  code: string;
  description: string | null;
  priceMonthly: number;
  priceAnnual: number;
  priceLifetime: number;
  maxEmployees: number;
  maxInstalls: number;
  features: any;
  isActive: boolean;
}

interface CompanyAccount {
  id: string;
  name: string;
  slug: string;
  databaseName: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'INACTIVE' | 'PENDING';
  licenseKey?: string;
  registrationStatus: string;
  phone?: string;
  country?: string;
  createdAt: string;
  adminUsers: Array<{
    id: string;
    email: string;
    fullName: string;
    role: string;
    isActive: boolean;
    lastLoginAt?: string;
    createdAt: string;
  }>;
  subscription?: {
    planName: string;
    planCode: string;
    interval: string;
    startsAt: string;
    expiresAt: string;
    graceDays: number;
    isExpired: boolean;
  } | null;
  invoices?: Array<{
    id: string;
    invoiceNumber: string;
    status: string;
    amountSubtotal: number;
    amountTax: number;
    amountTotal: number;
    currency: string;
    issuedAt: string;
    paidAt?: string;
  }>;
}

interface AuditLogRecord {
  id: string;
  prevHash: string;
  hash: string;
  actorId: string;
  actorType: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

function sanitizeDbError(errOrMsg: any): string {
  const msg = typeof errOrMsg === 'string' ? errOrMsg : (errOrMsg?.message || String(errOrMsg || ''));
  const lower = msg.toLowerCase();
  if (
    lower.includes('database') ||
    lower.includes('db not responding') ||
    lower.includes('prisma') ||
    lower.includes('p1001') ||
    lower.includes('p1002') ||
    lower.includes('p1003') ||
    lower.includes('p2024') ||
    lower.includes('econnrefused') ||
    lower.includes('etimedout') ||
    lower.includes('connection refused') ||
    lower.includes("can't reach") ||
    lower.includes('cant reach') ||
    lower.includes('failed to fetch') ||
    lower.includes('network error')
  ) {
    return 'DB not responding';
  }
  return msg;
}

export default function AdminConsole() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loggedInStaff, setLoggedInStaff] = useState<StaffUser | null>(null);
  const [capabilities, setCapabilities] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Active Workspace Navigation Tab
  const [activeTab, setActiveTab] = useState<'companies' | 'queue' | 'inquiries' | 'pricing' | 'audit' | 'staff'>('companies');
  const [actionNotice, setActionNotice] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  // Companies Accounts State & Filters
  const [companies, setCompanies] = useState<CompanyAccount[]>([]);
  const [companySearch, setCompanySearch] = useState('');
  const [companyStatusFilter, setCompanyStatusFilter] = useState('ALL');
  const [selectedCompany, setSelectedCompany] = useState<CompanyAccount | null>(null);

  // Company Data Explorer State
  const [explorerCompany, setExplorerCompany] = useState<CompanyAccount | null>(null);
  const [explorerModule, setExplorerModule] = useState<'employees' | 'attendance' | 'payroll' | 'leaves' | 'certificates' | 'audit'>('employees');
  const [explorerData, setExplorerData] = useState<any[]>([]);
  const [isExplorerLoading, setIsExplorerLoading] = useState(false);
  const [explorerReason, setExplorerReason] = useState('Support Audit');

  // Password Reset Modal State
  const [passwordResetCompany, setPasswordResetCompany] = useState<CompanyAccount | null>(null);
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  // Queue Data
  const [registrations, setRegistrations] = useState<RegistrationRecord[]>([]);
  const [approvingRegistration, setApprovingRegistration] = useState<RegistrationRecord | null>(null);
  const [approveStorageMode, setApproveStorageMode] = useState<'CLOUD_DEDICATED' | 'LOCAL'>('CLOUD_DEDICATED');
  const [approveConnectionString, setApproveConnectionString] = useState('');
  const [approveCaCert, setApproveCaCert] = useState('');
  const [approveCaCertName, setApproveCaCertName] = useState('');
  const [isApproving, setIsApproving] = useState(false);

  // Package Inquiries / Leads State & Filters
  const [leads, setLeads] = useState<LeadRecord[]>([]);
  const [leadsSearch, setLeadsSearch] = useState('');
  const [leadsStatusFilter, setLeadsStatusFilter] = useState<'ALL' | 'ENGAGED' | 'NEW'>('ALL');
  const [updatingLeadId, setUpdatingLeadId] = useState<string | null>(null);

  // Dynamic Pricing Plans State
  const [plans, setPlans] = useState<PlanRecord[]>([]);
  const [editingPlan, setEditingPlan] = useState<PlanRecord | null>(null);
  const [savingPlan, setSavingPlan] = useState(false);

  // Audit Logs Data & Filters
  const [auditLogs, setAuditLogs] = useState<AuditLogRecord[]>([]);
  const [auditSearch, setAuditSearch] = useState('');
  const [auditActionFilter, setAuditActionFilter] = useState('ALL');
  const [auditActorFilter, setAuditActorFilter] = useState('ALL');

  // Staff Accounts
  const [staffAccounts, setStaffAccounts] = useState<any[]>([]);
  const [staffToken, setStaffToken] = useState<string | null>(null);

  // Superadmin Staff Management State
  const [editingStaff, setEditingStaff] = useState<any | null>(null);
  const [resettingStaffPassword, setResettingStaffPassword] = useState<any | null>(null);
  const [staffNewPassword, setStaffNewPassword] = useState('');
  const [isCreatingStaff, setIsCreatingStaff] = useState(false);
  const [newStaffFullName, setNewStaffFullName] = useState('');
  const [newStaffEmail, setNewStaffEmail] = useState('');
  const [newStaffPassword, setNewStaffPassword] = useState('');
  const [savingStaff, setSavingStaff] = useState(false);

  const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
  const STORAGE_KEY = 'hr360_admin_session';

  const getAuthHeaders = (tokenOverride?: string) => {
    let token = tokenOverride || staffToken;
    if (!token && typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) token = JSON.parse(raw)?.token;
      } catch {}
    }
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  };

  const saveSession = (staff: StaffUser, caps: any, token?: string) => {
    try {
      if (token) setStaffToken(token);
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          staff,
          capabilities: caps,
          token: token || staffToken,
          lastActive: Date.now(),
        })
      );
    } catch {}
  };

  const clearSession = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
    setLoggedInStaff(null);
    setCapabilities(null);
    setStaffToken(null);
  };

  const updateLastActive = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        parsed.lastActive = Date.now();
        localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
      }
    } catch {}
  };

  // Restore session on refresh if within 30 min
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      const elapsed = Date.now() - (parsed.lastActive || 0);
      if (elapsed < SESSION_TIMEOUT_MS) {
        setLoggedInStaff(parsed.staff);
        setCapabilities(parsed.capabilities);
        if (parsed.token) setStaffToken(parsed.token);
        // Slide last active timestamp
        parsed.lastActive = Date.now();
        localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));

        loadCompanies();
        loadQueue();
        loadLeads();
        loadPlans();
        loadAuditLogs();
        loadStaffList();
      } else {
        localStorage.removeItem(STORAGE_KEY);
        setErrorMsg('Session expired after 30 minutes of inactivity. Please sign in again.');
      }
    } catch {}
  }, []);

  // Inactivity tracking & 30-min auto logout timer
  useEffect(() => {
    if (!loggedInStaff) return;

    let throttleTimer: NodeJS.Timeout | null = null;
    const onUserActivity = () => {
      if (throttleTimer) return;
      throttleTimer = setTimeout(() => {
        updateLastActive();
        throttleTimer = null;
      }, 5000);
    };

    window.addEventListener('mousemove', onUserActivity);
    window.addEventListener('keydown', onUserActivity);
    window.addEventListener('click', onUserActivity);
    window.addEventListener('scroll', onUserActivity);

    const interval = setInterval(() => {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) {
          clearSession();
          return;
        }
        const parsed = JSON.parse(raw);
        const elapsed = Date.now() - (parsed.lastActive || 0);
        if (elapsed >= SESSION_TIMEOUT_MS) {
          clearSession();
          setErrorMsg('Session timed out after 30 minutes of inactivity. Please sign in again.');
        }
      } catch {
        clearSession();
      }
    }, 15000);

    return () => {
      window.removeEventListener('mousemove', onUserActivity);
      window.removeEventListener('keydown', onUserActivity);
      window.removeEventListener('click', onUserActivity);
      window.removeEventListener('scroll', onUserActivity);
      clearInterval(interval);
      if (throttleTimer) clearTimeout(throttleTimer);
    };
  }, [loggedInStaff]);

  const showNotice = (msg: string, type: 'success' | 'error' = 'success') => {
    setActionNotice({ msg, type });
    setTimeout(() => {
      setActionNotice((current) => (current?.msg === msg ? null : current));
    }, 4500);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setActionNotice(null);

    try {
      const res = await fetch('/api/v1/admin/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      let data: any = null;
      try {
        data = await res.json();
      } catch {
        throw new Error('Service temporarily unavailable');
      }
      if (!res.ok) {
        throw new Error(data?.error?.message || 'Authentication failed');
      }

      const token = data.data.token;
      setLoggedInStaff(data.data.staff);
      setCapabilities(data.data.capabilities);
      setStaffToken(token);
      saveSession(data.data.staff, data.data.capabilities, token);

      // Load initial company accounts, queue, inquiries, pricing, and audit
      await Promise.all([
        loadCompanies(token),
        loadQueue(token),
        loadLeads(token),
        loadPlans(),
        loadAuditLogs(token),
      ]);
    } catch (err: any) {
      setErrorMsg(sanitizeDbError(err.message));
    } finally {
      setLoading(false);
    }
  };

  const loadCompanies = async (tokenOverride?: string) => {
    try {
      const res = await fetch('/api/v1/admin/companies', {
        headers: getAuthHeaders(tokenOverride),
      });
      const data = await res.json();
      if (res.ok) {
        setCompanies(data.data || []);
      }
    } catch {}
  };

  const loadLeads = async (tokenOverride?: string) => {
    try {
      const res = await fetch('/api/v1/leads', {
        headers: getAuthHeaders(tokenOverride),
      });
      const data = await res.json();
      if (res.ok) {
        setLeads(data.data || []);
      }
    } catch {}
  };

  const loadPlans = async () => {
    try {
      const res = await fetch('/api/v1/plans');
      const data = await res.json();
      if (res.ok) {
        setPlans(data.data || []);
      }
    } catch {}
  };

  const handleToggleLeadEngagement = async (lead: LeadRecord) => {
    if (!loggedInStaff) return;
    setUpdatingLeadId(lead.id);
    try {
      const res = await fetch('/api/v1/leads', {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          id: lead.id,
          isEngaged: !lead.isEngaged,
          actorEmail: loggedInStaff.email,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showNotice(`Inquiry for "${lead.fullName}" marked as ${!lead.isEngaged ? 'ENGAGED' : 'DISENGAGED'}.`);
        await loadLeads();
        await loadAuditLogs();
      } else {
        showNotice(sanitizeDbError(data?.error?.message || 'Failed to update inquiry status'), 'error');
      }
    } catch (err: any) {
      showNotice(sanitizeDbError(err.message), 'error');
    } finally {
      setUpdatingLeadId(null);
    }
  };

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loggedInStaff || !editingPlan) return;
    setSavingPlan(true);
    try {
      const res = await fetch('/api/v1/plans', {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          id: editingPlan.id,
          code: editingPlan.code,
          name: editingPlan.name,
          priceMonthly: Number(editingPlan.priceMonthly),
          priceAnnual: Number(editingPlan.priceAnnual),
          priceLifetime: Number(editingPlan.priceLifetime),
          maxEmployees: Number(editingPlan.maxEmployees),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showNotice(`Pricing Plan "${editingPlan.name}" updated successfully in master DB.`);
        setEditingPlan(null);
        await loadPlans();
        await loadAuditLogs();
      } else {
        showNotice(sanitizeDbError(data?.error?.message || 'Failed to update pricing plan'), 'error');
      }
    } catch (err: any) {
      showNotice(sanitizeDbError(err.message), 'error');
    } finally {
      setSavingPlan(false);
    }
  };

  const loadQueue = async (tokenOverride?: string) => {
    try {
      const res = await fetch('/api/v1/admin/registrations', {
        headers: getAuthHeaders(tokenOverride),
      });
      const data = await res.json();
      if (res.ok) {
        setRegistrations(data.data || []);
      }
    } catch {}
  };

  const loadAuditLogs = async (tokenOverride?: string) => {
    try {
      const res = await fetch('/api/v1/admin/audit?limit=200', {
        headers: getAuthHeaders(tokenOverride),
      });
      const data = await res.json();
      if (res.ok) {
        setAuditLogs(data.data || []);
      }
    } catch {}
  };

  const loadStaffList = async (tokenOverride?: string) => {
    if (!loggedInStaff && !tokenOverride) return;
    try {
      const res = await fetch('/api/v1/admin/staff', {
        headers: getAuthHeaders(tokenOverride),
      });
      const data = await res.json();
      if (res.ok) {
        setStaffAccounts(data.data || []);
      }
    } catch {}
  };

  // Update Staff Profile (Full Name, Email, Status)
  const handleUpdateStaffProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loggedInStaff || !editingStaff) return;
    setSavingStaff(true);
    try {
      const res = await fetch('/api/v1/admin/staff', {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          staffId: editingStaff.id,
          fullName: editingStaff.fullName,
          email: editingStaff.email,
          isActive: editingStaff.isActive,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showNotice(data.data.message || 'Staff profile updated successfully.');
        setEditingStaff(null);
        await loadStaffList();
        await loadAuditLogs();
      } else {
        showNotice(sanitizeDbError(data?.error?.message || 'Failed to update staff profile.'), 'error');
      }
    } catch (err: any) {
      showNotice(sanitizeDbError(err.message), 'error');
    } finally {
      setSavingStaff(false);
    }
  };

  // Reset Staff Password
  const handleResetStaffPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loggedInStaff || !resettingStaffPassword) return;
    setSavingStaff(true);
    try {
      const res = await fetch('/api/v1/admin/staff', {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          staffId: resettingStaffPassword.id,
          password: staffNewPassword,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showNotice(`Password for "${resettingStaffPassword.fullName}" updated successfully.`);
        setResettingStaffPassword(null);
        setStaffNewPassword('');
        await loadStaffList();
        await loadAuditLogs();
      } else {
        showNotice(sanitizeDbError(data?.error?.message || 'Failed to reset staff password.'), 'error');
      }
    } catch (err: any) {
      showNotice(sanitizeDbError(err.message), 'error');
    } finally {
      setSavingStaff(false);
    }
  };

  // Create New Platform Admin
  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loggedInStaff) return;
    setSavingStaff(true);
    try {
      const res = await fetch('/api/v1/admin/staff', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          fullName: newStaffFullName,
          email: newStaffEmail,
          password: newStaffPassword,
          role: 'ADMIN',
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showNotice(`Platform Admin "${newStaffFullName}" created successfully.`);
        setIsCreatingStaff(false);
        setNewStaffFullName('');
        setNewStaffEmail('');
        setNewStaffPassword('');
        await loadStaffList();
        await loadAuditLogs();
      } else {
        showNotice(sanitizeDbError(data?.error?.message || 'Failed to create platform admin.'), 'error');
      }
    } catch (err: any) {
      showNotice(sanitizeDbError(err.message), 'error');
    } finally {
      setSavingStaff(false);
    }
  };

  // Activate or Deactivate Company Account
  const handleToggleCompanyStatus = async (company: CompanyAccount, targetAction: 'ACTIVATE' | 'DEACTIVATE') => {
    if (!loggedInStaff) return;
    const confirmPrompt = targetAction === 'ACTIVATE'
      ? `Are you sure you want to activate company "${company.name}"? This allows company administrators and staff to sign in.`
      : `Are you sure you want to suspend company "${company.name}"? Company users will be locked out immediately under zero-offline policy.`;

    if (!confirm(confirmPrompt)) return;

    try {
      const res = await fetch('/api/v1/admin/companies', {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          companyId: company.id,
          action: targetAction,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        showNotice(data.data.message);
        await loadCompanies();
        await loadAuditLogs();
        if (selectedCompany?.id === company.id) {
          setSelectedCompany(null);
        }
      } else {
        setErrorMsg(sanitizeDbError(data?.error?.message || 'Failed to update company account'));
      }
    } catch (err: any) {
      setErrorMsg(sanitizeDbError(err.message));
    }
  };

  // Load Company Explorer Data
  const loadExplorerData = async (comp: CompanyAccount, mod?: typeof explorerModule) => {
    if (!loggedInStaff) return;
    const targetModule = mod || explorerModule;
    setIsExplorerLoading(true);
    try {
      const res = await fetch('/api/v1/admin/companies/explorer', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          companyId: comp.id,
          module: targetModule,
          reason: explorerReason,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setExplorerData(data.data?.data || []);
      } else {
        showNotice(sanitizeDbError(data?.error?.message || 'Failed to load company data in explorer.'), 'error');
      }
    } catch (err: any) {
      showNotice(sanitizeDbError(err.message), 'error');
    } finally {
      setIsExplorerLoading(false);
    }
  };

  // Update / Reset Company Admin Password
  const handleSavePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loggedInStaff || !passwordResetCompany) return;
    setIsResettingPassword(true);

    try {
      const res = await fetch('/api/v1/admin/companies', {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          companyId: passwordResetCompany.id,
          action: 'RESET_PASSWORD',
          newPassword: newPasswordInput,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        showNotice(data.data.message);
        setPasswordResetCompany(null);
        setNewPasswordInput('');
        await loadCompanies();
        await loadAuditLogs();
      } else {
        showNotice(sanitizeDbError(data?.error?.message || 'Password update failed.'), 'error');
      }
    } catch (err: any) {
      showNotice(sanitizeDbError(err.message), 'error');
    } finally {
      setIsResettingPassword(false);
    }
  };

  // Moderate Pending Registration
  // Moderate Pending Registration
  const handleModerate = async (id: string, action: 'APPROVE' | 'REJECT') => {
    if (!loggedInStaff) return;
    if (action === 'APPROVE') {
      const reg = registrations.find((r) => r.id === id);
      if (reg) {
        setApprovingRegistration(reg);
        setApproveStorageMode('CLOUD_DEDICATED');
        setApproveConnectionString('');
        return;
      }
    }

    if (!confirm('Are you sure you want to reject this registration?')) return;

    try {
      const res = await fetch(`/api/v1/admin/registrations?id=${id}`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ action: 'REJECT', reason: 'Rejected by administrator.' }),
      });
      const data = await res.json();
      if (res.ok) {
        showNotice(`Registration rejected successfully.`);
        await loadQueue();
        await loadCompanies();
        await loadAuditLogs();
      } else {
        setErrorMsg(sanitizeDbError(data?.error?.message || 'Action failed'));
      }
    } catch (err: any) {
      setErrorMsg(sanitizeDbError(err.message));
    }
  };

  const handleConfirmApprove = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loggedInStaff || !approvingRegistration) return;
    setIsApproving(true);
    try {
      const res = await fetch(`/api/v1/admin/registrations?id=${approvingRegistration.id}`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          action: 'APPROVE',
          storageMode: approveStorageMode,
          connectionString: approveStorageMode === 'CLOUD_DEDICATED' ? approveConnectionString : undefined,
          caCert: approveStorageMode === 'CLOUD_DEDICATED' && approveCaCert ? approveCaCert : undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        const licenseMsg = data?.data?.licenseKey ? ` (Issued License Key: ${data.data.licenseKey})` : '';
        showNotice(`Company approved & provisioned successfully.${licenseMsg}`);
        setApprovingRegistration(null);
        setApproveConnectionString('');
        setApproveCaCert('');
        setApproveCaCertName('');
        await loadQueue();
        await loadCompanies();
        await loadAuditLogs();
      } else {
        showNotice(sanitizeDbError(data?.error?.message || 'Approval & provisioning failed.'), 'error');
      }
    } catch (err: any) {
      showNotice(sanitizeDbError(err.message), 'error');
    } finally {
      setIsApproving(false);
    }
  };

  // Filtered Company Accounts
  const filteredCompanies = companies.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(companySearch.toLowerCase()) ||
      c.slug.toLowerCase().includes(companySearch.toLowerCase()) ||
      c.adminUsers.some((u) => u.email.toLowerCase().includes(companySearch.toLowerCase()));
    const matchesStatus = companyStatusFilter === 'ALL' || c.status === companyStatusFilter;
    return matchesSearch && matchesStatus;
  });

  // Filtered Audit Logs
  const filteredAuditLogs = auditLogs.filter((log) => {
    const matchesSearch =
      log.action.toLowerCase().includes(auditSearch.toLowerCase()) ||
      log.actorId.toLowerCase().includes(auditSearch.toLowerCase()) ||
      (log.metadata && log.metadata.toLowerCase().includes(auditSearch.toLowerCase()));
    const matchesAction = auditActionFilter === 'ALL' || log.action === auditActionFilter;
    const matchesActor = auditActorFilter === 'ALL' || log.actorType === auditActorFilter;
    return matchesSearch && matchesAction && matchesActor;
  });

  // Filtered Package Inquiries / Leads
  const filteredLeads = leads.filter((lead) => {
    const matchesSearch =
      lead.fullName.toLowerCase().includes(leadsSearch.toLowerCase()) ||
      lead.companyName.toLowerCase().includes(leadsSearch.toLowerCase()) ||
      lead.email.toLowerCase().includes(leadsSearch.toLowerCase()) ||
      (lead.phone && lead.phone.toLowerCase().includes(leadsSearch.toLowerCase())) ||
      (lead.whatsapp && lead.whatsapp.toLowerCase().includes(leadsSearch.toLowerCase()));
    const matchesStatus =
      leadsStatusFilter === 'ALL' ||
      (leadsStatusFilter === 'ENGAGED' && lead.isEngaged) ||
      (leadsStatusFilter === 'NEW' && !lead.isEngaged);
    return matchesSearch && matchesStatus;
  });

  // -------------------------------------------------------------
  // Sign In Screen (No Pre-filled values)
  // -------------------------------------------------------------
  if (!loggedInStaff) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 font-sans select-none">
        <div className="bg-white border border-slate-700 shadow-2xl max-w-md w-full p-8 rounded-lg">
          <div className="flex flex-col items-center text-center mb-6">
            <img
              src="/logo.png"
              alt="Platform Logo"
              className="h-12 w-auto mb-3 object-contain"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
            <h2 className="text-lg font-bold text-slate-900 leading-tight">Platform Administration</h2>
            <p className="text-xs text-slate-500 mt-0.5">Direct Console Access</p>
          </div>

          {errorMsg && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-xs text-red-700">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Administrator / Staff Email</label>
              <input
                type="text"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 text-sm focus:outline-none focus:border-slate-800"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 text-sm focus:outline-none focus:border-slate-800"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-slate-900 text-white font-semibold text-xs uppercase tracking-wider hover:bg-slate-800 flex items-center justify-center"
            >
              {loading ? 'Authenticating...' : 'Sign In to Platform'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // Platform Console Dashboard
  // -------------------------------------------------------------
  return (
    <div className="min-h-screen bg-slate-100 font-sans text-slate-800 flex flex-col select-none">
      {/* Top Header */}
      <header className="h-14 bg-slate-900 text-white flex items-center justify-between px-6 border-b border-slate-800">
        <div className="flex items-center space-x-3">
          <img
            src="/logo.png"
            alt="Logo"
            className="h-8 w-auto object-contain brightness-0 invert"
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
          <span className="text-slate-600">|</span>
          <span className="font-bold tracking-tight text-sm text-slate-200">MASTER PLATFORM CONSOLE</span>
          <span className="text-slate-500">|</span>
          <span className={`text-xs px-2 py-0.5 font-semibold ${
            loggedInStaff.role === 'SUPER_ADMIN' ? 'bg-amber-600 text-white' : 'bg-blue-600 text-white'
          }`}>
            {loggedInStaff.role === 'SUPER_ADMIN' ? 'SUPER ADMIN (ROOT)' : 'ADMINISTRATOR'}
          </span>
        </div>
        <div className="flex items-center space-x-4 text-xs">
          <span>{loggedInStaff.fullName} ({loggedInStaff.email})</span>
          <button
            onClick={clearSession}
            className="flex items-center text-slate-400 hover:text-white"
          >
            <LogOut className="w-3.5 h-3.5 mr-1" />
            Sign Out
          </button>
        </div>
      </header>

      {/* Main Console Workspace */}
      <div className="flex flex-1 overflow-hidden">
        {/* Navigation Sidebar */}
        <aside className="w-64 bg-slate-800 text-slate-300 p-3 space-y-1">
          <div className="px-3 py-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Management Modules
          </div>

          <button
            onClick={() => { setActiveTab('companies'); loadCompanies(); }}
            className={`w-full flex items-center px-3 py-2 text-xs font-medium rounded ${
              activeTab === 'companies' ? 'bg-slate-700 text-white font-semibold' : 'hover:bg-slate-700/50'
            }`}
          >
            <Building className="w-4 h-4 mr-2 text-emerald-400" />
            Company Accounts ({companies.length})
          </button>

          <button
            onClick={() => { setActiveTab('queue'); loadQueue(); }}
            className={`w-full flex items-center px-3 py-2 text-xs font-medium rounded ${
              activeTab === 'queue' ? 'bg-slate-700 text-white font-semibold' : 'hover:bg-slate-700/50'
            }`}
          >
            <Layers className="w-4 h-4 mr-2 text-blue-400" />
            Registrations Queue ({registrations.filter((r) => r.status === 'PENDING').length})
          </button>

          <button
            onClick={() => { setActiveTab('inquiries'); loadLeads(); }}
            className={`w-full flex items-center px-3 py-2 text-xs font-medium rounded ${
              activeTab === 'inquiries' ? 'bg-slate-700 text-white font-semibold' : 'hover:bg-slate-700/50'
            }`}
          >
            <MessageSquare className="w-4 h-4 mr-2 text-indigo-400" />
            Package Inquiries ({leads.filter((l) => !l.isEngaged).length} New)
          </button>

          <button
            onClick={() => { setActiveTab('pricing'); loadPlans(); }}
            className={`w-full flex items-center px-3 py-2 text-xs font-medium rounded ${
              activeTab === 'pricing' ? 'bg-slate-700 text-white font-semibold' : 'hover:bg-slate-700/50'
            }`}
          >
            <DollarSign className="w-4 h-4 mr-2 text-emerald-400" />
            Pricing Plans (Dynamic)
          </button>

          <button
            onClick={() => { setActiveTab('audit'); loadAuditLogs(); }}
            className={`w-full flex items-center px-3 py-2 text-xs font-medium rounded ${
              activeTab === 'audit' ? 'bg-slate-700 text-white font-semibold' : 'hover:bg-slate-700/50'
            }`}
          >
            <Clock className="w-4 h-4 mr-2 text-amber-400" />
            Audit Trail & History ({auditLogs.length})
          </button>

          <button
            onClick={() => { setActiveTab('staff'); loadStaffList(); }}
            className={`w-full flex items-center px-3 py-2 text-xs font-medium rounded ${
              activeTab === 'staff' ? 'bg-slate-700 text-white font-semibold' : 'hover:bg-slate-700/50'
            }`}
          >
            <Users className="w-4 h-4 mr-2 text-purple-400" />
            Platform Staff & Security
          </button>
        </aside>

        {/* Tab Content */}
        <main className="flex-1 p-6 overflow-y-auto bg-slate-50">
          {actionNotice && (
            <div
              className={`mb-4 p-3 border text-xs font-semibold flex items-center justify-between rounded-lg shadow-xs transition-all ${
                actionNotice.type === 'error'
                  ? 'bg-rose-50 border-rose-300 text-rose-800'
                  : 'bg-emerald-50 border-emerald-300 text-emerald-800'
              }`}
            >
              <span className="flex items-center">
                <span className="mr-2">{actionNotice.type === 'error' ? '⚠️' : '✓'}</span>
                {actionNotice.msg}
              </span>
              <button
                onClick={() => setActionNotice(null)}
                className="font-bold ml-3 text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>
          )}

          {/* 1. COMPANY ACCOUNTS MANAGEMENT TAB */}
          {activeTab === 'companies' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                <div>
                  <h1 className="text-xl font-bold text-slate-900 flex items-center">
                    <Building className="w-5 h-5 mr-2 text-slate-800" />
                    Company Accounts & Tenancy Directory
                  </h1>
                  <p className="text-xs text-slate-500">
                    Live accounts in master database | Activate, deactivate, inspect credentials, and reset admin passwords
                  </p>
                </div>
                <button
                  onClick={() => loadCompanies()}
                  className="px-3 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded hover:bg-slate-800 flex items-center"
                >
                  <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                  Refresh Accounts
                </button>
              </div>

              {/* Filters Toolbar */}
              <div className="flex flex-wrap gap-3 bg-white p-3 border border-slate-200 shadow-sm text-xs">
                <div className="flex-1 min-w-[200px] relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search company name, slug, or admin email..."
                    value={companySearch}
                    onChange={(e) => setCompanySearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 border border-slate-300 text-xs focus:outline-none"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <span className="font-semibold text-slate-600">Status:</span>
                  <select
                    value={companyStatusFilter}
                    onChange={(e) => setCompanyStatusFilter(e.target.value)}
                    className="border border-slate-300 px-2 py-1.5 text-xs bg-white focus:outline-none"
                  >
                    <option value="ALL">ALL STATUSES</option>
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="SUSPENDED">SUSPENDED</option>
                    <option value="INACTIVE">INACTIVE</option>
                  </select>
                </div>
              </div>

              {/* Company Accounts Table */}
              <div className="bg-white border border-slate-200 shadow-sm overflow-x-auto text-xs">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 font-semibold">
                    <tr>
                      <th className="p-3">Company Legal Name</th>
                      <th className="p-3">Tenant Slug / DB</th>
                      <th className="p-3">Admin Email (Login)</th>
                      <th className="p-3">Last Sign In</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-right">Administrative Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredCompanies.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-6 text-center text-slate-400">
                          No company accounts match the filter.
                        </td>
                      </tr>
                    ) : (
                      filteredCompanies.map((c) => {
                        const primaryAdmin = c.adminUsers[0];
                        return (
                          <tr key={c.id} className="hover:bg-slate-50">
                            <td className="p-3 font-bold text-slate-900">{c.name}</td>
                            <td className="p-3">
                              <span className="font-mono text-[11px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">
                                {c.databaseName}
                              </span>
                            </td>
                            <td className="p-3">
                              <div className="font-medium text-slate-800">{primaryAdmin?.email || 'None'}</div>
                              <div className="text-[10px] text-slate-500">{primaryAdmin?.fullName}</div>
                            </td>
                            <td className="p-3 text-slate-500 font-mono text-[11px]">
                              {primaryAdmin?.lastLoginAt
                                ? new Date(primaryAdmin.lastLoginAt).toLocaleString()
                                : 'Never signed in'}
                            </td>
                            <td className="p-3">
                              <span
                                className={`px-2 py-0.5 font-bold text-[10px] ${
                                  c.status === 'ACTIVE'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-red-100 text-red-800'
                                }`}
                              >
                                {c.status}
                              </span>
                            </td>
                            <td className="p-3 text-right space-x-1">
                              <button
                                onClick={() => {
                                  setExplorerCompany(c);
                                  setExplorerModule('employees');
                                  loadExplorerData(c, 'employees');
                                }}
                                className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded text-[11px] inline-flex items-center font-medium"
                                title="Open Read-Only Company Data Explorer"
                              >
                                <Database className="w-3 h-3 mr-1" /> Explorer
                              </button>

                              <button
                                onClick={() => setSelectedCompany(c)}
                                className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] inline-flex items-center"
                                title="Inspect Account Details"
                              >
                                <Eye className="w-3 h-3 mr-1" /> Details
                              </button>

                              <button
                                onClick={() => setPasswordResetCompany(c)}
                                className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded text-[11px] inline-flex items-center font-medium"
                                title="Reset Company Administrator Password"
                              >
                                <Key className="w-3 h-3 mr-1" /> Reset Password
                              </button>

                              {c.status === 'ACTIVE' ? (
                                <button
                                  onClick={() => handleToggleCompanyStatus(c, 'DEACTIVATE')}
                                  className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-[11px] inline-flex items-center font-medium"
                                  title="Suspend / Deactivate Company Account"
                                >
                                  <Power className="w-3 h-3 mr-1" /> Suspend
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleToggleCompanyStatus(c, 'ACTIVATE')}
                                  className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] inline-flex items-center font-medium"
                                  title="Activate Company Account"
                                >
                                  <CheckCircle className="w-3 h-3 mr-1" /> Activate
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 2. REGISTRATIONS QUEUE TAB */}
          {activeTab === 'queue' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                <div>
                  <h1 className="text-xl font-bold text-slate-900">Company Registrations Queue</h1>
                  <p className="text-xs text-slate-500">Sales-Assisted Onboarding: Review pending requests before automated provisioning</p>
                </div>
                <button
                  onClick={() => loadQueue()}
                  className="px-3 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded hover:bg-slate-800"
                >
                  Refresh Queue
                </button>
              </div>

              {registrations.length === 0 ? (
                <div className="p-8 text-center bg-white border border-slate-200 text-slate-500 text-xs">
                  No company registrations in queue yet. New requests created via Desktop or Portal appear here with status PENDING.
                </div>
              ) : (
                <div className="bg-white border border-slate-200 shadow-sm overflow-hidden text-xs">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 font-semibold">
                      <tr>
                        <th className="p-3">Company Name</th>
                        <th className="p-3">Requested Plan & Cycle</th>
                        <th className="p-3">Admin Email</th>
                        <th className="p-3">Contact</th>
                        <th className="p-3">Status</th>
                        <th className="p-3">Submitted</th>
                        <th className="p-3 text-right">Moderation Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {registrations.map((r) => (
                        <tr key={r.id} className="hover:bg-slate-50">
                          <td className="p-3 font-semibold text-slate-900">{r.companyName}</td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 bg-slate-900 text-white font-mono font-bold text-[10px] rounded">
                              {r.selectedPlanTier || 'STARTER'}
                            </span>
                            <span className="ml-1 px-1.5 py-0.5 bg-blue-100 text-blue-800 font-bold text-[10px] rounded">
                              {r.selectedInterval || 'MONTHLY'}
                            </span>
                          </td>
                          <td className="p-3 text-slate-600 font-mono">{r.adminEmail}</td>
                          <td className="p-3 text-slate-500">{r.adminFullName} ({r.phone})</td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 text-[11px] font-semibold ${
                              r.status === 'PENDING' ? 'bg-amber-100 text-amber-800' :
                              r.status === 'APPROVED' || r.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {r.status}
                            </span>
                          </td>
                          <td className="p-3 text-slate-500">{new Date(r.createdAt).toLocaleDateString()}</td>
                          <td className="p-3 text-right space-x-2">
                            {r.status === 'PENDING' && (
                              <>
                                <button
                                  onClick={() => handleModerate(r.id, 'APPROVE')}
                                  className="px-2.5 py-1 bg-emerald-600 text-white font-medium text-[11px] hover:bg-emerald-700 rounded"
                                >
                                  Approve & Provision
                                </button>
                                <button
                                  onClick={() => handleModerate(r.id, 'REJECT')}
                                  className="px-2.5 py-1 bg-red-600 text-white font-medium text-[11px] hover:bg-red-700 rounded"
                                >
                                  Reject
                                </button>
                              </>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* 3. PACKAGE INQUIRIES & BILLING LEADS TAB */}
          {activeTab === 'inquiries' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                <div>
                  <h1 className="text-xl font-bold text-slate-900 flex items-center">
                    <MessageSquare className="w-5 h-5 mr-2 text-indigo-600" />
                    Package Inquiries & Sales Engagement Leads
                  </h1>
                  <p className="text-xs text-slate-500">
                    Direct inquiries from website package modal | Contact prospects via Phone & WhatsApp, track engagement status
                  </p>
                </div>
                <button
                  onClick={() => loadLeads()}
                  className="px-3 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded hover:bg-slate-800 flex items-center"
                >
                  <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                  Refresh Inquiries
                </button>
              </div>

              {/* Filters Toolbar */}
              <div className="flex flex-wrap gap-3 bg-white p-3 border border-slate-200 shadow-sm text-xs">
                <div className="flex-1 min-w-[200px] relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search prospect name, company, email, phone or WhatsApp..."
                    value={leadsSearch}
                    onChange={(e) => setLeadsSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 border border-slate-300 text-xs focus:outline-none"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <span className="font-semibold text-slate-600">Engagement:</span>
                  <select
                    value={leadsStatusFilter}
                    onChange={(e: any) => setLeadsStatusFilter(e.target.value)}
                    className="border border-slate-300 px-2 py-1.5 text-xs bg-white focus:outline-none"
                  >
                    <option value="ALL">ALL ({leads.length})</option>
                    <option value="NEW">NEW / DISENGAGED ({leads.filter((l) => !l.isEngaged).length})</option>
                    <option value="ENGAGED">ENGAGED ({leads.filter((l) => l.isEngaged).length})</option>
                  </select>
                </div>
              </div>

              {filteredLeads.length === 0 ? (
                <div className="p-8 text-center bg-white border border-slate-200 text-slate-500 text-xs">
                  No package inquiries match the search or filter criteria. New inquiries submitted from the website pricing modal will appear here.
                </div>
              ) : (
                <div className="bg-white border border-slate-200 shadow-sm overflow-hidden text-xs">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 font-semibold">
                      <tr>
                        <th className="p-3">Customer & Company</th>
                        <th className="p-3">Requested Package</th>
                        <th className="p-3">Phone</th>
                        <th className="p-3">WhatsApp</th>
                        <th className="p-3">Engagement Status</th>
                        <th className="p-3">Date</th>
                        <th className="p-3 text-right">Engagement Toggle</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredLeads.map((lead) => (
                        <tr key={lead.id} className="hover:bg-slate-50">
                          <td className="p-3">
                            <div className="font-bold text-slate-900">{lead.fullName}</div>
                            <div className="text-slate-500 font-medium">{lead.companyName}</div>
                            <div className="text-slate-400 font-mono text-[10px]">{lead.email}</div>
                          </td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 bg-slate-900 text-white font-mono font-bold text-[10px] rounded">
                              {lead.selectedTier || 'STARTER'}
                            </span>
                            <span className="ml-1 px-1.5 py-0.5 bg-blue-100 text-blue-800 font-bold text-[10px] rounded">
                              {lead.selectedPackage || 'MONTHLY'}
                            </span>
                          </td>
                          <td className="p-3 font-mono text-slate-700">{lead.phone || '—'}</td>
                          <td className="p-3">
                            {lead.whatsapp ? (
                              <a
                                href={`https://wa.me/${lead.whatsapp.replace(/[^0-9]/g, '')}`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center text-emerald-700 font-mono font-semibold hover:underline"
                                title="Open WhatsApp Chat"
                              >
                                <Phone className="w-3 h-3 mr-1 text-emerald-600" />
                                {lead.whatsapp}
                              </a>
                            ) : (
                              <span className="text-slate-400 font-mono">—</span>
                            )}
                          </td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 text-[10px] font-bold rounded inline-flex items-center ${
                              lead.isEngaged ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                            }`}>
                              {lead.isEngaged ? 'ENGAGED' : 'NEW / DISENGAGED'}
                            </span>
                          </td>
                          <td className="p-3 text-slate-500 text-[11px] whitespace-nowrap">
                            {new Date(lead.createdAt).toLocaleDateString()}
                          </td>
                          <td className="p-3 text-right">
                            <button
                              disabled={updatingLeadId === lead.id}
                              onClick={() => handleToggleLeadEngagement(lead)}
                              className={`px-3 py-1 text-[11px] font-semibold rounded inline-flex items-center transition-colors ${
                                lead.isEngaged
                                  ? 'bg-slate-200 hover:bg-slate-300 text-slate-800'
                                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                              }`}
                              title={lead.isEngaged ? 'Mark Disengaged' : 'Mark Engaged'}
                            >
                              {updatingLeadId === lead.id ? (
                                'Updating...'
                              ) : lead.isEngaged ? (
                                <>
                                  <UserX className="w-3 h-3 mr-1" /> Mark Disengaged
                                </>
                              ) : (
                                <>
                                  <UserCheck className="w-3 h-3 mr-1" /> Mark Engaged
                                </>
                              )}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* 4. DYNAMIC PRICING PLANS MANAGEMENT TAB */}
          {activeTab === 'pricing' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                <div>
                  <h1 className="text-xl font-bold text-slate-900 flex items-center">
                    <DollarSign className="w-5 h-5 mr-2 text-emerald-600" />
                    Dynamic Subscription Pricing & Tier Limits
                  </h1>
                  <p className="text-xs text-slate-500">
                    Live database tier rates | Changes sync dynamically across the website and desktop onboarding limits
                  </p>
                </div>
                <button
                  onClick={() => loadPlans()}
                  className="px-3 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded hover:bg-slate-800 flex items-center"
                >
                  <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                  Refresh Plans
                </button>
              </div>

              {/* Policy Banners */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div className="p-3 bg-blue-50 border border-blue-200 rounded text-blue-900">
                  <div className="font-bold">Biometric Terminal Policy</div>
                  <div className="text-[11px] text-blue-700">Strict limit: Exactly 1 biometric terminal integrated across all tiers.</div>
                </div>
                <div className="p-3 bg-purple-50 border border-purple-200 rounded text-purple-900">
                  <div className="font-bold">Database Architecture</div>
                  <div className="text-[11px] text-purple-700">Dedicated cloud DB per company. Zero offline persistence policy.</div>
                </div>
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded text-emerald-900">
                  <div className="font-bold">Billing Architecture</div>
                  <div className="text-[11px] text-emerald-700">Manual verification model. Admin confirms agreement with engaged clients.</div>
                </div>
              </div>

              {/* Plans Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {plans.map((p) => (
                  <div key={p.id} className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm space-y-4 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start pb-3 border-b border-slate-100">
                        <div>
                          <span className="font-mono text-[10px] font-bold text-slate-400">{p.code}</span>
                          <h3 className="text-base font-bold text-slate-900">{p.name}</h3>
                        </div>
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded">
                          ACTIVE TIER
                        </span>
                      </div>

                      <div className="py-3 space-y-2 text-xs">
                        <div className="flex justify-between items-center p-2 bg-slate-50 rounded">
                          <span className="text-slate-600 font-medium">Monthly Package:</span>
                          <span className="font-bold text-slate-900 font-mono text-sm">${p.priceMonthly} / mo</span>
                        </div>
                        <div className="flex justify-between items-center p-2 bg-slate-50 rounded">
                          <span className="text-slate-600 font-medium">Annual Package:</span>
                          <span className="font-bold text-slate-900 font-mono text-sm">${p.priceAnnual} / mo</span>
                        </div>
                        <div className="flex justify-between items-center p-2 bg-slate-50 rounded">
                          <span className="text-slate-600 font-medium">Lifetime Perpetual:</span>
                          <span className="font-bold text-emerald-700 font-mono text-sm">${p.priceLifetime} one-time</span>
                        </div>
                        <div className="flex justify-between items-center p-2 bg-slate-50 rounded">
                          <span className="text-slate-600 font-medium">Max Employees:</span>
                          <span className="font-bold text-slate-900 font-mono">
                            {p.maxEmployees >= 999999 ? 'Unlimited' : p.maxEmployees}
                          </span>
                        </div>
                        <div className="flex justify-between items-center p-2 bg-slate-50 rounded">
                          <span className="text-slate-600 font-medium">Biometric Terminals:</span>
                          <span className="font-bold text-slate-900 font-mono">1 Device Limit</span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => setEditingPlan({ ...p })}
                      className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded flex items-center justify-center transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5 mr-1.5" />
                      Edit Tier Pricing & Limits
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 5. AUDIT LOG TAB */}
          {activeTab === 'audit' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                <div>
                  <h1 className="text-xl font-bold text-slate-900 flex items-center">
                    <Clock className="w-5 h-5 mr-2 text-slate-800" />
                    Cryptographic Platform Audit Trail
                  </h1>
                  <p className="text-xs text-slate-500">
                    Live events: Tracks company logins, logouts, record deletions, status updates, and staff actions
                  </p>
                </div>
                <button
                  onClick={() => loadAuditLogs()}
                  className="px-3 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded hover:bg-slate-800 flex items-center"
                >
                  <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                  Refresh Logs
                </button>
              </div>

              {/* Filters Toolbar */}
              <div className="flex flex-wrap gap-3 bg-white p-3 border border-slate-200 shadow-sm text-xs">
                <div className="flex-1 min-w-[200px] relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search action, actor ID, or metadata..."
                    value={auditSearch}
                    onChange={(e) => setAuditSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 border border-slate-300 text-xs focus:outline-none"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <span className="font-semibold text-slate-600">Action:</span>
                  <select
                    value={auditActionFilter}
                    onChange={(e) => setAuditActionFilter(e.target.value)}
                    className="border border-slate-300 px-2 py-1.5 text-xs bg-white focus:outline-none"
                  >
                    <option value="ALL">ALL ACTIONS</option>
                    <option value="COMPANY_ADMIN_LOGIN">COMPANY_ADMIN_LOGIN</option>
                    <option value="COMPANY_ADMIN_LOGOUT">COMPANY_ADMIN_LOGOUT</option>
                    <option value="DELETE_EMPLOYEE_RECORD">DELETE_EMPLOYEE_RECORD</option>
                    <option value="COMPANY_ACCOUNT_ACTIVATED">COMPANY_ACCOUNT_ACTIVATED</option>
                    <option value="COMPANY_ACCOUNT_DEACTIVATED">COMPANY_ACCOUNT_DEACTIVATED</option>
                    <option value="COMPANY_ADMIN_PASSWORD_UPDATED">COMPANY_ADMIN_PASSWORD_UPDATED</option>
                  </select>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="font-semibold text-slate-600">Actor Type:</span>
                  <select
                    value={auditActorFilter}
                    onChange={(e) => setAuditActorFilter(e.target.value)}
                    className="border border-slate-300 px-2 py-1.5 text-xs bg-white focus:outline-none"
                  >
                    <option value="ALL">ALL TYPES</option>
                    <option value="TENANT_USER">TENANT_USER</option>
                    <option value="STAFF">STAFF</option>
                    <option value="SYSTEM">SYSTEM</option>
                  </select>
                </div>
              </div>

              {/* Audit Table */}
              <div className="bg-white border border-slate-200 shadow-sm overflow-x-auto text-xs">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 font-semibold">
                    <tr>
                      <th className="p-3">Timestamp</th>
                      <th className="p-3">Action</th>
                      <th className="p-3">Actor Type</th>
                      <th className="p-3">Actor ID</th>
                      <th className="p-3">Target Entity</th>
                      <th className="p-3">Metadata</th>
                      <th className="p-3">IP Address</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredAuditLogs.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-6 text-center text-slate-400">
                          No audit records found matching the filter criteria.
                        </td>
                      </tr>
                    ) : (
                      filteredAuditLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-slate-50">
                          <td className="p-3 font-mono text-slate-500 whitespace-nowrap">
                            {new Date(log.createdAt).toLocaleString()}
                          </td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 bg-slate-100 font-mono font-bold text-slate-800 text-[10px] rounded">
                              {log.action}
                            </span>
                          </td>
                          <td className="p-3">
                            <span className={`px-1.5 py-0.5 text-[9px] font-bold rounded ${
                              log.actorType === 'TENANT_USER' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                            }`}>
                              {log.actorType}
                            </span>
                          </td>
                          <td className="p-3 font-mono text-slate-600 text-[11px] truncate max-w-[150px]">
                            {log.actorId}
                          </td>
                          <td className="p-3 font-mono text-slate-600 text-[11px]">
                            {log.entityType} ({log.entityId.slice(0, 8)}...)
                          </td>
                          <td className="p-3 font-mono text-slate-600 text-[10px] max-w-[280px] truncate" title={log.metadata || ''}>
                            {log.metadata || '—'}
                          </td>
                          <td className="p-3 font-mono text-slate-400 text-[11px]">{log.ipAddress || '127.0.0.1'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 4. PLATFORM STAFF TAB */}
          {activeTab === 'staff' && (
            <div className="space-y-4">
              <div className="pb-2 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <h1 className="text-xl font-bold text-slate-900">Platform Staff Accounts & Role Separation</h1>
                  <p className="text-xs text-slate-500">
                    {loggedInStaff.role === 'SUPER_ADMIN'
                      ? 'Root Console: Manage administrator accounts, profiles, passwords, and security status.'
                      : 'Standard Admin view: Super Admin accounts are excluded in the data layer and cannot be viewed or referenced.'}
                  </p>
                </div>
                {loggedInStaff.role === 'SUPER_ADMIN' && (
                  <button
                    type="button"
                    onClick={() => {
                      setNewStaffFullName('');
                      setNewStaffEmail('');
                      setNewStaffPassword('');
                      setIsCreatingStaff(true);
                    }}
                    className="cursor-pointer px-3 py-1.5 bg-slate-900 text-white font-semibold text-xs rounded hover:bg-slate-800 flex items-center space-x-1.5 shadow-xs w-fit"
                  >
                    <span>+ Add Platform Admin</span>
                  </button>
                )}
              </div>

              <div className="bg-white border border-slate-200 shadow-sm overflow-hidden text-xs">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 font-semibold">
                    <tr>
                      <th className="p-3">Full Name</th>
                      <th className="p-3">Email</th>
                      <th className="p-3">Role</th>
                      <th className="p-3">2FA Active</th>
                      <th className="p-3">Status</th>
                      {loggedInStaff.role === 'SUPER_ADMIN' && (
                        <th className="p-3 text-right">Actions</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {staffAccounts.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50">
                        <td className="p-3 font-medium text-slate-900">{s.fullName}</td>
                        <td className="p-3 font-mono text-slate-600">{s.email}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 text-[10px] font-bold ${
                            s.role === 'SUPER_ADMIN' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                          }`}>
                            {s.role}
                          </span>
                        </td>
                        <td className="p-3 text-slate-500">{s.totpEnabled ? 'Yes' : 'No'}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                            s.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {s.isActive ? 'ACTIVE' : 'SUSPENDED'}
                          </span>
                        </td>
                        {loggedInStaff.role === 'SUPER_ADMIN' && (
                          <td className="p-3 text-right space-x-2">
                            <button
                              type="button"
                              onClick={() => setEditingStaff({ ...s })}
                              className="cursor-pointer px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded font-semibold text-[11px] border border-slate-300"
                            >
                              Edit Profile
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setResettingStaffPassword(s);
                                setStaffNewPassword('');
                              }}
                              className="cursor-pointer px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded font-semibold text-[11px] border border-amber-300"
                            >
                              Reset Password
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Account Details Drawer / Modal */}
      {selectedCompany && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-300 shadow-2xl max-w-lg w-full p-6 text-xs space-y-4">
            <div className="flex justify-between items-center pb-2 border-b">
              <div>
                <h3 className="font-bold text-base text-slate-900">{selectedCompany.name}</h3>
                <p className="text-slate-500 font-mono text-[11px]">Database: {selectedCompany.databaseName}</p>
              </div>
              <button onClick={() => setSelectedCompany(null)} className="font-bold text-base text-slate-400">✕</button>
            </div>

            <div className="space-y-2 text-slate-700">
              <div className="flex justify-between p-2 bg-slate-50 rounded">
                <span>Account Status:</span>
                <span className="font-bold">{selectedCompany.status}</span>
              </div>
              {selectedCompany.licenseKey && (
                <div className="p-2.5 bg-blue-50 border border-blue-200 rounded flex justify-between items-center text-blue-900">
                  <div>
                    <span className="text-[10px] font-bold block uppercase text-blue-700">Desktop License Key</span>
                    <span className="font-mono font-bold text-xs select-all text-blue-950">{selectedCompany.licenseKey}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(selectedCompany.licenseKey || '');
                      showNotice('License key copied to clipboard!');
                    }}
                    className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-[10px] font-bold"
                  >
                    Copy Key
                  </button>
                </div>
              )}
              <div className="flex justify-between p-2 bg-slate-50 rounded">
                <span>Tenant Slug:</span>
                <span className="font-mono font-bold">{selectedCompany.slug}</span>
              </div>
              <div className="flex justify-between p-2 bg-slate-50 rounded">
                <span>Registered Phone:</span>
                <span>{selectedCompany.phone || 'N/A'}</span>
              </div>
              <div className="flex justify-between p-2 bg-slate-50 rounded">
                <span>Country:</span>
                <span>{selectedCompany.country || 'PK'}</span>
              </div>
              <div className="flex justify-between p-2 bg-slate-50 rounded">
                <span>Account Created:</span>
                <span>{new Date(selectedCompany.createdAt).toLocaleDateString()}</span>
              </div>
            </div>

            <div className="border-t pt-3">
              <div className="font-bold text-slate-900 mb-2 flex items-center justify-between">
                <span>Subscription Plan & Deadline:</span>
                {selectedCompany.subscription ? (
                  <span className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                    selectedCompany.subscription.isExpired ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    {selectedCompany.subscription.isExpired ? 'EXPIRED' : 'ACTIVE'}
                  </span>
                ) : (
                  <span className="text-slate-400 font-normal">None Assigned</span>
                )}
              </div>
              {selectedCompany.subscription ? (
                <div className="p-2.5 border rounded bg-slate-50 space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Plan:</span>
                    <span className="font-bold text-slate-900">{selectedCompany.subscription.planName} ({selectedCompany.subscription.interval})</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Expiration Deadline:</span>
                    <span className="font-mono font-bold text-slate-900">
                      {new Date(selectedCompany.subscription.expiresAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Grace Period:</span>
                    <span className="font-mono">{selectedCompany.subscription.graceDays} Days</span>
                  </div>
                </div>
              ) : (
                <div className="p-2 text-slate-400 italic bg-slate-50 border rounded">
                  No subscription assigned. Defaults to Enterprise trial with 30-day offline grace.
                </div>
              )}
            </div>

            <div className="border-t pt-3">
              <div className="font-bold text-slate-900 mb-2">Subscription Payments & Invoices ({selectedCompany.invoices?.length || 0}):</div>
              {selectedCompany.invoices && selectedCompany.invoices.length > 0 ? (
                <div className="space-y-1.5">
                  {selectedCompany.invoices.map((inv) => (
                    <div key={inv.id} className="p-2 border rounded bg-slate-50 flex justify-between items-center text-[11px]">
                      <div>
                        <div className="font-bold font-mono text-slate-800">{inv.invoiceNumber}</div>
                        <div className="text-[10px] text-slate-500">{new Date(inv.issuedAt).toLocaleDateString()}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold font-mono">{inv.currency} {inv.amountTotal.toLocaleString()}</div>
                        <span className={`px-1.5 py-0.2 text-[9px] font-bold rounded ${
                          inv.status === 'PAID' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {inv.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-2 text-slate-400 italic bg-slate-50 border rounded">
                  No billing invoices issued yet.
                </div>
              )}
            </div>

            <div className="border-t pt-3">
              <div className="font-bold text-slate-900 mb-2">Company User Logins ({selectedCompany.adminUsers.length}):</div>
              <div className="space-y-2">
                {selectedCompany.adminUsers.map((u) => (
                  <div key={u.id} className="p-2 border rounded bg-slate-50 text-[11px] flex justify-between items-center">
                    <div>
                      <div className="font-bold text-slate-800">{u.fullName} ({u.role})</div>
                      <div className="font-mono text-slate-500">{u.email}</div>
                    </div>
                    <div className="text-right">
                      <span className={`px-1.5 py-0.5 text-[9px] font-bold rounded ${u.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                        {u.isActive ? 'Active' : 'Locked'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedCompany(null)}
                className="px-4 py-1.5 bg-slate-900 text-white rounded font-medium hover:bg-slate-800"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Password Reset Modal */}
      {passwordResetCompany && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-300 shadow-2xl max-w-md w-full p-6 text-xs space-y-4">
            <div className="flex justify-between items-center pb-2 border-b">
              <h3 className="font-bold text-base text-slate-900 flex items-center">
                <Key className="w-4 h-4 mr-2 text-amber-600" />
                Reset Company Administrator Password
              </h3>
              <button onClick={() => setPasswordResetCompany(null)} className="font-bold text-base text-slate-400">✕</button>
            </div>

            <p className="text-slate-600">
              Update password for <span className="font-bold">{passwordResetCompany.adminUsers[0]?.email}</span> ({passwordResetCompany.name}).
              This will rehash with Argon2id and update the master database.
            </p>

            <form onSubmit={handleSavePasswordReset} className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">New Password *</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={newPasswordInput}
                  onChange={(e) => setNewPasswordInput(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 text-xs focus:outline-none focus:border-slate-800"
                  placeholder="Minimum 8 characters"
                />
              </div>

              <div className="pt-3 border-t flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setPasswordResetCompany(null)}
                  className="px-4 py-1.5 border border-slate-300 text-slate-700 rounded hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isResettingPassword}
                  className="px-4 py-1.5 bg-slate-900 text-white font-semibold rounded hover:bg-slate-800"
                >
                  {isResettingPassword ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Plan Edit Modal */}
      {editingPlan && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-300 shadow-2xl max-w-md w-full p-6 text-xs space-y-4 rounded-lg">
            <div className="flex justify-between items-center pb-2 border-b">
              <h3 className="font-bold text-base text-slate-900 flex items-center">
                <DollarSign className="w-4 h-4 mr-1 text-emerald-600" />
                Edit Plan: {editingPlan.name}
              </h3>
              <button onClick={() => setEditingPlan(null)} className="font-bold text-base text-slate-400">✕</button>
            </div>

            <form onSubmit={handleSavePlan} className="space-y-3.5">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Plan Display Name</label>
                <input
                  type="text"
                  required
                  value={editingPlan.name}
                  onChange={(e) => setEditingPlan({ ...editingPlan, name: e.target.value })}
                  className="w-full px-3 py-1.5 border border-slate-300 text-xs focus:outline-none focus:border-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Monthly Price ($)</label>
                  <input
                    type="number"
                    required
                    min={0}
                    step={1}
                    value={editingPlan.priceMonthly}
                    onChange={(e) => setEditingPlan({ ...editingPlan, priceMonthly: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 border border-slate-300 text-xs focus:outline-none focus:border-slate-800 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Annual Price ($/mo equivalent)</label>
                  <input
                    type="number"
                    required
                    min={0}
                    step={1}
                    value={editingPlan.priceAnnual}
                    onChange={(e) => setEditingPlan({ ...editingPlan, priceAnnual: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 border border-slate-300 text-xs focus:outline-none focus:border-slate-800 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Lifetime Package Price ($ One-Time)</label>
                <input
                  type="number"
                  required
                  min={0}
                  step={1}
                  value={editingPlan.priceLifetime}
                  onChange={(e) => setEditingPlan({ ...editingPlan, priceLifetime: Number(e.target.value) })}
                  className="w-full px-3 py-1.5 border border-slate-300 text-xs focus:outline-none focus:border-slate-800 font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Maximum Employee Headcount</label>
                <input
                  type="number"
                  required
                  min={1}
                  value={editingPlan.maxEmployees}
                  onChange={(e) => setEditingPlan({ ...editingPlan, maxEmployees: Number(e.target.value) })}
                  className="w-full px-3 py-1.5 border border-slate-300 text-xs focus:outline-none focus:border-slate-800 font-mono"
                />
                <span className="text-[10px] text-slate-500">Enter 999999 for unlimited headcount.</span>
              </div>

              <div className="p-2.5 bg-slate-50 border rounded text-[11px] text-slate-600">
                Notice: All plans are locked to exactly 1 biometric device limit in compliance with platform rules.
              </div>

              <div className="pt-3 border-t flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setEditingPlan(null)}
                  className="px-4 py-1.5 border border-slate-300 text-slate-700 rounded hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingPlan}
                  className="px-4 py-1.5 bg-slate-900 text-white font-semibold rounded hover:bg-slate-800 flex items-center"
                >
                  <Save className="w-3.5 h-3.5 mr-1" />
                  {savingPlan ? 'Saving to Master DB...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Staff Profile Modal */}
      {editingStaff && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-300 shadow-2xl max-w-md w-full p-6 text-xs space-y-4 rounded-lg">
            <div className="flex justify-between items-center pb-2 border-b">
              <h3 className="font-bold text-base text-slate-900 flex items-center">
                <Edit2 className="w-4 h-4 mr-1.5 text-blue-600" />
                Edit Staff Profile: {editingStaff.fullName}
              </h3>
              <button onClick={() => setEditingStaff(null)} className="font-bold text-base text-slate-400">✕</button>
            </div>

            <form onSubmit={handleUpdateStaffProfile} className="space-y-3.5">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={editingStaff.fullName}
                  onChange={(e) => setEditingStaff({ ...editingStaff, fullName: e.target.value })}
                  className="w-full px-3 py-1.5 border border-slate-300 text-xs focus:outline-none focus:border-slate-800"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Administrator Email *</label>
                <input
                  type="email"
                  required
                  value={editingStaff.email}
                  onChange={(e) => setEditingStaff({ ...editingStaff, email: e.target.value })}
                  className="w-full px-3 py-1.5 border border-slate-300 text-xs focus:outline-none focus:border-slate-800"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Account Status</label>
                <select
                  value={editingStaff.isActive ? 'ACTIVE' : 'SUSPENDED'}
                  onChange={(e) => setEditingStaff({ ...editingStaff, isActive: e.target.value === 'ACTIVE' })}
                  className="w-full px-3 py-1.5 border border-slate-300 text-xs focus:outline-none focus:border-slate-800 bg-white"
                >
                  <option value="ACTIVE">ACTIVE (Authorized to Sign In)</option>
                  <option value="SUSPENDED">SUSPENDED (Access Locked)</option>
                </select>
              </div>

              <div className="pt-3 border-t flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setEditingStaff(null)}
                  className="px-4 py-1.5 border border-slate-300 text-slate-700 rounded hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingStaff}
                  className="px-4 py-1.5 bg-slate-900 text-white font-semibold rounded hover:bg-slate-800 flex items-center"
                >
                  <Save className="w-3.5 h-3.5 mr-1" />
                  {savingStaff ? 'Saving...' : 'Save Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Staff Password Modal */}
      {resettingStaffPassword && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-300 shadow-2xl max-w-md w-full p-6 text-xs space-y-4 rounded-lg">
            <div className="flex justify-between items-center pb-2 border-b">
              <h3 className="font-bold text-base text-slate-900 flex items-center">
                <Key className="w-4 h-4 mr-1.5 text-amber-600" />
                Reset Administrator Password
              </h3>
              <button onClick={() => setResettingStaffPassword(null)} className="font-bold text-base text-slate-400">✕</button>
            </div>

            <p className="text-slate-600">
              Set new master password for <span className="font-bold text-slate-900">{resettingStaffPassword.fullName}</span> (<span className="font-mono">{resettingStaffPassword.email}</span>).
              This will rehash with Argon2id and update the platform staff table in the master database.
            </p>

            <form onSubmit={handleResetStaffPassword} className="space-y-3.5">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">New Password *</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={staffNewPassword}
                  onChange={(e) => setStaffNewPassword(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 text-xs focus:outline-none focus:border-slate-800"
                  placeholder="Minimum 8 characters"
                />
              </div>

              <div className="pt-3 border-t flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setResettingStaffPassword(null)}
                  className="px-4 py-1.5 border border-slate-300 text-slate-700 rounded hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingStaff}
                  className="px-4 py-1.5 bg-slate-900 text-white font-semibold rounded hover:bg-slate-800"
                >
                  {savingStaff ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Platform Admin Modal */}
      {isCreatingStaff && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-300 shadow-2xl max-w-md w-full p-6 text-xs space-y-4 rounded-lg">
            <div className="flex justify-between items-center pb-2 border-b">
              <h3 className="font-bold text-base text-slate-900 flex items-center">
                <Users className="w-4 h-4 mr-1.5 text-slate-900" />
                Add New Platform Administrator
              </h3>
              <button onClick={() => setIsCreatingStaff(false)} className="font-bold text-base text-slate-400">✕</button>
            </div>

            <form onSubmit={handleCreateStaff} className="space-y-3.5">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Administrator Full Name *</label>
                <input
                  type="text"
                  required
                  value={newStaffFullName}
                  onChange={(e) => setNewStaffFullName(e.target.value)}
                  placeholder="e.g. Operations Manager"
                  className="w-full px-3 py-1.5 border border-slate-300 text-xs focus:outline-none focus:border-slate-800"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Corporate Email Address *</label>
                <input
                  type="email"
                  required
                  value={newStaffEmail}
                  onChange={(e) => setNewStaffEmail(e.target.value)}
                  placeholder="admin2@hr360.local"
                  className="w-full px-3 py-1.5 border border-slate-300 text-xs focus:outline-none focus:border-slate-800"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Initial Password *</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={newStaffPassword}
                  onChange={(e) => setNewStaffPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                  className="w-full px-3 py-1.5 border border-slate-300 text-xs focus:outline-none focus:border-slate-800"
                />
              </div>

              <div className="pt-3 border-t flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsCreatingStaff(false)}
                  className="px-4 py-1.5 border border-slate-300 text-slate-700 rounded hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingStaff}
                  className="px-4 py-1.5 bg-slate-900 text-white font-semibold rounded hover:bg-slate-800"
                >
                  {savingStaff ? 'Creating...' : 'Create Admin'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Approve Company & Provision Dedicated Cluster Modal */}
      {approvingRegistration && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-300 shadow-2xl max-w-lg w-full p-6 text-xs space-y-4 rounded-lg">
            <div className="flex justify-between items-center pb-2 border-b">
              <h3 className="font-bold text-base text-slate-900 flex items-center">
                <CheckCircle2 className="w-5 h-5 mr-2 text-emerald-600" />
                Approve & Provision Company Database
              </h3>
              <button
                onClick={() => setApprovingRegistration(null)}
                className="font-bold text-base text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded space-y-1">
              <div className="font-bold text-slate-800 text-sm">{approvingRegistration.companyName}</div>
              <div className="text-slate-600">Admin: <span className="font-mono">{approvingRegistration.adminEmail}</span> ({approvingRegistration.adminFullName})</div>
              <div className="text-slate-600">Plan: <span className="font-semibold">{approvingRegistration.selectedPlanTier || 'STARTER'}</span> ({approvingRegistration.selectedInterval || 'MONTHLY'})</div>
            </div>

            <form onSubmit={handleConfirmApprove} className="space-y-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">Storage Mode</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setApproveStorageMode('CLOUD_DEDICATED')}
                    className={`p-2.5 border text-left rounded transition-colors ${
                      approveStorageMode === 'CLOUD_DEDICATED'
                        ? 'border-slate-900 bg-slate-900 text-white'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="font-bold">Cloud Dedicated</div>
                    <div className="text-[10px] opacity-80 mt-0.5">Isolated Cloud Database</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setApproveStorageMode('LOCAL')}
                    className={`p-2.5 border text-left rounded transition-colors ${
                      approveStorageMode === 'LOCAL'
                        ? 'border-slate-900 bg-slate-900 text-white'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="font-bold">Local Encrypted</div>
                    <div className="text-[10px] opacity-80 mt-0.5">On-Premises Device Store</div>
                  </button>
                </div>
              </div>

              {approveStorageMode === 'CLOUD_DEDICATED' && (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="block font-semibold text-slate-700">
                      Dedicated Cluster Connection String *
                    </label>
                    <input
                      type="password"
                      required
                      value={approveConnectionString}
                      onChange={(e) => setApproveConnectionString(e.target.value)}
                      placeholder="mysql://user:pass@gateway.host:4000/company_db?ssl=true"
                      className="w-full px-3 py-2 border border-slate-300 font-mono text-xs rounded focus:outline-none focus:border-slate-900"
                    />
                    <p className="text-[11px] text-slate-500">
                      Admin enters the dedicated database connection string once. It is verified against SSRF, tested for TLS & DDL, envelope-encrypted with master KEK, and never logged or exposed.
                    </p>
                  </div>

                  {/* CA Verification Certificate (.pem) */}
                  <div className="space-y-1.5 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                    <div className="flex justify-between items-center">
                      <label className="block font-semibold text-slate-700">
                        TLS CA Server Certificate (Optional / .pem file)
                      </label>
                      {approveCaCertName && (
                        <span className="text-[10px] text-emerald-700 font-mono font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          {approveCaCertName}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Upload your cloud database server root CA certificate (<span className="font-mono">.pem</span>) if required for SSL verification.
                    </p>
                    <input
                      type="file"
                      accept=".pem,.crt"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setApproveCaCertName(file.name);
                          const reader = new FileReader();
                          reader.onload = (event) => {
                            setApproveCaCert(event.target?.result as string);
                          };
                          reader.readAsText(file);
                        }
                      }}
                      className="w-full text-xs text-slate-600 file:mr-3 file:py-1 file:px-2.5 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-slate-900 file:text-white hover:file:bg-slate-800 cursor-pointer"
                    />
                    {approveCaCert && (
                      <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1">
                        <span>Certificate loaded ({approveCaCert.length} chars)</span>
                        <button
                          type="button"
                          onClick={() => {
                            setApproveCaCert('');
                            setApproveCaCertName('');
                          }}
                          className="text-red-600 hover:underline"
                        >
                          Remove Certificate
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="pt-3 border-t flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setApprovingRegistration(null)}
                  disabled={isApproving}
                  className="px-4 py-1.5 border border-slate-300 text-slate-700 rounded hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isApproving}
                  className="px-5 py-1.5 bg-emerald-600 text-white font-semibold rounded hover:bg-emerald-700 disabled:opacity-50"
                >
                  {isApproving ? 'Verifying & Provisioning...' : 'Confirm & Provision Database'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Company Data Explorer Modal (Strict Read-Only & Governed Audit) */}
      {explorerCompany && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-300 shadow-2xl max-w-4xl w-full p-6 text-xs space-y-4 rounded-lg max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center pb-2 border-b">
              <div>
                <h3 className="font-bold text-base text-slate-900 flex items-center">
                  <Database className="w-5 h-5 mr-2 text-indigo-600" />
                  Company Data Explorer — {explorerCompany.name}
                </h3>
                <p className="text-[11px] text-slate-500">
                  Read-only governed support exploration. Every view is tamper-evidently recorded to the audit ledger.
                </p>
              </div>
              <button
                onClick={() => setExplorerCompany(null)}
                className="font-bold text-base text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            {/* Module Switcher Buttons */}
            <div className="flex space-x-2 border-b pb-2">
              {(['employees', 'attendance', 'payroll', 'leaves', 'certificates', 'audit'] as const).map((mod) => (
                <button
                  key={mod}
                  onClick={() => {
                    setExplorerModule(mod);
                    loadExplorerData(explorerCompany, mod);
                  }}
                  className={`px-3 py-1.5 rounded font-semibold text-xs capitalize ${
                    explorerModule === mod
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {mod}
                </button>
              ))}
            </div>

            {/* Data Content View */}
            <div className="flex-1 overflow-y-auto border border-slate-200 rounded p-3 bg-slate-50 min-h-[300px]">
              {isExplorerLoading ? (
                <div className="flex items-center justify-center h-48 text-slate-400">
                  Loading {explorerModule} from dedicated storage...
                </div>
              ) : explorerData.length === 0 ? (
                <div className="flex items-center justify-center h-48 text-slate-400">
                  No records found in this company's {explorerModule} ledger.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-[11px]">
                    <thead className="bg-slate-200 text-slate-800 font-semibold">
                      <tr>
                        {Object.keys(explorerData[0] || {}).map((k) => (
                          <th key={k} className="p-2 border-b border-slate-300 capitalize">{k}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                      {explorerData.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          {Object.values(row).map((val: any, vIdx) => (
                            <td key={vIdx} className="p-2 font-mono text-[10px] text-slate-700">
                              {typeof val === 'object' && val !== null ? JSON.stringify(val) : String(val ?? '')}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-between items-center text-[11px] text-slate-500">
              <span className="flex items-center">
                <Lock className="w-3.5 h-3.5 mr-1 text-slate-400" />
                Read-Only Session Active | Direct mutations prohibited by policy
              </span>
              <button
                onClick={() => setExplorerCompany(null)}
                className="px-4 py-1.5 bg-slate-900 text-white font-medium rounded hover:bg-slate-800"
              >
                Close Explorer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
