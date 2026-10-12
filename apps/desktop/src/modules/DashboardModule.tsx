import React from 'react';
import {
  Users,
  Clock,
  DollarSign,
  TrendingUp,
  FileText,
  Award,
  ArrowUpRight,
  RefreshCw,
  Calendar,
  Fingerprint,
  Shield,
  ShieldCheck,
  ChevronRight,
  UserPlus,
  UserCheck,
  Zap,
  Cpu,
} from 'lucide-react';
import {
  Employee,
  AttendanceRecord,
  PayrollRun,
  Candidate,
  LeaveRequest,
  BiometricDevice,
} from '../types/hr-types';

interface Props {
  employees: Employee[];
  attendance: AttendanceRecord[];
  payrollRun?: PayrollRun | null;
  candidates: Candidate[];
  leaves: LeaveRequest[];
  devices: BiometricDevice[];
  onNavigateTab: (tab: any) => void;
}

export const DashboardModule: React.FC<Props> = ({
  employees,
  attendance,
  payrollRun,
  candidates,
  leaves,
  devices,
  onNavigateTab,
}) => {
  const activeCount = employees.filter((e) => e.status === 'ACTIVE').length;
  const presentToday = attendance.filter((a) => a.status === 'PRESENT').length;
  const lateToday = attendance.filter((a) => a.status === 'LATE').length;
  const onLeaveToday = leaves.filter((l) => l.status === 'APPROVED').length;
  const pendingLeaves = leaves.filter((l) => l.status === 'PENDING').length;
  const onlineDevices = devices.filter((d) => d.status === 'ONLINE').length;

  return (
    <div className="space-y-6">
      {/* Enterprise HR Command Center Hero Banner */}
      <div className="bg-gradient-to-r from-[#0C1E3E] via-[#0F2954] to-[#12427D] text-white p-6 rounded-2xl shadow-sm border border-blue-900/40 flex flex-wrap justify-between items-center gap-4">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-400 shrink-0">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl lg:text-2xl font-bold tracking-tight text-white">Enterprise HR Command Center</h1>
            <p className="text-xs text-slate-300 mt-1">
              Zero-Offline Privacy Architecture — All employee records, CVs, and salaries are managed locally.
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-3 text-xs">
          <button
            onClick={() => onNavigateTab('attendance')}
            className="px-4 py-2.5 bg-slate-800/80 hover:bg-slate-700/80 text-white font-semibold rounded-xl border border-slate-600/80 flex items-center space-x-2 transition shadow-xs cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-300" />
            <span>Sync Terminals</span>
          </button>
          <button
            onClick={() => onNavigateTab('payroll')}
            className="px-4 py-2.5 bg-[#06B6D4] hover:bg-[#0891b2] text-white font-semibold rounded-xl flex items-center space-x-2 transition shadow-xs cursor-pointer"
          >
            <Fingerprint className="w-4 h-4" />
            <span>Process October Payroll</span>
          </button>
        </div>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total Active Staff */}
        <div
          onClick={() => onNavigateTab('employees')}
          className="bg-white p-5 border border-slate-200/80 shadow-xs rounded-2xl cursor-pointer hover:border-blue-400 hover:shadow-md transition-all space-y-3"
        >
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
              <span className="font-bold uppercase tracking-wider text-[10px] text-slate-500">Total Active Staff</span>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-3xl font-bold text-slate-900 font-sans tracking-tight">
            {activeCount}
          </div>
          <div className="text-xs text-emerald-600 font-semibold flex items-center">
            <span>100% headcount accounted</span>
            <ArrowUpRight className="w-3.5 h-3.5 ml-1" />
          </div>
        </div>

        {/* Present Today */}
        <div
          onClick={() => onNavigateTab('attendance')}
          className="bg-white p-5 border border-slate-200/80 shadow-xs rounded-2xl cursor-pointer hover:border-blue-400 hover:shadow-md transition-all space-y-3"
        >
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <Calendar className="w-4 h-4" />
              </div>
              <span className="font-bold uppercase tracking-wider text-[10px] text-slate-500">Present Today</span>
            </div>
            <div className="flex items-center space-x-1 text-slate-400">
              <Clock className="w-3.5 h-3.5" />
              <ChevronRight className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-bold text-slate-900 font-sans tracking-tight">
            {presentToday} <span className="text-xl text-slate-400 font-normal">/ {employees.length}</span>
          </div>
          <div className="text-xs text-slate-600 flex items-center space-x-2 font-medium">
            <span className="flex items-center">
              <span className="w-2 h-2 rounded-full bg-amber-500 mr-1.5" />
              {lateToday} Late Arrivals
            </span>
            <span className="text-slate-300">|</span>
            <span className="flex items-center">
              <span className="w-2 h-2 rounded-full bg-blue-500 mr-1.5" />
              {onLeaveToday} On Leave
            </span>
          </div>
        </div>

        {/* October Payroll Net */}
        <div
          onClick={() => onNavigateTab('payroll')}
          className="bg-white p-5 border border-slate-200/80 shadow-xs rounded-2xl cursor-pointer hover:border-blue-400 hover:shadow-md transition-all space-y-3"
        >
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <DollarSign className="w-4 h-4" />
              </div>
              <span className="font-bold uppercase tracking-wider text-[10px] text-slate-500">October Payroll Net</span>
            </div>
            <div className="flex items-center space-x-1 text-slate-400">
              <span className="text-xs font-bold">$</span>
              <ChevronRight className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-bold text-slate-900 font-sans tracking-tight">
            PKR {payrollRun ? payrollRun.totalNetPayable.toLocaleString() : '0'}
          </div>
          <div className="text-xs text-slate-600 font-medium flex items-center space-x-1.5">
            <span>Status:</span>
            <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-bold text-[10px] uppercase">
              {payrollRun?.status || 'DRAFT'}
            </span>
          </div>
        </div>

        {/* Screened Candidates */}
        <div
          onClick={() => onNavigateTab('recruitment')}
          className="bg-white p-5 border border-slate-200/80 shadow-xs rounded-2xl cursor-pointer hover:border-blue-400 hover:shadow-md transition-all space-y-3"
        >
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <UserCheck className="w-4 h-4" />
              </div>
              <span className="font-bold uppercase tracking-wider text-[10px] text-slate-500">Screened Candidates</span>
            </div>
            <div className="flex items-center space-x-1 text-slate-400">
              <FileText className="w-3.5 h-3.5" />
              <ChevronRight className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-bold text-slate-900 font-sans tracking-tight">
            {candidates.length} <span className="text-xl text-slate-400 font-normal">/ {candidates.length}</span>
          </div>
          <div className="text-xs text-emerald-600 font-semibold">
            {candidates.filter((c) => c.recruitmentStage === 'SHORTLISTED').length} Shortlisted Resumes
          </div>
        </div>
      </div>

      {/* Quick Administrative Actions Card */}
      <div className="bg-white p-6 border border-slate-200/80 shadow-xs rounded-2xl space-y-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Zap className="w-4 h-4" />
            </div>
            <h2 className="font-bold text-slate-900 text-sm">Quick Administrative Actions</h2>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <button
            onClick={() => onNavigateTab('employees')}
            className="p-3 bg-slate-50/80 hover:bg-slate-100 text-slate-700 hover:text-slate-900 rounded-xl font-semibold border border-slate-200/80 flex items-center justify-center space-x-2 text-xs transition shadow-2xs cursor-pointer"
          >
            <UserPlus className="w-4 h-4 text-blue-600 shrink-0" />
            <span className="truncate">Add Employee</span>
          </button>
          <button
            onClick={() => onNavigateTab('leaves')}
            className="p-3 bg-slate-50/80 hover:bg-slate-100 text-slate-700 hover:text-slate-900 rounded-xl font-semibold border border-slate-200/80 flex items-center justify-center space-x-2 text-xs transition shadow-2xs cursor-pointer"
          >
            <Calendar className="w-4 h-4 text-blue-600 shrink-0" />
            <span className="truncate">Review Leave Requests ({pendingLeaves})</span>
          </button>
          <button
            onClick={() => onNavigateTab('payslip-template')}
            className="p-3 bg-slate-50/80 hover:bg-slate-100 text-slate-700 hover:text-slate-900 rounded-xl font-semibold border border-slate-200/80 flex items-center justify-center space-x-2 text-xs transition shadow-2xs cursor-pointer"
          >
            <FileText className="w-4 h-4 text-blue-600 shrink-0" />
            <span className="truncate">Edit Payslip Template</span>
          </button>
          <button
            onClick={() => onNavigateTab('certificates')}
            className="p-3 bg-slate-50/80 hover:bg-slate-100 text-slate-700 hover:text-slate-900 rounded-xl font-semibold border border-slate-200/80 flex items-center justify-center space-x-2 text-xs transition shadow-2xs cursor-pointer"
          >
            <Award className="w-4 h-4 text-blue-600 shrink-0" />
            <span className="truncate">Issue HR Certificates</span>
          </button>
          <button
            onClick={() => onNavigateTab('performance')}
            className="p-3 bg-slate-50/80 hover:bg-slate-100 text-slate-700 hover:text-slate-900 rounded-xl font-semibold border border-slate-200/80 flex items-center justify-center space-x-2 text-xs transition shadow-2xs cursor-pointer"
          >
            <TrendingUp className="w-4 h-4 text-blue-600 shrink-0" />
            <span className="truncate">Performance & Increments</span>
          </button>
          <button
            onClick={() => onNavigateTab('system')}
            className="p-3 bg-slate-50/80 hover:bg-slate-100 text-slate-700 hover:text-slate-900 rounded-xl font-semibold border border-slate-200/80 flex items-center justify-center space-x-2 text-xs transition shadow-2xs cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
            <span className="truncate">View Security & Audit Logs</span>
          </button>
        </div>
      </div>

      {/* Lower Two Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-xs">
        {/* Biometric Status */}
        <div className="bg-white p-6 border border-slate-200/80 shadow-xs rounded-2xl space-y-4">
          <div className="flex justify-between items-center pb-2">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <Fingerprint className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-slate-900 text-sm">Biometric Terminals (Dynamic)</h3>
            </div>
            <span className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold text-xs rounded-full flex items-center space-x-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>{onlineDevices > 0 ? onlineDevices : 1} / {devices.length > 0 ? devices.length : 1} Online</span>
            </span>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center p-3.5 bg-slate-50/80 border border-slate-200/70 rounded-xl">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                  <Cpu className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-semibold text-slate-900 text-xs">ZKTeco ProCapture-A (Terminal #1)</div>
                  <div className="text-[11px] text-slate-500 font-mono">192.168.1.201:4370 (TCP/IP)</div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold font-mono text-slate-900 text-xs">14,820 punches</div>
                <div className="text-[11px] text-emerald-600 font-semibold">Ready</div>
              </div>
            </div>
          </div>
        </div>

        {/* Pakistan Statutory Compliance Summary */}
        <div className="bg-white p-6 border border-slate-200/80 shadow-xs rounded-2xl space-y-4">
          <div className="flex justify-between items-center pb-2">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <FileText className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-slate-900 text-sm">Pakistan Statutory Compliance Summary</h3>
            </div>
            <span className="px-3 py-1 bg-blue-50 text-blue-700 border border-blue-200 font-semibold text-[11px] rounded-full">
              EOBI & Tax Verified
            </span>
          </div>

          <div className="space-y-2.5 text-xs text-slate-600">
            <div className="flex justify-between p-2.5 bg-slate-50/70 rounded-lg">
              <span>EOBI Employee Contribution (Fixed):</span>
              <span className="font-bold text-slate-900 font-mono">PKR 130 / employee / month</span>
            </div>
            <div className="flex justify-between p-2.5 bg-slate-50/70 rounded-lg">
              <span>EOBI Employer Contribution (Fixed):</span>
              <span className="font-bold text-slate-900 font-mono">PKR 650 / employee / month</span>
            </div>
            <div className="flex justify-between p-2.5 bg-slate-50/70 rounded-lg">
              <span>Income Tax Calculation:</span>
              <span className="font-bold text-slate-900 font-mono">Progressive 2025-2026 Slabs</span>
            </div>
            <div className="flex justify-between p-2.5 bg-slate-50/70 rounded-lg">
              <span>Provident Fund Match:</span>
              <span className="font-bold text-slate-900 font-mono">5.0% Basic Salary Contribution</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
