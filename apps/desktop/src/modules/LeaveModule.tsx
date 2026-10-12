import React, { useState } from 'react';
import {
  Calendar,
  CheckCircle2,
  XCircle,
  Plus,
  Filter,
  AlertCircle
} from 'lucide-react';
import { LeaveRequest, Employee } from '../types/hr-types';

interface Props {
  leaves: LeaveRequest[];
  setLeaves: React.Dispatch<React.SetStateAction<LeaveRequest[]>>;
  employees: Employee[];
  onAudit: (action: string, details: string) => void;
}

export const LeaveModule: React.FC<Props> = ({ leaves, setLeaves, employees, onAudit }) => {
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [notification, setNotification] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Form states
  const [selectedEmpId, setSelectedEmpId] = useState(employees[0]?.id || '');
  const [leaveType, setLeaveType] = useState<'SICK' | 'CASUAL' | 'ANNUAL' | 'UNPAID' | 'MATERNITY'>('CASUAL');
  const [startDate, setStartDate] = useState('2026-10-15');
  const [endDate, setEndDate] = useState('2026-10-16');
  const [reason, setReason] = useState('');

  const showNotice = (text: string, type: 'success' | 'error' = 'success') => {
    setNotification({ text, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleApplyLeave = (e: React.FormEvent) => {
    e.preventDefault();
    const emp = employees.find((x) => x.id === selectedEmpId);
    if (!emp) return;

    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const daysCount = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    const newRequest: LeaveRequest = {
      id: `lr-${Date.now()}`,
      employeeId: emp.id,
      employeeName: `${emp.firstName} ${emp.lastName}`,
      employeeCode: emp.employeeCode,
      leaveType,
      startDate,
      endDate,
      daysCount,
      reason,
      status: 'PENDING',
      currentApproverStep: 'HR_MANAGER',
      submittedAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
    };

    setLeaves((prev) => [newRequest, ...prev]);
    onAudit('SUBMIT_LEAVE_REQUEST', `Submitted ${leaveType} leave (${daysCount} days) for ${emp.employeeCode}: ${emp.firstName} ${emp.lastName}`);
    showNotice(`Leave request for ${emp.firstName} submitted for approval.`);
    setShowApplyModal(false);
    setReason('');
  };

  const handleApprove = (id: string, empName: string, days: number, type: string) => {
    setLeaves((prev) =>
      prev.map((l) =>
        l.id === id
          ? {
              ...l,
              status: 'APPROVED',
              reviewedBy: 'Authorized HR Manager',
              reviewComment: 'Approved via workflow manager.',
            }
          : l
      )
    );
    onAudit('APPROVE_LEAVE', `Approved ${days} days ${type} leave for ${empName}`);
    showNotice(`Leave request for ${empName} approved and balance deducted.`);
  };

  const handleReject = (id: string, empName: string) => {
    setLeaves((prev) =>
      prev.map((l) =>
        l.id === id
          ? {
              ...l,
              status: 'REJECTED',
              reviewedBy: 'Authorized HR Manager',
              reviewComment: 'Insufficient leave quota or conflicting schedule.',
            }
          : l
      )
    );
    onAudit('REJECT_LEAVE', `Rejected leave request for ${empName}`);
    showNotice(`Leave request for ${empName} marked as rejected.`, 'error');
  };

  const filteredLeaves = leaves.filter((l) => {
    return statusFilter === 'ALL' || l.status === statusFilter;
  });

  return (
    <div className="space-y-4">
      {notification && (
        <div
          className={`p-3 text-xs flex items-center justify-between border ${
            notification.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
              : 'bg-red-50 text-red-800 border-red-300'
          }`}
        >
          <div className="flex items-center space-x-2">
            {notification.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-red-600" />}
            <span>{notification.text}</span>
          </div>
          <button onClick={() => setNotification(null)} className="font-bold">✕</button>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center pb-3 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center">
            <Calendar className="w-5 h-5 mr-2 text-slate-800" />
            Leave Management & Multi-Level Approvals
          </h1>
          <p className="text-xs text-slate-500">
            Pakistan Statutory Policies: 14 Annual / 10 Casual / 10 Sick | Quota recalculation on approval
          </p>
        </div>
        <button
          onClick={() => setShowApplyModal(true)}
          className="px-3 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded hover:bg-slate-800 flex items-center"
        >
          <Plus className="w-3.5 h-3.5 mr-1.5" />
          Submit Leave Request
        </button>
      </div>

      {/* Quota Summary Cards */}
      <div className="grid grid-cols-4 gap-3 text-xs">
        <div className="bg-white p-3 border border-slate-200 shadow-sm">
          <div className="text-slate-500">Annual Paid Leaves</div>
          <div className="text-lg font-bold text-slate-900">14 Days / Year</div>
          <div className="text-[11px] text-emerald-600 font-medium">Max carry-over: 7 days</div>
        </div>
        <div className="bg-white p-3 border border-slate-200 shadow-sm">
          <div className="text-slate-500">Casual Leaves</div>
          <div className="text-lg font-bold text-slate-900">10 Days / Year</div>
          <div className="text-[11px] text-slate-500">Non-cumulative</div>
        </div>
        <div className="bg-white p-3 border border-slate-200 shadow-sm">
          <div className="text-slate-500">Medical / Sick Leaves</div>
          <div className="text-lg font-bold text-slate-900">10 Days / Year</div>
          <div className="text-[11px] text-slate-500">Medical certificate after 2 days</div>
        </div>
        <div className="bg-white p-3 border border-slate-200 shadow-sm">
          <div className="text-slate-500">Pending Approvals</div>
          <div className="text-lg font-bold text-amber-600 font-mono">
            {leaves.filter((l) => l.status === 'PENDING').length} Requests
          </div>
          <div className="text-[11px] text-slate-500">Requires HR Manager sign-off</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center space-x-2 bg-white p-3 border border-slate-200 text-xs shadow-sm">
        <Filter className="w-3.5 h-3.5 text-slate-400" />
        <span className="font-semibold text-slate-700">Filter By Status:</span>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-slate-300 px-2 py-1 text-xs bg-white focus:outline-none"
        >
          <option value="ALL">ALL REQUESTS</option>
          <option value="PENDING">PENDING</option>
          <option value="APPROVED">APPROVED</option>
          <option value="REJECTED">REJECTED</option>
        </select>
      </div>

      {/* Requests Table */}
      <div className="bg-white border border-slate-200 shadow-sm overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 font-semibold">
            <tr>
              <th className="p-3">Ref ID</th>
              <th className="p-3">Employee</th>
              <th className="p-3">Type</th>
              <th className="p-3">Duration</th>
              <th className="p-3">Days</th>
              <th className="p-3">Reason</th>
              <th className="p-3">Status</th>
              <th className="p-3">Reviewer Details</th>
              <th className="p-3 text-right">Approval Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredLeaves.map((req) => (
              <tr key={req.id} className="hover:bg-slate-50">
                <td className="p-3 font-mono font-semibold text-slate-900">{req.id}</td>
                <td className="p-3">
                  <div className="font-medium text-slate-900">{req.employeeName}</div>
                  <div className="text-[11px] font-mono text-slate-500">{req.employeeCode}</div>
                </td>
                <td className="p-3 font-semibold text-slate-700">{req.leaveType}</td>
                <td className="p-3 font-mono text-slate-600">
                  {req.startDate} → {req.endDate}
                </td>
                <td className="p-3 font-bold text-slate-900 font-mono">{req.daysCount}d</td>
                <td className="p-3 text-slate-600 max-w-[220px] truncate" title={req.reason}>
                  {req.reason}
                </td>
                <td className="p-3">
                  <span
                    className={`px-2 py-0.5 font-semibold text-[10px] ${
                      req.status === 'APPROVED'
                        ? 'bg-emerald-100 text-emerald-800'
                        : req.status === 'PENDING'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {req.status}
                  </span>
                </td>
                <td className="p-3 text-slate-500 text-[11px]">
                  {req.reviewedBy ? (
                    <div>
                      <div className="font-medium text-slate-700">{req.reviewedBy}</div>
                      <div className="italic text-[10px]">{req.reviewComment}</div>
                    </div>
                  ) : (
                    <span className="text-slate-400">Awaiting HR Review</span>
                  )}
                </td>
                <td className="p-3 text-right space-x-1">
                  {req.status === 'PENDING' ? (
                    <>
                      <button
                        onClick={() => handleApprove(req.id, req.employeeName, req.daysCount, req.leaveType)}
                        className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] inline-flex items-center"
                      >
                        <CheckCircle2 className="w-3 h-3 mr-1" /> Approve
                      </button>
                      <button
                        onClick={() => handleReject(req.id, req.employeeName)}
                        className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-[11px] inline-flex items-center"
                      >
                        <XCircle className="w-3 h-3 mr-1" /> Reject
                      </button>
                    </>
                  ) : (
                    <span className="text-slate-400 text-[11px] font-mono">Completed</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Apply Leave Modal */}
      {showApplyModal && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-300 shadow-2xl max-w-md w-full p-6 text-xs">
            <div className="flex justify-between items-center pb-3 border-b border-slate-200">
              <h3 className="font-bold text-base text-slate-900">Submit Employee Leave Request</h3>
              <button onClick={() => setShowApplyModal(false)} className="text-slate-400 font-bold">✕</button>
            </div>
            <form onSubmit={handleApplyLeave} className="space-y-3 pt-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Employee *</label>
                <select
                  value={selectedEmpId}
                  onChange={(e) => setSelectedEmpId(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 bg-white"
                >
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.employeeCode}: {e.firstName} {e.lastName} ({e.department})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Leave Policy Category *</label>
                <select
                  value={leaveType}
                  onChange={(e) => setLeaveType(e.target.value as any)}
                  className="w-full px-3 py-1.5 border border-slate-300 bg-white"
                >
                  <option value="CASUAL">Casual Leave (10 Days/Year)</option>
                  <option value="ANNUAL">Annual / Earned Leave (14 Days/Year)</option>
                  <option value="SICK">Medical / Sick Leave (10 Days/Year)</option>
                  <option value="UNPAID">Unpaid Leave (LOP)</option>
                  <option value="MATERNITY">Maternity / Paternity Leave</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Start Date *</label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">End Date *</label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Reason & Justification *</label>
                <textarea
                  required
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300"
                  placeholder="State the purpose for taking leave..."
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowApplyModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-900 text-white rounded font-semibold hover:bg-slate-800"
                >
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
