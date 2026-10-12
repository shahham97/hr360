import React, { useState } from 'react';
import {
  TrendingUp,
  CheckCircle2
} from 'lucide-react';
import { AppraisalCycle, AppraisalRecord, Employee, BenefitPlan } from '../types/hr-types';

interface Props {
  cycles: AppraisalCycle[];
  setCycles: React.Dispatch<React.SetStateAction<AppraisalCycle[]>>;
  records: AppraisalRecord[];
  setRecords: React.Dispatch<React.SetStateAction<AppraisalRecord[]>>;
  benefits: BenefitPlan[];
  setBenefits: React.Dispatch<React.SetStateAction<BenefitPlan[]>>;
  employees: Employee[];
  setEmployees: React.Dispatch<React.SetStateAction<Employee[]>>;
  onAudit: (action: string, details: string) => void;
}

export const PerformanceAndBenefitsModule: React.FC<Props> = ({
  records,
  setRecords,
  benefits,
  employees,
  setEmployees,
  onAudit,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'APPRAISALS' | 'BENEFITS'>('APPRAISALS');
  const [notification, setNotification] = useState<string | null>(null);

  const showNotice = (text: string) => {
    setNotification(text);
    setTimeout(() => setNotification(null), 4000);
  };

  const handleApplyIncrement = (record: AppraisalRecord) => {
    const emp = employees.find((e) => e.id === record.employeeId);
    if (!emp) return;

    const incrementAmount = Math.round((emp.baseSalary * record.proposedIncrementPercent) / 100);
    const newSalary = emp.baseSalary + incrementAmount;

    setEmployees((prev) =>
      prev.map((e) => (e.id === emp.id ? { ...e, baseSalary: newSalary } : e))
    );

    setRecords((prev) =>
      prev.map((r) => (r.id === record.id ? { ...r, status: 'APPROVED' } : r))
    );

    onAudit(
      'APPLY_PERFORMANCE_INCREMENT',
      `Applied ${record.proposedIncrementPercent}% increment to ${emp.employeeCode} (${emp.firstName} ${emp.lastName}). Previous: PKR ${emp.baseSalary.toLocaleString()}, Revised: PKR ${newSalary.toLocaleString()}`
    );
    showNotice(`Applied ${record.proposedIncrementPercent}% annual increment to ${emp.firstName}'s live base salary.`);
  };

  return (
    <div className="space-y-4">
      {notification && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{notification}</span>
          </div>
          <button onClick={() => setNotification(null)} className="font-bold">✕</button>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center pb-3 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center">
            <TrendingUp className="w-5 h-5 mr-2 text-slate-800" />
            Performance Appraisals, Increments & Benefits (Sections 10 & 11)
          </h1>
          <p className="text-xs text-slate-500">
            Performance scoring matrix, automated salary increments, and company benefits management
          </p>
        </div>

        <div className="flex space-x-1 bg-slate-200 p-0.5 rounded">
          <button
            onClick={() => setActiveSubTab('APPRAISALS')}
            className={`px-3 py-1 text-xs font-semibold rounded ${
              activeSubTab === 'APPRAISALS' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
            }`}
          >
            Appraisals & Increments
          </button>
          <button
            onClick={() => setActiveSubTab('BENEFITS')}
            className={`px-3 py-1 text-xs font-semibold rounded ${
              activeSubTab === 'BENEFITS' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
            }`}
          >
            Benefits Enrollment
          </button>
        </div>
      </div>

      {activeSubTab === 'APPRAISALS' ? (
        <div className="space-y-4">
          {/* Active Cycle KPI Bar */}
          <div className="grid grid-cols-4 gap-3 text-xs">
            <div className="bg-white p-3 border border-slate-200 shadow-sm">
              <div className="text-slate-500">Active Appraisal Cycle</div>
              <div className="font-bold text-slate-900 text-sm">FY 2026 Annual Review</div>
              <div className="text-[11px] text-emerald-600 font-medium">Cycle Status: Active</div>
            </div>
            <div className="bg-white p-3 border border-slate-200 shadow-sm">
              <div className="text-slate-500">Reviews Completed</div>
              <div className="font-bold text-slate-900 text-lg font-mono">
                {records.filter((r) => r.status === 'APPROVED' || r.status === 'SUBMITTED').length} / {employees.length}
              </div>
              <div className="text-[11px] text-slate-500">75% department reviews logged</div>
            </div>
            <div className="bg-white p-3 border border-slate-200 shadow-sm">
              <div className="text-slate-500">Average Increment</div>
              <div className="font-bold text-emerald-700 text-lg font-mono">14.8%</div>
              <div className="text-[11px] text-slate-500">Based on merit rating</div>
            </div>
            <div className="bg-white p-3 border border-slate-200 shadow-sm">
              <div className="text-slate-500">Approved Bonuses</div>
              <div className="font-bold text-slate-900 text-lg font-mono">PKR 310,000</div>
              <div className="text-[11px] text-slate-500">Payable in October payroll</div>
            </div>
          </div>

          {/* Appraisal Records Table */}
          <div className="bg-white border border-slate-200 shadow-sm overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 font-semibold">
                <tr>
                  <th className="p-3">Employee</th>
                  <th className="p-3">Department</th>
                  <th className="p-3">Rating (1-5)</th>
                  <th className="p-3">Performance Band</th>
                  <th className="p-3">Proposed Increment</th>
                  <th className="p-3">Proposed Bonus</th>
                  <th className="p-3">Reviewer Justification</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {records.map((rec) => (
                  <tr key={rec.id} className="hover:bg-slate-50">
                    <td className="p-3 font-medium text-slate-900">{rec.employeeName}</td>
                    <td className="p-3 text-slate-600">{rec.department}</td>
                    <td className="p-3 font-bold font-mono text-slate-900">{rec.rating}.0 / 5.0</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-[10px] font-semibold">
                        {rec.performanceBand}
                      </span>
                    </td>
                    <td className="p-3 font-mono font-bold text-emerald-700 text-xs">
                      +{rec.proposedIncrementPercent}%
                    </td>
                    <td className="p-3 font-mono text-slate-800">
                      PKR {rec.proposedBonus.toLocaleString()}
                    </td>
                    <td className="p-3 text-slate-500 max-w-[200px] truncate" title={rec.reviewerNotes}>
                      {rec.reviewerNotes}
                    </td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 text-[10px] font-semibold ${
                          rec.status === 'APPROVED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {rec.status}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      {rec.status !== 'APPROVED' ? (
                        <button
                          onClick={() => handleApplyIncrement(rec)}
                          className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded text-[11px] font-medium"
                        >
                          Apply to Base Salary
                        </button>
                      ) : (
                        <span className="text-emerald-700 font-bold text-[11px]">Applied ✓</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Benefits Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {benefits.map((bp) => (
              <div key={bp.id} className="bg-white p-4 border border-slate-200 shadow-sm text-xs space-y-3">
                <div className="flex justify-between items-start">
                  <div className="font-bold text-slate-900 text-sm">{bp.name}</div>
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                    ACTIVE PLAN
                  </span>
                </div>
                <div className="space-y-1 text-slate-600">
                  <div>Type: <span className="font-medium text-slate-800">{bp.type}</span></div>
                  <div>Coverage Limit: <span className="font-bold font-mono text-slate-900">PKR {bp.coverageAmount.toLocaleString()}</span></div>
                  <div>Employer Contribution: <span className="font-mono text-slate-800">PKR {bp.employerContribution.toLocaleString()}/mo</span></div>
                  <div>Enrolled Employees: <span className="font-bold text-emerald-700">{bp.enrolledCount} Staff</span></div>
                </div>
                <div className="pt-2 border-t border-slate-100">
                  <button
                    onClick={() => showNotice(`Enrolled eligible staff into plan: ${bp.name}`)}
                    className="w-full py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-center text-xs font-semibold"
                  >
                    Manage Employee Enrollment
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
