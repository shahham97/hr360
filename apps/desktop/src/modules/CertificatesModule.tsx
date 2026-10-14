import React, { useState } from 'react';
import {
  Award,
  Download,
  Plus,
  Eye,
  CheckCircle2,
  Printer,
  Edit3,
  Image,
  Palette,
  Trash2
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

const COLOR_PRESETS = [
  { label: 'Slate Navy', value: '#0f172a' },
  { label: 'Royal Blue', value: '#1d4ed8' },
  { label: 'Deep Indigo', value: '#3730a3' },
  { label: 'Emerald Forest', value: '#065f46' },
  { label: 'Classic Crimson', value: '#991b1b' },
  { label: 'Executive Burgundy', value: '#581c87' },
];

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
  const [editingTemplate, setEditingTemplate] = useState<CertificateTemplate | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  // Form states for new certificate
  const [certName, setCertName] = useState('');
  const [certType, setCertType] = useState<CertificateTemplate['type']>('EMPLOYMENT');
  const [certTitle, setCertTitle] = useState('');
  const [certBody, setCertBody] = useState('');
  const [signatoryName, setSignatoryName] = useState('Director of Human Resources');
  const [signatoryTitle, setSignatoryTitle] = useState('Division of People & Culture');
  const [certLogo, setCertLogo] = useState<string | undefined>(undefined);
  const [certColor, setCertColor] = useState('#0f172a');
  const [certFont, setCertFont] = useState<'helvetica' | 'times' | 'courier'>('helvetica');
  const [certBorder, setCertBorder] = useState(true);

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

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>, isEditing = false) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const dataUrl = uploadEvent.target?.result as string;
      if (isEditing && editingTemplate) {
        setEditingTemplate({ ...editingTemplate, logoUrl: dataUrl });
      } else {
        setCertLogo(dataUrl);
      }
    };
    reader.readAsDataURL(file);
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
      logoUrl: certLogo,
      primaryColor: certColor,
      fontFamily: certFont,
      showBorder: certBorder,
    };

    setTemplates((prev) => [...prev, newTpl]);
    setSelectedTemplate(newTpl);
    onAudit('CREATE_CERTIFICATE_TEMPLATE', `Created new reusable certificate template: "${certTitle}"`);
    showNotice(`Certificate template "${certTitle}" created successfully.`);
    setShowAddModal(false);
  };

  const handleSaveEditTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTemplate) return;

    setTemplates((prev) => prev.map((t) => (t.id === editingTemplate.id ? editingTemplate : t)));
    setSelectedTemplate(editingTemplate);
    onAudit('UPDATE_CERTIFICATE_TEMPLATE', `Updated certificate template styling & content for "${editingTemplate.title}"`);
    showNotice(`Template "${editingTemplate.name}" updated successfully.`);
    setEditingTemplate(null);
  };

  // Preview replacement
  const previewText = (selectedTemplate.bodyContent || '')
    .replace(/\{\{EMPLOYEE_NAME\}\}/g, `${currentEmp.firstName} ${currentEmp.lastName}`)
    .replace(/\{\{EMPLOYEE_CODE\}\}/g, currentEmp.employeeCode)
    .replace(/\{\{DESIGNATION\}\}/g, currentEmp.designation)
    .replace(/\{\{DEPARTMENT\}\}/g, currentEmp.department)
    .replace(/\{\{JOINING_DATE\}\}/g, currentEmp.joiningDate)
    .replace(/\{\{COMPANY_NAME\}\}/g, companyName)
    .replace(/\{\{NATIONAL_ID\}\}/g, currentEmp.nationalId || 'VERIFIED ON FILE')
    .replace(/\{\{BASE_SALARY\}\}/g, `PKR ${currentEmp.baseSalary.toLocaleString()}`);

  const activeColor = selectedTemplate.primaryColor || '#0f172a';
  const fontClass =
    selectedTemplate.fontFamily === 'times'
      ? 'font-serif'
      : selectedTemplate.fontFamily === 'courier'
      ? 'font-mono'
      : 'font-sans';

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
            HR Document & Certificate Templates
          </h1>
          <p className="text-xs text-slate-500">
            Generate and customize reusable letters with company logo, custom branding colors, fonts, and statutory placeholders.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setEditingTemplate({ ...selectedTemplate })}
            className="px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded hover:bg-blue-700 flex items-center"
          >
            <Edit3 className="w-3.5 h-3.5 mr-1.5" />
            Edit & Style Current Template
          </button>
          <button
            onClick={() => {
              setCertName('');
              setCertTitle('');
              setCertBody('This is to certify that {{EMPLOYEE_NAME}} (ID: {{EMPLOYEE_CODE}}) is currently employed with {{COMPANY_NAME}} as {{DESIGNATION}} in the {{DEPARTMENT}} Department since {{JOINING_DATE}}.\n\nDuring their tenure, they have demonstrated high professional competency and ethical conduct.');
              setCertLogo(selectedTemplate.logoUrl);
              setCertColor(selectedTemplate.primaryColor || '#0f172a');
              setCertFont(selectedTemplate.fontFamily || 'helvetica');
              setCertBorder(true);
              setShowAddModal(true);
            }}
            className="px-3 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded hover:bg-slate-800 flex items-center"
          >
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            Create New Template
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Template Selector & Employee Picker */}
        <div className="space-y-4">
          <div className="bg-white p-4 border border-slate-200 shadow-sm text-xs space-y-3">
            <div className="flex justify-between items-center border-b pb-2">
              <h2 className="font-bold text-slate-900">1. Select Certificate Template</h2>
              <span className="text-[10px] text-slate-500">{templates.length} Available</span>
            </div>
            <div className="space-y-1.5">
              {templates.map((tpl) => (
                <div
                  key={tpl.id}
                  className={`p-2.5 rounded border transition-colors flex justify-between items-center ${
                    selectedTemplate.id === tpl.id
                      ? 'border-blue-600 bg-blue-50/50 font-semibold text-slate-900'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <button
                    onClick={() => setSelectedTemplate(tpl)}
                    className="flex-1 text-left"
                  >
                    <div className="font-medium text-xs flex items-center">
                      <span
                        className="w-2.5 h-2.5 rounded-full mr-2 shrink-0"
                        style={{ backgroundColor: tpl.primaryColor || '#0f172a' }}
                      />
                      {tpl.name}
                    </div>
                    <div className="text-[10px] text-slate-500 ml-4.5">{tpl.type} Certificate</div>
                  </button>
                  <button
                    onClick={() => setEditingTemplate({ ...tpl })}
                    className="p-1 text-slate-400 hover:text-blue-600 rounded ml-2"
                    title="Edit and Style Template"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                </div>
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
                className="w-full px-3 py-2 border border-slate-300 bg-white rounded text-xs"
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
                className="w-full py-2.5 bg-emerald-700 text-white font-semibold rounded hover:bg-emerald-800 flex items-center justify-center text-xs shadow-sm"
              >
                <Download className="w-3.5 h-3.5 mr-1.5" />
                Generate & Save Official PDF
              </button>
            </div>
          </div>

          {/* Template Info Card */}
          <div className="bg-slate-50 p-4 border border-slate-200 rounded text-xs space-y-2">
            <div className="font-bold text-slate-800 flex items-center">
              <Palette className="w-3.5 h-3.5 mr-1.5 text-blue-600" />
              Active Template Styling
            </div>
            <div className="flex items-center justify-between text-slate-600">
              <span>Accent Color:</span>
              <div className="flex items-center space-x-1.5">
                <span className="w-3 h-3 rounded" style={{ backgroundColor: activeColor }} />
                <span className="font-mono text-[11px]">{activeColor}</span>
              </div>
            </div>
            <div className="flex items-center justify-between text-slate-600">
              <span>Typography:</span>
              <span className="font-semibold capitalize">{selectedTemplate.fontFamily || 'Helvetica'}</span>
            </div>
            <div className="flex items-center justify-between text-slate-600">
              <span>Company Logo:</span>
              <span className="font-semibold text-emerald-700">{selectedTemplate.logoUrl ? 'Attached' : 'None'}</span>
            </div>
            <div className="flex items-center justify-between text-slate-600">
              <span>Decorative Border:</span>
              <span className="font-semibold">{selectedTemplate.showBorder !== false ? 'Enabled' : 'Disabled'}</span>
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
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setEditingTemplate({ ...selectedTemplate })}
                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs flex items-center"
              >
                <Edit3 className="w-3 h-3 mr-1" /> Style Template
              </button>
              <button
                onClick={handleGeneratePDF}
                className="px-3 py-1 bg-slate-900 text-white rounded hover:bg-slate-800 flex items-center"
              >
                <Printer className="w-3 h-3 mr-1" /> Print PDF
              </button>
            </div>
          </div>

          {/* Certificate Sheet Preview */}
          <div
            className={`p-8 rounded bg-white shadow-md max-w-xl mx-auto space-y-6 ${fontClass} ${
              selectedTemplate.showBorder !== false ? 'border-4 border-double' : 'border'
            }`}
            style={{ borderColor: activeColor }}
          >
            {/* Header with Logo and Company Title */}
            <div className="text-center border-b pb-4 space-y-2">
              {selectedTemplate.logoUrl && (
                <div className="flex justify-center mb-2">
                  <img
                    src={selectedTemplate.logoUrl}
                    alt="Company Logo"
                    className="h-12 max-w-[160px] object-contain"
                  />
                </div>
              )}
              <h2
                className="font-bold text-base tracking-wider"
                style={{ color: activeColor }}
              >
                {companyName.toUpperCase()}
              </h2>
              <div className="text-[11px] text-slate-500 font-medium">OFFICIAL HUMAN RESOURCES CERTIFICATION</div>
            </div>

            <div className="text-center">
              <h3
                className="font-bold text-sm uppercase tracking-wide underline underline-offset-4"
                style={{ color: activeColor }}
              >
                {selectedTemplate.title}
              </h3>
            </div>

            <div className="flex justify-between text-[11px] text-slate-500 font-mono">
              <div>Ref: REF-HR360-{currentEmp.employeeCode}-2026</div>
              <div>Date: {new Date().toLocaleDateString('en-GB')}</div>
            </div>

            <div className="text-[11px] text-slate-800 leading-relaxed whitespace-pre-line">
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
                <div className="text-[10px] text-slate-400">Official Seal & Signature</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Certificate Template & Style Modal */}
      {editingTemplate && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-300 shadow-2xl max-w-xl w-full p-6 text-xs max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-3 border-b border-slate-200">
              <div>
                <h3 className="font-bold text-base text-slate-900 flex items-center">
                  <Edit3 className="w-4 h-4 mr-2 text-blue-600" />
                  Edit & Style Template: {editingTemplate.name}
                </h3>
                <p className="text-slate-500 text-[11px]">Customize text, company logo, accent color, and typography</p>
              </div>
              <button onClick={() => setEditingTemplate(null)} className="text-slate-400 hover:text-slate-700 font-bold">✕</button>
            </div>

            <form onSubmit={handleSaveEditTemplate} className="space-y-4 pt-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Template Display Name *</label>
                  <input
                    type="text"
                    required
                    value={editingTemplate.name}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, name: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Header Title *</label>
                  <input
                    type="text"
                    required
                    value={editingTemplate.title}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, title: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded"
                  />
                </div>
              </div>

              {/* Logo & Styling Section */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded space-y-3">
                <div className="font-bold text-slate-800 flex items-center">
                  <Palette className="w-3.5 h-3.5 mr-1.5 text-blue-600" />
                  Styling & Branding Customization
                </div>

                {/* Logo Upload */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Company Logo</label>
                  <div className="flex items-center space-x-3">
                    {editingTemplate.logoUrl ? (
                      <div className="flex items-center space-x-2 bg-white p-2 border border-slate-200 rounded">
                        <img src={editingTemplate.logoUrl} alt="Logo Preview" className="h-8 max-w-[100px] object-contain" />
                        <button
                          type="button"
                          onClick={() => setEditingTemplate({ ...editingTemplate, logoUrl: undefined })}
                          className="p-1 text-red-600 hover:bg-red-50 rounded"
                          title="Remove Logo"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <label className="cursor-pointer px-3 py-1.5 bg-white border border-slate-300 rounded text-slate-700 hover:bg-slate-100 flex items-center font-medium">
                        <Image className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
                        Upload Company Logo (PNG / JPG)
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleLogoUpload(e, true)}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                </div>

                {/* Primary Color Palette */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Theme Accent Color</label>
                  <div className="flex flex-wrap items-center gap-2">
                    {COLOR_PRESETS.map((color) => (
                      <button
                        type="button"
                        key={color.value}
                        onClick={() => setEditingTemplate({ ...editingTemplate, primaryColor: color.value })}
                        className={`px-2.5 py-1 rounded text-[11px] font-medium border flex items-center space-x-1.5 ${
                          (editingTemplate.primaryColor || '#0f172a') === color.value
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
                      value={editingTemplate.primaryColor || '#0f172a'}
                      onChange={(e) => setEditingTemplate({ ...editingTemplate, primaryColor: e.target.value })}
                      className="w-7 h-7 p-0 border border-slate-300 rounded cursor-pointer"
                      title="Custom Color"
                    />
                  </div>
                </div>

                {/* Typography and Border */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Font Family</label>
                    <select
                      value={editingTemplate.fontFamily || 'helvetica'}
                      onChange={(e) => setEditingTemplate({ ...editingTemplate, fontFamily: e.target.value as any })}
                      className="w-full px-3 py-1.5 border border-slate-300 bg-white rounded"
                    >
                      <option value="helvetica">Modern Sans (Helvetica)</option>
                      <option value="times">Formal Serif (Times Roman)</option>
                      <option value="courier">Technical Monospace (Courier)</option>
                    </select>
                  </div>
                  <div className="flex items-center pt-5">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editingTemplate.showBorder !== false}
                        onChange={(e) => setEditingTemplate({ ...editingTemplate, showBorder: e.target.checked })}
                        className="rounded border-slate-300"
                      />
                      <span className="font-semibold text-slate-700">Display Formal Certificate Border</span>
                    </label>
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Document Content (Use Placeholders: <code className="bg-slate-100 px-1 font-mono text-[10px]">&#123;&#123;EMPLOYEE_NAME&#125;&#125;</code>, <code className="bg-slate-100 px-1 font-mono text-[10px]">&#123;&#123;DESIGNATION&#125;&#125;</code>, <code className="bg-slate-100 px-1 font-mono text-[10px]">&#123;&#123;JOINING_DATE&#125;&#125;</code>, <code className="bg-slate-100 px-1 font-mono text-[10px]">&#123;&#123;BASE_SALARY&#125;&#125;</code>) *
                </label>
                <textarea
                  required
                  rows={6}
                  value={editingTemplate.bodyContent}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, bodyContent: e.target.value })}
                  className="w-full px-3 py-1.5 border border-slate-300 font-mono text-xs rounded"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Signatory Name</label>
                  <input
                    type="text"
                    value={editingTemplate.signatoryName}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, signatoryName: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Signatory Title</label>
                  <input
                    type="text"
                    value={editingTemplate.signatoryTitle}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, signatoryTitle: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setEditingTemplate(null)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded hover:bg-slate-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white font-semibold rounded hover:bg-blue-700 shadow-sm"
                >
                  Save Template & Styling
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create New Certificate Template Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-300 shadow-2xl max-w-xl w-full p-6 text-xs max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-3 border-b border-slate-200">
              <h3 className="font-bold text-base text-slate-900">Create New Certificate Template</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 font-bold hover:text-slate-700">✕</button>
            </div>
            <form onSubmit={handleCreateTemplate} className="space-y-4 pt-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Template Display Name *</label>
                <input
                  type="text"
                  required
                  value={certName}
                  onChange={(e) => setCertName(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded"
                  placeholder="e.g. Visa Support Certificate"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Type *</label>
                  <select
                    value={certType}
                    onChange={(e) => setCertType(e.target.value as any)}
                    className="w-full px-3 py-1.5 border border-slate-300 bg-white rounded"
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
                    className="w-full px-3 py-1.5 border border-slate-300 rounded"
                    placeholder="e.g. VISA ATTESTATION LETTER"
                  />
                </div>
              </div>

              {/* Branding and Logo */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded space-y-3">
                <div className="font-bold text-slate-800 flex items-center">
                  <Palette className="w-3.5 h-3.5 mr-1.5 text-blue-600" />
                  Styling & Branding
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Company Logo</label>
                  <div className="flex items-center space-x-3">
                    {certLogo ? (
                      <div className="flex items-center space-x-2 bg-white p-2 border border-slate-200 rounded">
                        <img src={certLogo} alt="Logo" className="h-8 max-w-[100px] object-contain" />
                        <button
                          type="button"
                          onClick={() => setCertLogo(undefined)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded"
                          title="Remove Logo"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <label className="cursor-pointer px-3 py-1.5 bg-white border border-slate-300 rounded text-slate-700 hover:bg-slate-100 flex items-center font-medium">
                        <Image className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
                        Upload Company Logo (PNG / JPG)
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleLogoUpload(e, false)}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Theme Accent Color</label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="color"
                        value={certColor}
                        onChange={(e) => setCertColor(e.target.value)}
                        className="w-8 h-8 p-0 border border-slate-300 rounded cursor-pointer"
                      />
                      <span className="font-mono text-slate-600">{certColor}</span>
                    </div>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Font Family</label>
                    <select
                      value={certFont}
                      onChange={(e) => setCertFont(e.target.value as any)}
                      className="w-full px-3 py-1.5 border border-slate-300 bg-white rounded"
                    >
                      <option value="helvetica">Modern Sans (Helvetica)</option>
                      <option value="times">Formal Serif (Times Roman)</option>
                      <option value="courier">Technical Monospace (Courier)</option>
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Document Content (Use Placeholders: <code className="bg-slate-100 px-1 font-mono text-[10px]">&#123;&#123;EMPLOYEE_NAME&#125;&#125;</code>, <code className="bg-slate-100 px-1 font-mono text-[10px]">&#123;&#123;DESIGNATION&#125;&#125;</code>, <code className="bg-slate-100 px-1 font-mono text-[10px]">&#123;&#123;JOINING_DATE&#125;&#125;</code>) *
                </label>
                <textarea
                  required
                  rows={5}
                  value={certBody}
                  onChange={(e) => setCertBody(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 font-mono text-xs rounded"
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
                    className="w-full px-3 py-1.5 border border-slate-300 rounded"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Signatory Title</label>
                  <input
                    type="text"
                    value={signatoryTitle}
                    onChange={(e) => setSignatoryTitle(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded hover:bg-slate-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-900 text-white rounded font-semibold hover:bg-slate-800 shadow-sm"
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
