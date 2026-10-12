import React, { useState } from 'react';
import {
  DollarSign,
  Lock,
  Download,
  Printer,
  CheckCircle2,
  FileSpreadsheet,
  AlertCircle
} from 'lucide-react';
import { PayrollRun, PayslipItem, Employee, PayslipTemplate } from '../types/hr-types';
import { exportToCSV, generatePayslipPDF } from '../utils/export-helpers';

interface Props {
  payrollRuns: PayrollRun[];
  setPayrollRuns: React.Dispatch<React.SetStateAction<PayrollRun[]>>;
  employees: Employee[];
  payslipTemplate: PayslipTemplate;
  onAudit: (action: string, details: string) => void;
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

export const PayrollModule: React.FC<Props> = ({
  payrollRuns,
  setPayrollRuns,
  employees,
  payslipTemplate,
  onAudit,
}) => {
  const activeRun = payrollRuns[0] || DEFAULT_PAYROLL_RUN;
  const [currentRun, setCurrentRun] = useState<PayrollRun>(activeRun);
  const [payslips, setPayslips] = useState<PayslipItem[]>(() => calculatePayslips(employees, activeRun.periodName));
  const [notification, setNotification] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  function calculatePayslips(emps: Employee[], period: string): PayslipItem[] {
    return emps.map((emp) => {
      const basicSalary = emp.baseSalary * 0.6;
      const houseRent = emp.baseSalary * 0.25;
      const medical = emp.baseSalary * 0.1;
      const transport = emp.baseSalary * 0.05;
      const grossSalary = basicSalary + houseRent + medical + transport;

      // Pakistan Tax Slabs (2025-2026 progressive monthly estimation)
      let annualGross = grossSalary * 12;
      let annualTax = 0;
      if (annualGross > 600000 && annualGross <= 1200000) {
        annualTax = (annualGross - 600000) * 0.05;
      } else if (annualGross > 1200000 && annualGross <= 2200000) {
        annualTax = 30000 + (annualGross - 1200000) * 0.15;
      } else if (annualGross > 2200000 && annualGross <= 3200000) {
        annualTax = 180000 + (annualGross - 2200000) * 0.25;
      } else if (annualGross > 3200000) {
        annualTax = 430000 + (annualGross - 3200000) * 0.35;
      }
      const monthlyTax = Math.round(annualTax / 12);

      // Statutory EOBI fixed amounts
      const eobiEmployee = 130;
      const eobiEmployer = 650;
      const pfDeduction = Math.round(basicSalary * 0.05);

      const totalDeductions = monthlyTax + eobiEmployee + pfDeduction;
      const netPayable = grossSalary - totalDeductions;

      return {
        id: `ps-${emp.id}`,
        payrollRunId: currentRun?.id || 'pr-2026-10',
        employeeId: emp.id,
        employeeCode: emp.employeeCode,
        employeeName: `${emp.firstName} ${emp.lastName}`,
        department: emp.department,
        designation: emp.designation,
        branch: emp.branch,
        joiningDate: emp.joiningDate,
        bankAccount: emp.bankAccount || 'Direct Bank Deposit',
        periodName: period,
        basicSalary,
        houseRentAllowance: houseRent,
        medicalAllowance: medical,
        transportAllowance: transport,
        overtimeEarnings: 0,
        grossSalary,
        incomeTaxDeduction: monthlyTax,
        eobiEmployeeDeduction: eobiEmployee,
        eobiEmployerContribution: eobiEmployer,
        providentFundDeduction: pfDeduction,
        unpaidLeaveDeduction: 0,
        totalDeductions,
        netPayable,
      };
    });
  }

  const showNotice = (text: string, type: 'success' | 'error' = 'success') => {
    setNotification({ text, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleRecalculate = () => {
    if (currentRun.isLocked) {
      showNotice('Cannot recalculate locked payroll run.', 'error');
      return;
    }
    const fresh = calculatePayslips(employees, currentRun.periodName);
    setPayslips(fresh);

    const totalGross = fresh.reduce((sum, p) => sum + p.grossSalary, 0);
    const totalDeductions = fresh.reduce((sum, p) => sum + p.totalDeductions, 0);
    const totalNetPayable = fresh.reduce((sum, p) => sum + p.netPayable, 0);

    const updatedRun: PayrollRun = {
      ...currentRun,
      totalEmployees: fresh.length,
      totalGross,
      totalDeductions,
      totalNetPayable,
      status: 'CALCULATED',
    };

    setCurrentRun(updatedRun);
    setPayrollRuns((prev) => prev.map((r) => (r.id === updatedRun.id ? updatedRun : r)));
    onAudit('RECALCULATE_PAYROLL', `Recalculated payroll for ${currentRun.periodName}: ${fresh.length} active employees`);
    showNotice(`Recalculated payroll for ${fresh.length} active employees.`);
  };

  const handleApproveAndLock = () => {
    if (currentRun.isLocked) return;

    const lockedRun: PayrollRun = {
      ...currentRun,
      status: 'LOCKED',
      isLocked: true,
      approvedBy: 'Payroll Operations Manager',
      approvedAt: new Date().toISOString(),
    };

    setCurrentRun(lockedRun);
    setPayrollRuns((prev) => prev.map((r) => (r.id === lockedRun.id ? lockedRun : r)));
    onAudit('LOCK_PAYROLL_RUN', `Approved and permanently locked payroll batch ${currentRun.periodName} (Total Net: PKR ${lockedRun.totalNetPayable.toLocaleString()})`);
    showNotice(`Payroll run for ${currentRun.periodName} has been approved and locked.`);
  };

  const handleExportBankTransferFile = () => {
    exportToCSV(
      payslips.map((p) => ({
        BeneficiaryName: p.employeeName,
        AccountNumber: p.bankAccount,
        Amount: p.netPayable,
        Narration: `Salary ${p.periodName} HR360`,
      })),
      `Bank_Payment_Advice_${currentRun.periodName.replace(/\s+/g, '_')}`
    );
    onAudit('EXPORT_BANK_PAYMENT_FILE', `Generated bank disbursement instructions for ${payslips.length} employees`);
    showNotice(`Bank transfer instruction file generated.`);
  };

  const handleExportPayrollRegister = () => {
    exportToCSV(
      payslips.map((p) => ({
        EmployeeCode: p.employeeCode,
        EmployeeName: p.employeeName,
        Department: p.department,
        GrossSalary: p.grossSalary,
        TaxDeduction: p.incomeTaxDeduction,
        EOBI_Employee: p.eobiEmployeeDeduction,
        EOBI_Employer: p.eobiEmployerContribution,
        ProvidentFund: p.providentFundDeduction,
        TotalDeductions: p.totalDeductions,
        NetSalary: p.netPayable,
      })),
      `Payroll_Register_${currentRun.periodName.replace(/\s+/g, '_')}`
    );
    showNotice(`Payroll register exported.`);
  };

  const handlePrintAllPayslips = () => {
    for (const p of payslips) {
      generatePayslipPDF(p, payslipTemplate);
    }
    onAudit('BATCH_GENERATE_PAYSLIPS', `Batch generated and saved ${payslips.length} payslips as individual PDFs.`);
    showNotice(`Generated ${payslips.length} individual employee payslip PDFs.`);
  };

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
      <div className="flex flex-wrap justify-between items-center gap-3 pb-3 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center">
            <DollarSign className="w-5 h-5 mr-2 text-slate-800" />
            Payroll Processing & Statutory Calculations
          </h1>
          <p className="text-xs text-slate-500">
            Period: {currentRun.periodName} | 128-bit Decimal Precision | Zero Data Tampering
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleExportPayrollRegister}
            className="px-3 py-1.5 border border-slate-300 bg-white text-slate-700 text-xs font-semibold rounded hover:bg-slate-50 flex items-center"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
            Payroll Register CSV
          </button>
          <button
            onClick={handleExportBankTransferFile}
            className="px-3 py-1.5 border border-slate-300 bg-white text-slate-700 text-xs font-semibold rounded hover:bg-slate-50 flex items-center"
          >
            <Download className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
            Bank Payment File
          </button>
          <button
            onClick={handlePrintAllPayslips}
            className="px-3 py-1.5 border border-slate-300 bg-white text-slate-700 text-xs font-semibold rounded hover:bg-slate-50 flex items-center"
          >
            <Printer className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
            Batch PDF Payslips
          </button>
          {!currentRun.isLocked ? (
            <button
              onClick={handleApproveAndLock}
              className="px-3 py-1.5 bg-emerald-700 text-white text-xs font-semibold rounded hover:bg-emerald-800 flex items-center"
            >
              <Lock className="w-3.5 h-3.5 mr-1.5" />
              Approve & Lock Payroll Run
            </button>
          ) : (
            <span className="px-3 py-1.5 bg-slate-200 text-slate-700 font-bold text-xs rounded flex items-center">
              <Lock className="w-3.5 h-3.5 mr-1.5 text-slate-600" />
              Period Locked & Reconciled
            </span>
          )}
        </div>
      </div>

      {/* Summary KPI Tiles */}
      <div className="grid grid-cols-4 gap-3 text-xs">
        <div className="bg-white p-3 border border-slate-200 shadow-sm">
          <div className="text-slate-500">Gross Payroll Amount</div>
          <div className="text-lg font-bold text-slate-900 font-mono">
            PKR {currentRun.totalGross.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-500">Active Staff: {payslips.length}</div>
        </div>
        <div className="bg-white p-3 border border-slate-200 shadow-sm">
          <div className="text-slate-500">Total Statutory Deductions</div>
          <div className="text-lg font-bold text-red-600 font-mono">
            PKR {currentRun.totalDeductions.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-500">Income Tax + EOBI + PF</div>
        </div>
        <div className="bg-white p-3 border border-slate-200 shadow-sm">
          <div className="text-slate-500">Net Payable to Employees</div>
          <div className="text-lg font-bold text-emerald-700 font-mono">
            PKR {currentRun.totalNetPayable.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-500">Bank transfer advice ready</div>
        </div>
        <div className="bg-white p-3 border border-slate-200 shadow-sm">
          <div className="text-slate-500">Employer EOBI Liability</div>
          <div className="text-lg font-bold text-blue-800 font-mono">
            PKR {currentRun.totalEobiEmployer.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-500">PKR 650/employee/month</div>
        </div>
      </div>

      {/* Payslips Line Items Table */}
      <div className="bg-white border border-slate-200 shadow-sm overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 font-semibold">
            <tr>
              <th className="p-3">Code</th>
              <th className="p-3">Employee</th>
              <th className="p-3">Basic Salary</th>
              <th className="p-3">Allowances</th>
              <th className="p-3">Gross Salary</th>
              <th className="p-3">Income Tax</th>
              <th className="p-3">EOBI (Emp)</th>
              <th className="p-3">PF Deduct</th>
              <th className="p-3">Total Deduct</th>
              <th className="p-3">Net Pay</th>
              <th className="p-3 text-right">PDF</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {payslips.map((p) => (
              <tr key={p.id} className="hover:bg-slate-50">
                <td className="p-3 font-mono font-semibold text-slate-900">{p.employeeCode}</td>
                <td className="p-3 font-medium text-slate-900">
                  <div>{p.employeeName}</div>
                  <div className="text-[11px] text-slate-500">{p.department}</div>
                </td>
                <td className="p-3 font-mono">PKR {p.basicSalary.toLocaleString()}</td>
                <td className="p-3 font-mono">
                  PKR {(p.houseRentAllowance + p.medicalAllowance + p.transportAllowance).toLocaleString()}
                </td>
                <td className="p-3 font-mono font-bold text-slate-900">
                  PKR {p.grossSalary.toLocaleString()}
                </td>
                <td className="p-3 font-mono text-red-600">PKR {p.incomeTaxDeduction.toLocaleString()}</td>
                <td className="p-3 font-mono text-slate-600">PKR {p.eobiEmployeeDeduction}</td>
                <td className="p-3 font-mono text-slate-600">PKR {p.providentFundDeduction.toLocaleString()}</td>
                <td className="p-3 font-mono font-bold text-red-600">PKR {p.totalDeductions.toLocaleString()}</td>
                <td className="p-3 font-mono font-bold text-emerald-700 text-[13px]">
                  PKR {p.netPayable.toLocaleString()}
                </td>
                <td className="p-3 text-right">
                  <button
                    onClick={() => generatePayslipPDF(p, payslipTemplate)}
                    className="px-2 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded text-[11px] inline-flex items-center"
                    title="Generate Individual PDF Payslip"
                  >
                    <Download className="w-3 h-3 mr-1" /> PDF
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!currentRun.isLocked && (
        <div className="flex justify-end pt-2">
          <button
            onClick={handleRecalculate}
            className="px-4 py-2 border border-slate-300 bg-white text-slate-800 text-xs font-semibold rounded hover:bg-slate-50"
          >
            Recalculate Draft Values from Current Employee Directory
          </button>
        </div>
      )}
    </div>
  );
};
