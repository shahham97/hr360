import React, { useState } from 'react';
import {
  FileText,
  Save,
  Eye,
  CheckCircle2,
  Printer,
  Image,
  Palette,
  Trash2
} from 'lucide-react';
import { PayslipTemplate, Employee } from '../types/hr-types';
import { generatePayslipPDF } from '../utils/export-helpers';

interface Props {
  template: PayslipTemplate;
  setTemplate: React.Dispatch<React.SetStateAction<PayslipTemplate>>;
  sampleEmployee: Employee;
  onAudit: (action: string, details: string) => void;
}

const COLOR_PRESETS = [
  { label: 'Slate Navy', value: '#0f172a' },
  { label: 'Royal Blue', value: '#1d4ed8' },
  { label: 'Deep Indigo', value: '#3730a3' },
  { label: 'Emerald Forest', value: '#047857' },
  { label: 'Classic Crimson', value: '#991b1b' },
  { label: 'Executive Burgundy', value: '#6b21a8' },
];

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
  const [primaryColor, setPrimaryColor] = useState(template.primaryColor || '#0f172a');
  const [showLogo, setShowLogo] = useState(template.showLogo ?? true);
  const [logoUrl, setLogoUrl] = useState<string | undefined>(template.logoUrl);
  const [fontFamily, setFontFamily] = useState<'helvetica' | 'times' | 'courier'>(template.fontFamily || 'helvetica');
  const [headerLayout, setHeaderLayout] = useState<'BANNER' | 'MINIMAL' | 'CENTERED'>(template.headerLayout || 'BANNER');
  const [showSignatures, setShowSignatures] = useState(template.showSignatures ?? true);
  const [showBankDetails, setShowBankDetails] = useState(template.showBankDetails ?? true);
  const [notification, setNotification] = useState<string | null>(null);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const dataUrl = uploadEvent.target?.result as string;
      setLogoUrl(dataUrl);
      setShowLogo(true);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: PayslipTemplate = {
      ...template,
      companyName,
      companyAddress,
      companyTaxId,
      footerNotes,
      primaryColor,
      showLogo,
      logoUrl,
      fontFamily,
      headerLayout,
      showSignatures,
      showBankDetails,
    };
    setTemplate(updated);
    try {
      localStorage.setItem('hr360_payslip_template', JSON.stringify(updated));
    } catch {}
    onAudit('UPDATE_PAYSLIP_TEMPLATE', `Updated styled payslip template for ${companyName}`);
    setNotification('Salary slip template and branding published successfully. All generated payslips will inherit this design.');
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
      showLogo,
      logoUrl,
      fontFamily,
      headerLayout,
      showSignatures,
      showBankDetails,
    });
  };

  const fontClass =
    fontFamily === 'times' ? 'font-serif' : fontFamily === 'courier' ? 'font-mono' : 'font-sans';

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
            Salary Slip & Payslip Template Designer
          </h1>
          <p className="text-xs text-slate-500">
            Customize salary slip layout, add your company logo, choose theme colors, typography and disclaimers.
          </p>
        </div>

        <button
          onClick={handlePreviewPDF}
          className="px-3.5 py-1.5 border border-slate-300 bg-white text-slate-700 text-xs font-semibold rounded hover:bg-slate-50 flex items-center shadow-sm"
        >
          <Printer className="w-3.5 h-3.5 mr-1.5 text-slate-600" />
          Preview PDF Output
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Template Configuration Form */}
        <div className="bg-white p-5 border border-slate-200 shadow-sm text-xs space-y-4 rounded-lg">
          <h2 className="font-bold text-sm text-slate-900 border-b border-slate-100 pb-2 flex items-center">
            <Palette className="w-4 h-4 mr-1.5 text-blue-600" />
            Company Branding & Layout Settings
          </h2>

          <form onSubmit={handleSaveTemplate} className="space-y-3.5">
            {/* Logo Upload Section */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded space-y-2">
              <label className="block font-semibold text-slate-700">Company Logo</label>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {logoUrl ? (
                    <div className="flex items-center space-x-2 bg-white p-2 border border-slate-200 rounded">
                      <img src={logoUrl} alt="Logo" className="h-9 max-w-[120px] object-contain" />
                      <button
                        type="button"
                        onClick={() => {
                          setLogoUrl(undefined);
                          setShowLogo(false);
                        }}
                        className="p-1 text-red-600 hover:bg-red-50 rounded"
                        title="Remove Logo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <label className="cursor-pointer px-3 py-1.5 bg-white border border-slate-300 rounded text-slate-700 hover:bg-slate-100 flex items-center font-medium">
                      <Image className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
                      Upload Logo (PNG / JPG)
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>

                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showLogo}
                    onChange={(e) => setShowLogo(e.target.checked)}
                    className="rounded text-slate-900"
                  />
                  <span className="font-medium text-slate-700">Show Logo on Payslip</span>
                </label>
              </div>
            </div>

            {/* Theme Accent Color */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Primary Theme Accent Color</label>
              <div className="flex flex-wrap items-center gap-2">
                {COLOR_PRESETS.map((color) => (
                  <button
                    type="button"
                    key={color.value}
                    onClick={() => setPrimaryColor(color.value)}
                    className={`px-2.5 py-1 rounded text-[11px] font-medium border flex items-center space-x-1.5 ${
                      primaryColor === color.value
                        ? 'border-blue-600 ring-2 ring-blue-200 bg-white'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: color.value }} />
                    <span>{color.label}</span>
                  </button>
                ))}
                <input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="w-7 h-7 p-0 border border-slate-300 rounded cursor-pointer"
                  title="Custom Color"
                />
              </div>
            </div>

            {/* Header Layout & Font Family */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Header Layout Style</label>
                <select
                  value={headerLayout}
                  onChange={(e) => setHeaderLayout(e.target.value as any)}
                  className="w-full px-3 py-1.5 border border-slate-300 bg-white rounded"
                >
                  <option value="BANNER">Solid Color Banner</option>
                  <option value="MINIMAL">Minimal Clean (Underlined)</option>
                  <option value="CENTERED">Centered Letterhead</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Font Typography</label>
                <select
                  value={fontFamily}
                  onChange={(e) => setFontFamily(e.target.value as any)}
                  className="w-full px-3 py-1.5 border border-slate-300 bg-white rounded"
                >
                  <option value="helvetica">Modern Sans (Helvetica)</option>
                  <option value="times">Classic Serif (Times Roman)</option>
                  <option value="courier">Technical Monospace (Courier)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Company / Organization Legal Name *</label>
              <input
                type="text"
                required
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded font-medium"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Company Physical Address</label>
              <input
                type="text"
                value={companyAddress}
                onChange={(e) => setCompanyAddress(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Tax Registration (NTN / STRN)</label>
              <input
                type="text"
                value={companyTaxId}
                onChange={(e) => setCompanyTaxId(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-300 font-mono rounded"
              />
            </div>

            <div className="flex space-x-6 pt-1">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showSignatures}
                  onChange={(e) => setShowSignatures(e.target.checked)}
                  className="rounded text-slate-900"
                />
                <span className="text-slate-700 font-medium">Include Signature Lines</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showBankDetails}
                  onChange={(e) => setShowBankDetails(e.target.checked)}
                  className="rounded text-slate-900"
                />
                <span className="text-slate-700 font-medium">Display Bank Accounts</span>
              </label>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Footer Notes & Statutory Disclaimers</label>
              <textarea
                rows={2}
                value={footerNotes}
                onChange={(e) => setFooterNotes(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded text-xs"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-slate-900 text-white font-semibold rounded hover:bg-slate-800 flex items-center justify-center shadow-sm"
            >
              <Save className="w-3.5 h-3.5 mr-1.5" />
              Save & Apply Reusable Payslip Template
            </button>
          </form>
        </div>

        {/* Live Visual Preview Mock */}
        <div className="bg-white p-5 border border-slate-200 shadow-sm text-xs space-y-3 rounded-lg">
          <div className="flex justify-between items-center border-b border-slate-100 pb-2">
            <h2 className="font-bold text-sm text-slate-900 flex items-center">
              <Eye className="w-4 h-4 mr-1.5 text-slate-600" />
              Live Visual Template Preview
            </h2>
            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-semibold text-[10px] rounded">
              Active Template
            </span>
          </div>

          <div className={`border border-slate-300 p-4 rounded bg-slate-50/50 space-y-3 ${fontClass}`}>
            {/* Dynamic Header */}
            {headerLayout === 'MINIMAL' ? (
              <div
                className="bg-white p-3 rounded-t border-b-2 flex justify-between items-center"
                style={{ borderColor: primaryColor }}
              >
                <div>
                  <div className="font-bold text-base" style={{ color: primaryColor }}>
                    {companyName.toUpperCase()}
                  </div>
                  <div className="text-[10px] text-slate-500">CONFIDENTIAL SALARY PAYSLIP — OCTOBER 2026</div>
                  <div className="text-[9px] text-slate-400 font-mono">Tax / NTN: {companyTaxId}</div>
                </div>
                {showLogo && logoUrl && (
                  <img src={logoUrl} alt="Logo" className="h-10 max-w-[120px] object-contain ml-2" />
                )}
              </div>
            ) : headerLayout === 'CENTERED' ? (
              <div
                className="text-white p-3.5 rounded-t text-center space-y-1"
                style={{ backgroundColor: primaryColor }}
              >
                {showLogo && logoUrl && (
                  <div className="flex justify-center mb-1">
                    <img src={logoUrl} alt="Logo" className="h-9 max-w-[120px] object-contain brightness-0 invert" />
                  </div>
                )}
                <div className="font-bold text-sm tracking-wide">{companyName.toUpperCase()}</div>
                <div className="text-[10px] text-slate-200">CONFIDENTIAL SALARY PAYSLIP — OCTOBER 2026</div>
                <div className="text-[9px] text-slate-300 font-mono">Tax / NTN: {companyTaxId}</div>
              </div>
            ) : (
              <div
                className="text-white p-3 rounded-t flex justify-between items-center"
                style={{ backgroundColor: primaryColor }}
              >
                <div>
                  <div className="font-bold text-sm tracking-wide">{companyName.toUpperCase()}</div>
                  <div className="text-[10px] text-slate-200">CONFIDENTIAL SALARY PAYSLIP — OCTOBER 2026</div>
                  <div className="text-[9px] text-slate-300 font-mono">Tax / NTN: {companyTaxId}</div>
                </div>
                {showLogo && logoUrl && (
                  <img src={logoUrl} alt="Logo" className="h-9 max-w-[110px] object-contain ml-2 brightness-0 invert" />
                )}
              </div>
            )}

            {/* Employee Metadata */}
            <div className="p-3 bg-white border border-slate-200 rounded grid grid-cols-2 gap-2 text-[11px]">
              <div><span className="text-slate-500">Employee:</span> <span className="font-bold text-slate-800">{sampleEmployee.firstName} {sampleEmployee.lastName}</span></div>
              <div><span className="text-slate-500">Designation:</span> <span className="font-bold text-slate-800">{sampleEmployee.designation}</span></div>
              <div><span className="text-slate-500">Department:</span> <span>{sampleEmployee.department}</span></div>
              <div><span className="text-slate-500">Code:</span> <span className="font-mono">{sampleEmployee.employeeCode}</span></div>
              {showBankDetails && (
                <div className="col-span-2 text-slate-600 font-mono text-[10px]">
                  Bank: {sampleEmployee.bankName} — {sampleEmployee.bankAccount || 'PK36SCBL0000001123456701'}
                </div>
              )}
            </div>

            {/* Earnings and Deductions */}
            <div className="grid grid-cols-2 gap-3 text-[11px]">
              <div className="p-2.5 bg-white border border-slate-200 rounded">
                <div className="font-bold text-slate-800 border-b pb-1 mb-1">EARNINGS (PKR)</div>
                <div className="flex justify-between py-0.5"><span>Basic Salary:</span><span className="font-mono">{(sampleEmployee.baseSalary * 0.6).toLocaleString()}</span></div>
                <div className="flex justify-between py-0.5"><span>House Rent:</span><span className="font-mono">{(sampleEmployee.baseSalary * 0.25).toLocaleString()}</span></div>
                <div className="flex justify-between py-0.5"><span>Medical:</span><span className="font-mono">{(sampleEmployee.baseSalary * 0.1).toLocaleString()}</span></div>
              </div>
              <div className="p-2.5 bg-white border border-slate-200 rounded">
                <div className="font-bold text-slate-800 border-b pb-1 mb-1">DEDUCTIONS (PKR)</div>
                <div className="flex justify-between py-0.5"><span>Income Tax:</span><span className="font-mono text-red-600">12,500</span></div>
                <div className="flex justify-between py-0.5"><span>EOBI Employee:</span><span className="font-mono text-slate-600">130</span></div>
                <div className="flex justify-between py-0.5"><span>Provident Fund:</span><span className="font-mono text-slate-600">8,500</span></div>
              </div>
            </div>

            {/* Net Take-Home Salary Banner */}
            <div
              className="p-2.5 text-white flex justify-between items-center rounded"
              style={{ backgroundColor: primaryColor }}
            >
              <span className="font-bold text-xs">NET TAKE-HOME SALARY:</span>
              <span className="font-bold font-mono text-sm text-white">
                PKR {(sampleEmployee.baseSalary - 21130).toLocaleString()}
              </span>
            </div>

            {/* Signatures */}
            {showSignatures && (
              <div className="pt-4 border-t border-slate-200 flex justify-between text-[10px] text-slate-500">
                <div className="text-center">
                  <div className="w-28 border-b border-slate-400 mb-1 mx-auto" />
                  <span>Authorized HR Signature</span>
                </div>
                <div className="text-center">
                  <div className="w-28 border-b border-slate-400 mb-1 mx-auto" />
                  <span>Employee Signature</span>
                </div>
              </div>
            )}

            <div className="text-[10px] text-slate-500 italic pt-1 text-center">
              {footerNotes}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
