import React, { useState } from 'react';
import {
  FileText,
  Save,
  Eye,
  CheckCircle2,
  Printer
} from 'lucide-react';
import { PayslipTemplate, Employee } from '../types/hr-types';
import { generatePayslipPDF } from '../utils/export-helpers';

interface Props {
  template: PayslipTemplate;
  setTemplate: React.Dispatch<React.SetStateAction<PayslipTemplate>>;
  sampleEmployee: Employee;
  onAudit: (action: string, details: string) => void;
}

export const PayslipTemplateModule: React.FC<Props> = ({
  template,
  setTemplate,
  sampleEmployee,
  onAudit,
}) => {
  const [companyName, setCompanyName] = useState(template.companyName);
  const [companyAddress, setCompanyAddress] = useState(template.companyAddress);
  const [companyTaxId, setCompanyTaxId] = useState(template.companyTaxId);
  const [footerNotes, setFooterNotes] = useState(template.footerNotes);
  const [primaryColor, setPrimaryColor] = useState(template.primaryColor);
  const [showSignatures, setShowSignatures] = useState(template.showSignatures);
  const [showBankDetails, setShowBankDetails] = useState(template.showBankDetails);
  const [notification, setNotification] = useState<string | null>(null);

  const handleSaveTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: PayslipTemplate = {
      ...template,
      companyName,
      companyAddress,
      companyTaxId,
      footerNotes,
      primaryColor,
      showSignatures,
      showBankDetails,
    };
    setTemplate(updated);
    onAudit('UPDATE_PAYSLIP_TEMPLATE', `Updated reusable payslip template for ${companyName}`);
    setNotification('Payslip template published. All future generated payslips will inherit this design.');
    setTimeout(() => setNotification(null), 4000);
  };

  const handlePreviewPDF = () => {
    const dummyPayslip = {
      id: 'demo-sample',
      payrollRunId: 'pr-demo',
      employeeId: sampleEmployee.id,
      employeeCode: sampleEmployee.employeeCode,
      employeeName: `${sampleEmployee.firstName} ${sampleEmployee.lastName}`,
      department: sampleEmployee.department,
      designation: sampleEmployee.designation,
      branch: sampleEmployee.branch,
      joiningDate: sampleEmployee.joiningDate,
      bankAccount: sampleEmployee.bankAccount || 'PK36SCBL0000001123456701',
      periodName: 'October 2026',
      basicSalary: sampleEmployee.baseSalary * 0.6,
      houseRentAllowance: sampleEmployee.baseSalary * 0.25,
      medicalAllowance: sampleEmployee.baseSalary * 0.1,
      transportAllowance: sampleEmployee.baseSalary * 0.05,
      overtimeEarnings: 0,
      grossSalary: sampleEmployee.baseSalary,
      incomeTaxDeduction: 12500,
      eobiEmployeeDeduction: 130,
      eobiEmployerContribution: 650,
      providentFundDeduction: sampleEmployee.baseSalary * 0.03,
      unpaidLeaveDeduction: 0,
      totalDeductions: 12500 + 130 + sampleEmployee.baseSalary * 0.03,
      netPayable: sampleEmployee.baseSalary - (12500 + 130 + sampleEmployee.baseSalary * 0.03),
    };

    generatePayslipPDF(dummyPayslip, {
      ...template,
      companyName,
      companyAddress,
      companyTaxId,
      footerNotes,
      primaryColor,
      showSignatures,
      showBankDetails,
    });
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
            <FileText className="w-5 h-5 mr-2 text-slate-800" />
            Reusable Payslip Template Designer (Section 8)
          </h1>
          <p className="text-xs text-slate-500">
            Design corporate payslips once — dynamic placeholders auto-populate across every employee
          </p>
        </div>

        <button
          onClick={handlePreviewPDF}
          className="px-3 py-1.5 border border-slate-300 bg-white text-slate-700 text-xs font-semibold rounded hover:bg-slate-50 flex items-center"
        >
          <Printer className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
          Preview PDF Output
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Template Configuration Form */}
        <div className="bg-white p-5 border border-slate-200 shadow-sm text-xs space-y-4">
          <h2 className="font-bold text-sm text-slate-900 border-b border-slate-100 pb-2">
            Corporate Header & Legal Details
          </h2>

          <form onSubmit={handleSaveTemplate} className="space-y-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Company / Organization Legal Name *</label>
              <input
                type="text"
                required
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-300 font-medium"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Company Physical Address</label>
              <input
                type="text"
                value={companyAddress}
                onChange={(e) => setCompanyAddress(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-300"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Tax Registration (NTN / STRN)</label>
              <input
                type="text"
                value={companyTaxId}
                onChange={(e) => setCompanyTaxId(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-300 font-mono"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Brand Theme Accent Color</label>
                <div className="flex items-center space-x-2">
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="h-8 w-12 border border-slate-300 cursor-pointer"
                  />
                  <span className="font-mono text-slate-600">{primaryColor}</span>
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showSignatures}
                    onChange={(e) => setShowSignatures(e.target.checked)}
                    className="rounded text-slate-900"
                  />
                  <span className="text-slate-700">Include Signature Lines</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showBankDetails}
                    onChange={(e) => setShowBankDetails(e.target.checked)}
                    className="rounded text-slate-900"
                  />
                  <span className="text-slate-700">Display Bank Accounts</span>
                </label>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Footer Notes & Statutory Disclaimers</label>
              <textarea
                rows={3}
                value={footerNotes}
                onChange={(e) => setFooterNotes(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-300"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2 bg-slate-900 text-white font-semibold rounded hover:bg-slate-800 flex items-center justify-center"
            >
              <Save className="w-3.5 h-3.5 mr-1.5" />
              Save & Set as Default Template
            </button>
          </form>
        </div>

        {/* Live Visual Preview Mock */}
        <div className="bg-white p-5 border border-slate-200 shadow-sm text-xs space-y-3">
          <div className="flex justify-between items-center border-b border-slate-100 pb-2">
            <h2 className="font-bold text-sm text-slate-900 flex items-center">
              <Eye className="w-4 h-4 mr-1.5 text-slate-600" />
              Live Visual Template Preview
            </h2>
            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-semibold text-[10px]">
              Active Default
            </span>
          </div>

          <div className="border border-slate-300 p-4 rounded bg-slate-50/50 space-y-3">
            <div className="bg-slate-900 text-white p-3 rounded-t">
              <div className="font-bold text-sm tracking-wide">{companyName.toUpperCase()}</div>
              <div className="text-[10px] text-slate-300">CONFIDENTIAL SALARY PAYSLIP — OCTOBER 2026</div>
              <div className="text-[9px] text-slate-400 font-mono">Tax / NTN: {companyTaxId}</div>
            </div>

            <div className="p-3 bg-white border border-slate-200 grid grid-cols-2 gap-2 text-[11px]">
              <div><span className="text-slate-500">Employee:</span> <span className="font-bold">{sampleEmployee.firstName} {sampleEmployee.lastName}</span></div>
              <div><span className="text-slate-500">Designation:</span> <span className="font-bold">{sampleEmployee.designation}</span></div>
              <div><span className="text-slate-500">Department:</span> <span>{sampleEmployee.department}</span></div>
              <div><span className="text-slate-500">Code:</span> <span className="font-mono">{sampleEmployee.employeeCode}</span></div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-[11px]">
              <div className="p-2.5 bg-white border border-slate-200">
                <div className="font-bold text-slate-800 border-b pb-1 mb-1">EARNINGS</div>
                <div className="flex justify-between"><span>Basic Salary:</span><span className="font-mono">PKR {(sampleEmployee.baseSalary * 0.6).toLocaleString()}</span></div>
                <div className="flex justify-between"><span>House Rent:</span><span className="font-mono">PKR {(sampleEmployee.baseSalary * 0.25).toLocaleString()}</span></div>
                <div className="flex justify-between"><span>Medical:</span><span className="font-mono">PKR {(sampleEmployee.baseSalary * 0.1).toLocaleString()}</span></div>
              </div>
              <div className="p-2.5 bg-white border border-slate-200">
                <div className="font-bold text-slate-800 border-b pb-1 mb-1">DEDUCTIONS</div>
                <div className="flex justify-between"><span>Income Tax:</span><span className="font-mono text-red-600">PKR 12,500</span></div>
                <div className="flex justify-between"><span>EOBI Employee:</span><span className="font-mono text-slate-600">PKR 130</span></div>
                <div className="flex justify-between"><span>Provident Fund:</span><span className="font-mono text-slate-600">PKR 8,500</span></div>
              </div>
            </div>

            <div className="p-2.5 bg-slate-900 text-white flex justify-between items-center rounded">
              <span className="font-bold text-xs">NET TAKE-HOME SALARY:</span>
              <span className="font-bold font-mono text-sm text-emerald-400">
                PKR {(sampleEmployee.baseSalary - 21130).toLocaleString()}
              </span>
            </div>

            <div className="text-[10px] text-slate-500 italic pt-1 text-center">
              {footerNotes}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
