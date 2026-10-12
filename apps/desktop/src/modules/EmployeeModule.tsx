import React, { useState } from 'react';
import {
  Users,
  Search,
  Plus,
  Download,
  Upload,
  Filter,
  Eye,
  Trash2,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { Employee } from '../types/hr-types';
import { exportToCSV, parseCSVFile } from '../utils/export-helpers';

interface Props {
  employees: Employee[];
  setEmployees: React.Dispatch<React.SetStateAction<Employee[]>>;
  onAudit: (action: string, details: string) => void;
  userRole?: string;
}

export const EmployeeModule: React.FC<Props> = ({ employees, setEmployees, onAudit, userRole }) => {
  const canViewSensitiveHrData = !userRole || ['COMPANY_ADMIN', 'HR_MANAGER', 'PAYROLL_OFFICER'].includes(userRole);
  const [searchTerm, setSearchTerm] = useState('');
  const [deptFilter, setDeptFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedEmp, setSelectedEmp] = useState<Employee | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [notification, setNotification] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Form states
  const [empCode, setEmpCode] = useState(`EMP-00${employees.length + 1}`);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState('Male');
  const [dob, setDob] = useState('1995-01-01');
  const [nationalId, setNationalId] = useState('');
  const [dept, setDept] = useState('Engineering');
  const [designation, setDesignation] = useState('Software Engineer');
  const [branch, setBranch] = useState('Headquarters Karachi');
  const [empType, setEmpType] = useState<'PERMANENT' | 'CONTRACT' | 'PROBATIONARY' | 'INTERN'>('PERMANENT');
  const [joiningDate, setJoiningDate] = useState('2026-10-10');
  const [salary, setSalary] = useState('120000');
  const [bankName, setBankName] = useState('Standard Chartered');
  const [bankAccount, setBankAccount] = useState('');

  const showNotice = (text: string, type: 'success' | 'error' = 'success') => {
    setNotification({ text, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const filteredEmployees = employees.filter((emp) => {
    const matchesSearch =
      `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.employeeCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.department.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDept = deptFilter === 'ALL' || emp.department === deptFilter;
    const matchesStatus = statusFilter === 'ALL' || emp.status === statusFilter;
    return matchesSearch && matchesDept && matchesStatus;
  });

  const handleAddEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    if (employees.some((e) => e.employeeCode === empCode)) {
      showNotice(`Employee Code ${empCode} already exists. Duplicates forbidden.`, 'error');
      return;
    }
    const newEmp: Employee = {
      id: `emp-${Date.now()}`,
      employeeCode: empCode,
      firstName,
      lastName,
      email,
      phone,
      gender,
      dateOfBirth: dob,
      nationalId,
      department: dept,
      designation,
      branch,
      employmentType: empType,
      status: 'ACTIVE',
      joiningDate,
      baseSalary: parseFloat(salary) || 0,
      bankName,
      bankAccount,
    };

    setEmployees((prev) => [newEmp, ...prev]);
    onAudit('CREATE_EMPLOYEE', `Created employee ${empCode}: ${firstName} ${lastName} (${dept})`);
    showNotice(`Employee ${empCode} created and stored in local master registry.`);
    setShowAddModal(false);

    // Reset
    setEmpCode(`EMP-00${employees.length + 2}`);
    setFirstName('');
    setLastName('');
    setEmail('');
    setNationalId('');
  };

  const handleDeleteEmployee = (id: string, code: string) => {
    if (confirm(`Are you sure you want to deactivate and remove employee ${code}? Historical payroll snapshots will be preserved.`)) {
      setEmployees((prev) => prev.filter((e) => e.id !== id));
      onAudit('DEACTIVATE_EMPLOYEE', `Deactivated employee record ${code}`);
      showNotice(`Employee ${code} deactivated.`);
      if (selectedEmp?.id === id) setSelectedEmp(null);
    }
  };

  const handleCSVUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const parsed = await parseCSVFile<any>(file);
      let count = 0;
      const imported: Employee[] = [];

      for (const row of parsed) {
        if (!row.employeeCode || !row.firstName || !row.email) continue;
        if (employees.some((existing) => existing.employeeCode === row.employeeCode)) continue;

        imported.push({
          id: `emp-${Date.now()}-${count}`,
          employeeCode: row.employeeCode,
          firstName: row.firstName,
          lastName: row.lastName || '',
          email: row.email,
          phone: row.phone || '+92 300 0000000',
          gender: row.gender || 'Male',
          dateOfBirth: row.dateOfBirth || '1995-01-01',
          nationalId: row.nationalId || '42101-0000000-0',
          department: row.department || 'General',
          designation: row.designation || 'Staff',
          branch: row.branch || 'Headquarters Karachi',
          employmentType: 'PERMANENT',
          status: 'ACTIVE',
          joiningDate: row.joiningDate || '2026-10-10',
          baseSalary: parseFloat(row.baseSalary) || 75000,
          bankName: row.bankName || 'Meezan Bank',
          bankAccount: row.bankAccount || '',
        });
        count++;
      }

      if (imported.length > 0) {
        setEmployees((prev) => [...imported, ...prev]);
        onAudit('BULK_IMPORT_EMPLOYEES', `Bulk imported ${imported.length} employee records from file: ${file.name}`);
        showNotice(`Successfully imported ${imported.length} employee profiles from CSV.`);
      } else {
        showNotice('No valid new rows found or all employee codes were duplicates.', 'error');
      }
      setShowImportModal(false);
    } catch {
      showNotice('Failed to parse CSV file. Ensure valid headers are present.', 'error');
    }
  };

  const handleExportCSV = () => {
    exportToCSV(
      filteredEmployees.map((e) => ({
        employeeCode: e.employeeCode,
        fullName: `${e.firstName} ${e.lastName}`,
        email: e.email,
        phone: e.phone,
        department: e.department,
        designation: e.designation,
        branch: e.branch,
        employmentType: e.employmentType,
        status: e.status,
        joiningDate: e.joiningDate,
        baseSalary: e.baseSalary,
      })),
      'HR360_Employees_Directory'
    );
    onAudit('EXPORT_EMPLOYEES', `Exported ${filteredEmployees.length} employee records to CSV`);
    showNotice(`Exported ${filteredEmployees.length} employee records to CSV.`);
  };

  const departments = ['ALL', ...Array.from(new Set(employees.map((e) => e.department)))];

  return (
    <div className="space-y-4">
      {/* Notification Toast */}
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
          <button onClick={() => setNotification(null)} className="font-bold text-xs">✕</button>
        </div>
      )}

      {/* Header & Controls */}
      <div className="flex flex-wrap justify-between items-center gap-3 pb-3 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center">
            <Users className="w-5 h-5 mr-2 text-slate-800" />
            Employee Management & Directory
          </h1>
          <p className="text-xs text-slate-500">
            Total Records: {employees.length} | Filtered: {filteredEmployees.length} | All profiles stored in local infrastructure
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleExportCSV}
            className="px-3 py-1.5 border border-slate-300 bg-white text-slate-700 text-xs font-semibold rounded hover:bg-slate-50 flex items-center"
          >
            <Download className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
            Export CSV
          </button>
          <button
            onClick={() => setShowImportModal(true)}
            className="px-3 py-1.5 border border-slate-300 bg-white text-slate-700 text-xs font-semibold rounded hover:bg-slate-50 flex items-center"
          >
            <Upload className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
            Bulk CSV Import
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-3 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded hover:bg-slate-800 flex items-center"
          >
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            Add Employee
          </button>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="flex flex-wrap gap-3 bg-white p-3 border border-slate-200 shadow-sm text-xs">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by code, full name, email, or department..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 border border-slate-300 text-xs focus:outline-none focus:border-slate-800"
          />
        </div>

        <div className="flex items-center space-x-2">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <span className="font-semibold text-slate-600">Department:</span>
          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="border border-slate-300 px-2 py-1.5 text-xs bg-white focus:outline-none"
          >
            {departments.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center space-x-2">
          <span className="font-semibold text-slate-600">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-slate-300 px-2 py-1.5 text-xs bg-white focus:outline-none"
          >
            <option value="ALL">ALL</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="ON_LEAVE">ON_LEAVE</option>
            <option value="TERMINATED">TERMINATED</option>
          </select>
        </div>
      </div>

      {/* Employees Table */}
      <div className="bg-white border border-slate-200 shadow-sm overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 font-semibold">
            <tr>
              <th className="p-3">Code</th>
              <th className="p-3">Full Name</th>
              <th className="p-3">Department</th>
              <th className="p-3">Designation</th>
              <th className="p-3">Branch</th>
              <th className="p-3">Type</th>
              <th className="p-3">Base Salary</th>
              <th className="p-3">Status</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredEmployees.length === 0 ? (
              <tr>
                <td colSpan={9} className="p-6 text-center text-slate-400">
                  No employee profiles match the current search or filters.
                </td>
              </tr>
            ) : (
              filteredEmployees.map((emp) => (
                <tr key={emp.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="p-3 font-mono font-semibold text-slate-900">{emp.employeeCode}</td>
                  <td className="p-3 font-medium text-slate-900">
                    <div>{emp.firstName} {emp.lastName}</div>
                    <div className="text-[11px] text-slate-500 font-mono">{emp.email}</div>
                  </td>
                  <td className="p-3 text-slate-700">{emp.department}</td>
                  <td className="p-3 text-slate-700">{emp.designation}</td>
                  <td className="p-3 text-slate-600">{emp.branch}</td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[10px] font-medium border border-slate-200">
                      {emp.employmentType}
                    </span>
                  </td>
                  <td className="p-3 font-mono font-medium text-slate-900">
                    {canViewSensitiveHrData ? `PKR ${emp.baseSalary.toLocaleString('en-US')}` : '••••••••'}
                  </td>
                  <td className="p-3">
                    <span
                      className={`px-2 py-0.5 font-semibold text-[10px] ${
                        emp.status === 'ACTIVE'
                          ? 'bg-emerald-100 text-emerald-800'
                          : emp.status === 'ON_LEAVE'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {emp.status}
                    </span>
                  </td>
                  <td className="p-3 text-right space-x-1">
                    <button
                      onClick={() => setSelectedEmp(emp)}
                      className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] inline-flex items-center"
                      title="View Complete Profile"
                    >
                      <Eye className="w-3 h-3 mr-1" /> Profile
                    </button>
                    <button
                      onClick={() => handleDeleteEmployee(emp.id, emp.employeeCode)}
                      className="px-2 py-1 bg-red-50 hover:bg-red-100 text-red-700 rounded text-[11px] inline-flex items-center"
                      title="Deactivate Employee"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Profile Details Drawer / Modal */}
      {selectedEmp && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-300 shadow-2xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-3 border-b border-slate-200">
              <div>
                <h3 className="font-bold text-lg text-slate-900">
                  {selectedEmp.firstName} {selectedEmp.lastName}
                </h3>
                <p className="text-xs font-mono text-slate-500">ID: {selectedEmp.employeeCode} | {selectedEmp.designation}</p>
              </div>
              <button
                onClick={() => setSelectedEmp(null)}
                className="text-slate-400 hover:text-slate-700 font-bold text-lg"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 py-4 text-xs">
              <div>
                <span className="text-slate-500 block">Department & Branch:</span>
                <span className="font-semibold text-slate-800">{selectedEmp.department} — {selectedEmp.branch}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Email Address:</span>
                <span className="font-semibold text-slate-800">{selectedEmp.email}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Contact Phone:</span>
                <span className="font-semibold text-slate-800">{selectedEmp.phone}</span>
              </div>
              <div>
                <span className="text-slate-500 block">National ID (CNIC / Masked):</span>
                <span className="font-mono font-semibold text-slate-800">
                  {canViewSensitiveHrData
                    ? selectedEmp.nationalId
                    : selectedEmp.nationalId.length > 5
                    ? `${selectedEmp.nationalId.slice(0, 5)}-•••••••-${selectedEmp.nationalId.slice(-1)}`
                    : '•••••••••••••'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Date of Birth & Gender:</span>
                <span className="font-semibold text-slate-800">{selectedEmp.dateOfBirth} ({selectedEmp.gender})</span>
              </div>
              <div>
                <span className="text-slate-500 block">Date of Joining:</span>
                <span className="font-semibold text-slate-800">{selectedEmp.joiningDate}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Monthly Base Salary:</span>
                <span className="font-mono font-bold text-slate-900 text-sm">
                  {canViewSensitiveHrData ? `PKR ${selectedEmp.baseSalary.toLocaleString('en-US')}` : '•••••••• (Restricted)'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Corporate Bank Account:</span>
                <span className="font-mono text-slate-800">{selectedEmp.bankName} - {selectedEmp.bankAccount || 'None'}</span>
              </div>
              <div className="col-span-2">
                <span className="text-slate-500 block">Emergency Contact:</span>
                <span className="font-semibold text-slate-800">
                  {selectedEmp.emergencyContact || 'Not Specified'} ({selectedEmp.emergencyPhone || 'N/A'})
                </span>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setSelectedEmp(null)}
                className="px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded hover:bg-slate-800"
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Employee Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-300 shadow-2xl max-w-xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-3 border-b border-slate-200">
              <h3 className="font-bold text-base text-slate-900">Add Employee to Local Master DB</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-700 font-bold">✕</button>
            </div>

            <form onSubmit={handleAddEmployee} className="space-y-3 pt-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Employee ID / Code *</label>
                  <input
                    type="text"
                    required
                    value={empCode}
                    onChange={(e) => setEmpCode(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Employment Type *</label>
                  <select
                    value={empType}
                    onChange={(e) => setEmpType(e.target.value as any)}
                    className="w-full px-3 py-1.5 border border-slate-300 bg-white"
                  >
                    <option value="PERMANENT">Permanent</option>
                    <option value="PROBATIONARY">Probationary</option>
                    <option value="CONTRACT">Contract</option>
                    <option value="INTERN">Intern</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">First Name *</label>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Last Name *</label>
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Gender</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 bg-white"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Date of Birth</label>
                  <input
                    type="date"
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Official Email *</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Contact Phone</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300"
                    placeholder="+92 300 1234567"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Department *</label>
                  <input
                    type="text"
                    required
                    value={dept}
                    onChange={(e) => setDept(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Designation *</label>
                  <input
                    type="text"
                    required
                    value={designation}
                    onChange={(e) => setDesignation(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">National ID (CNIC) *</label>
                  <input
                    type="text"
                    required
                    value={nationalId}
                    onChange={(e) => setNationalId(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 font-mono"
                    placeholder="42101-1234567-1"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Base Monthly Salary (PKR) *</label>
                  <input
                    type="number"
                    required
                    value={salary}
                    onChange={(e) => setSalary(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Branch Location</label>
                  <input
                    type="text"
                    value={branch}
                    onChange={(e) => setBranch(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Joining Date</label>
                  <input
                    type="date"
                    value={joiningDate}
                    onChange={(e) => setJoiningDate(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Bank Name</label>
                  <input
                    type="text"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">IBAN / Bank Account</label>
                  <input
                    type="text"
                    value={bankAccount}
                    onChange={(e) => setBankAccount(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 font-mono"
                    placeholder="PK36SCBL0000001..."
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 text-xs font-semibold rounded hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded hover:bg-slate-800"
                >
                  Save Employee Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CSV Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-300 shadow-2xl max-w-md w-full p-6 text-xs">
            <div className="flex justify-between items-center pb-3 border-b border-slate-200">
              <h3 className="font-bold text-base text-slate-900">Bulk Employee CSV Import</h3>
              <button onClick={() => setShowImportModal(false)} className="text-slate-400 hover:text-slate-700 font-bold">✕</button>
            </div>
            <div className="py-4 space-y-3">
              <p className="text-slate-600">
                Upload a CSV spreadsheet containing: <code className="bg-slate-100 px-1 py-0.5 font-mono">employeeCode, firstName, lastName, email, department, designation, baseSalary</code>.
              </p>
              <div className="p-4 border-2 border-dashed border-slate-300 rounded text-center">
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleCSVUpload}
                  className="w-full text-xs text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-slate-900 file:text-white hover:file:bg-slate-800"
                />
              </div>
            </div>
            <div className="pt-3 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setShowImportModal(false)}
                className="px-4 py-2 border border-slate-300 text-slate-700 text-xs font-semibold rounded hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
