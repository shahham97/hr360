import React, { useState } from 'react';
import {
  Award,
  Download,
  Plus,
  Eye,
  CheckCircle2,
  Printer
} from 'lucide-react';
import { CertificateTemplate, Employee } from '../types/hr-types';
import { generateCertificatePDF } from '../utils/export-helpers';

interface Props {
  templates: CertificateTemplate[];
  setTemplates: React.Dispatch<React.SetStateAction<CertificateTemplate[]>>;
  employees: Employee[];
  companyName: string;
  onAudit: (action: string, details: string) => void;
}

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

export const CertificatesModule: React.FC<Props> = ({
  templates,
  setTemplates,
  employees,
  companyName,
  onAudit,
}) => {
  const [selectedTemplate, setSelectedTemplate] = useState<CertificateTemplate>(templates[0]);
  const [selectedEmpId, setSelectedEmpId] = useState<string>(employees[0]?.id || '');
  const [showAddModal, setShowAddModal] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  // Form states for new certificate
  const [certName, setCertName] = useState('');
  const [certType, setCertType] = useState<CertificateTemplate['type']>('EMPLOYMENT');
  const [certTitle, setCertTitle] = useState('');
  const [certBody, setCertBody] = useState('');
  const [signatoryName, setSignatoryName] = useState('Director of Human Resources');
  const [signatoryTitle, setSignatoryTitle] = useState('Division of People & Culture');

  const showNotice = (text: string) => {
    setNotification(text);
    setTimeout(() => setNotification(null), 4000);
  };

  const currentEmp = employees.find((e) => e.id === selectedEmpId) || employees[0] || FALLBACK_SAMPLE_EMPLOYEE;

  const handleGeneratePDF = () => {
    generateCertificatePDF(currentEmp, selectedTemplate, companyName);
    onAudit(
      'GENERATE_HR_CERTIFICATE',
      `Issued ${selectedTemplate.title} for ${currentEmp.firstName} ${currentEmp.lastName} (${currentEmp.employeeCode})`
    );
    showNotice(`Generated official ${selectedTemplate.title} PDF for ${currentEmp.firstName} ${currentEmp.lastName}.`);
  };

  const handleCreateTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    const newTpl: CertificateTemplate = {
      id: `cert-custom-${Date.now()}`,
      name: certName,
      type: certType,
      title: certTitle,
      bodyContent: certBody,
      signatoryName,
      signatoryTitle,
      isDefault: false,
    };

    setTemplates((prev) => [...prev, newTpl]);
    setSelectedTemplate(newTpl);
    onAudit('CREATE_CERTIFICATE_TEMPLATE', `Created new reusable certificate template: "${certTitle}"`);
    showNotice(`Certificate template "${certTitle}" created successfully.`);
    setShowAddModal(false);
  };

  // Preview replacement
  const previewText = selectedTemplate.bodyContent
    .replace(/\{\{EMPLOYEE_NAME\}\}/g, `${currentEmp.firstName} ${currentEmp.lastName}`)
    .replace(/\{\{EMPLOYEE_CODE\}\}/g, currentEmp.employeeCode)
    .replace(/\{\{DESIGNATION\}\}/g, currentEmp.designation)
    .replace(/\{\{DEPARTMENT\}\}/g, currentEmp.department)
    .replace(/\{\{JOINING_DATE\}\}/g, currentEmp.joiningDate)
    .replace(/\{\{COMPANY_NAME\}\}/g, companyName)
    .replace(/\{\{NATIONAL_ID\}\}/g, currentEmp.nationalId)
    .replace(/\{\{BASE_SALARY\}\}/g, `PKR ${currentEmp.baseSalary.toLocaleString()}`);

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
            <Award className="w-5 h-5 mr-2 text-slate-800" />
            Benefits & Employment Certificates (Section 9)
          </h1>
          <p className="text-xs text-slate-500">
            Generate reusable letters: Employment, Salary Attestation, Relieving, and Experience certificates
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-3 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded hover:bg-slate-800 flex items-center"
        >
          <Plus className="w-3.5 h-3.5 mr-1.5" />
          Create Certificate Template
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Template Selector & Employee Picker */}
        <div className="space-y-4">
          <div className="bg-white p-4 border border-slate-200 shadow-sm text-xs space-y-3">
            <h2 className="font-bold text-slate-900 border-b pb-2">1. Select Certificate Template</h2>
            <div className="space-y-1.5">
              {templates.map((tpl) => (
                <button
                  key={tpl.id}
                  onClick={() => setSelectedTemplate(tpl)}
                  className={`w-full text-left p-2.5 rounded border transition-colors ${
                    selectedTemplate.id === tpl.id
                      ? 'border-slate-900 bg-slate-50 font-semibold text-slate-900'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="font-medium text-xs">{tpl.name}</div>
                  <div className="text-[10px] text-slate-500">{tpl.type} Certificate</div>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white p-4 border border-slate-200 shadow-sm text-xs space-y-3">
            <h2 className="font-bold text-slate-900 border-b pb-2">2. Target Employee</h2>
            <div>
              <label className="block text-slate-600 mb-1">Choose Employee for Generation:</label>
              <select
                value={selectedEmpId}
                onChange={(e) => setSelectedEmpId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 bg-white"
              >
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.employeeCode}: {emp.firstName} {emp.lastName} ({emp.designation})
                  </option>
                ))}
              </select>
            </div>

            <div className="pt-2">
              <button
                onClick={handleGeneratePDF}
                className="w-full py-2.5 bg-emerald-700 text-white font-semibold rounded hover:bg-emerald-800 flex items-center justify-center text-xs"
              >
                <Download className="w-3.5 h-3.5 mr-1.5" />
                Generate & Save Official PDF
              </button>
            </div>
          </div>
        </div>

        {/* Live Document Preview Panel */}
        <div className="lg:col-span-2 bg-white p-6 border border-slate-200 shadow-sm text-xs space-y-4">
          <div className="flex justify-between items-center border-b pb-2">
            <div className="flex items-center space-x-2">
              <Eye className="w-4 h-4 text-slate-600" />
              <span className="font-bold text-sm text-slate-900">Live Certificate Layout Preview</span>
            </div>
            <button
              onClick={handleGeneratePDF}
              className="px-3 py-1 border border-slate-300 text-slate-700 rounded hover:bg-slate-50 flex items-center"
            >
              <Printer className="w-3 h-3 mr-1" /> Print PDF
            </button>
          </div>

          <div className="border border-slate-300 p-8 rounded bg-white shadow-inner max-w-xl mx-auto space-y-6">
            <div className="text-center border-b pb-4">
              <h2 className="font-bold text-base text-slate-900 tracking-wider">{companyName.toUpperCase()}</h2>
              <div className="text-[11px] text-slate-500 font-medium">HUMAN CAPITAL MANAGEMENT SYSTEM</div>
            </div>

            <div className="text-center">
              <h3 className="font-bold text-sm text-slate-900 uppercase underline tracking-wide">
                {selectedTemplate.title}
              </h3>
            </div>

            <div className="flex justify-between text-[11px] text-slate-500 font-mono">
              <div>Ref: REF-HR360-{currentEmp.employeeCode}-2026</div>
              <div>Date: {new Date().toLocaleDateString('en-GB')}</div>
            </div>

            <div className="text-[11px] text-slate-800 leading-relaxed whitespace-pre-line font-serif">
              {previewText}
            </div>

            <div className="pt-8 border-t border-slate-100 flex justify-between items-end text-[11px]">
              <div>
                <div className="font-bold text-slate-900">{selectedTemplate.signatoryName}</div>
                <div className="text-slate-500">{selectedTemplate.signatoryTitle}</div>
                <div className="text-slate-500">{companyName}</div>
              </div>
              <div className="text-right">
                <div className="w-24 h-10 border-b border-dashed border-slate-300 mb-1" />
                <div className="text-[10px] text-slate-400">Official Stamp / Signature</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Certificate Template Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-300 shadow-2xl max-w-lg w-full p-6 text-xs">
            <div className="flex justify-between items-center pb-3 border-b border-slate-200">
              <h3 className="font-bold text-base text-slate-900">Create Certificate Template</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 font-bold">✕</button>
            </div>
            <form onSubmit={handleCreateTemplate} className="space-y-3 pt-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Template Display Name *</label>
                <input
                  type="text"
                  required
                  value={certName}
                  onChange={(e) => setCertName(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300"
                  placeholder="e.g. Visa Support Certificate"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Type *</label>
                  <select
                    value={certType}
                    onChange={(e) => setCertType(e.target.value as any)}
                    className="w-full px-3 py-1.5 border border-slate-300 bg-white"
                  >
                    <option value="EMPLOYMENT">Employment Certificate</option>
                    <option value="SALARY">Salary Attestation</option>
                    <option value="EXPERIENCE">Experience Certificate</option>
                    <option value="BENEFITS">Benefits Attestation</option>
                    <option value="PROMOTION">Promotion Letter</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Header Title *</label>
                  <input
                    type="text"
                    required
                    value={certTitle}
                    onChange={(e) => setCertTitle(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300"
                    placeholder="e.g. VISA ATTESTATION LETTER"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Document Content (Use Placeholders: <code className="bg-slate-100 font-mono text-[10px]">&#123;&#123;EMPLOYEE_NAME&#125;&#125;</code>, <code className="bg-slate-100 font-mono text-[10px]">&#123;&#123;DESIGNATION&#125;&#125;</code>, <code className="bg-slate-100 font-mono text-[10px]">&#123;&#123;JOINING_DATE&#125;&#125;</code>) *
                </label>
                <textarea
                  required
                  rows={5}
                  value={certBody}
                  onChange={(e) => setCertBody(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 font-mono"
                  placeholder="This is to certify that {{EMPLOYEE_NAME}} is working as {{DESIGNATION}}..."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Signatory Name</label>
                  <input
                    type="text"
                    value={signatoryName}
                    onChange={(e) => setSignatoryName(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Signatory Title</label>
                  <input
                    type="text"
                    value={signatoryTitle}
                    onChange={(e) => setSignatoryTitle(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-900 text-white rounded font-semibold hover:bg-slate-800"
                >
                  Save Certificate Template
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
