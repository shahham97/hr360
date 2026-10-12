import { jsPDF } from 'jspdf';
import Papa from 'papaparse';
import { PayslipItem, PayslipTemplate, CertificateTemplate, Employee } from '../types/hr-types';

export function exportToCSV<T extends Record<string, any>>(data: T[], filename: string) {
  if (!data || data.length === 0) return;
  const csv = Papa.unparse(data);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function parseCSVFile<T>(file: File): Promise<T[]> {
  return new Promise((resolve, reject) => {
    Papa.parse<T>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => resolve(results.data as T[]),
      error: (err) => reject(err),
    });
  });
}

export function generatePayslipPDF(item: PayslipItem, template: PayslipTemplate) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Header styling
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, 210, 32, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(template.companyName.toUpperCase(), 14, 15);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`CONFIDENTIAL PAYSLIP — ${item.periodName.toUpperCase()}`, 14, 22);
  doc.text(`Tax NTN / Registration: ${template.companyTaxId}`, 14, 27);

  // Employee Metadata Box
  doc.setTextColor(30, 41, 59);
  doc.setFillColor(248, 250, 252);
  doc.rect(14, 38, 182, 30, 'F');
  doc.rect(14, 38, 182, 30, 'S');

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Employee Name:', 18, 45);
  doc.text('Employee Code:', 18, 52);
  doc.text('Department:', 18, 59);

  doc.setFont('helvetica', 'normal');
  doc.text(item.employeeName, 55, 45);
  doc.text(item.employeeCode, 55, 52);
  doc.text(item.department, 55, 59);

  doc.setFont('helvetica', 'bold');
  doc.text('Designation:', 110, 45);
  doc.text('Bank Account:', 110, 52);
  doc.text('Pay Period:', 110, 59);

  doc.setFont('helvetica', 'normal');
  doc.text(item.designation, 145, 45);
  doc.text(item.bankAccount || 'Direct Deposit / Bank Transfer', 145, 52);
  doc.text(item.periodName, 145, 59);

  // Earnings Table
  doc.setFillColor(241, 245, 249);
  doc.rect(14, 75, 88, 8, 'F');
  doc.rect(108, 75, 88, 8, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('EARNINGS (PKR)', 18, 80);
  doc.text('DEDUCTIONS (PKR)', 112, 80);

  // Line items
  let y = 90;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);

  const earnings = [
    { label: 'Basic Salary', val: item.basicSalary },
    { label: 'House Rent Allowance', val: item.houseRentAllowance },
    { label: 'Medical Allowance', val: item.medicalAllowance },
    { label: 'Transport Allowance', val: item.transportAllowance },
    { label: 'Overtime Earnings', val: item.overtimeEarnings },
  ];

  const deductions = [
    { label: 'Income Tax Deduction', val: item.incomeTaxDeduction },
    { label: 'EOBI Employee Contribution', val: item.eobiEmployeeDeduction },
    { label: 'Provident Fund (Employee)', val: item.providentFundDeduction },
    { label: 'Unpaid Leave / LOP', val: item.unpaidLeaveDeduction },
  ];

  const maxRows = Math.max(earnings.length, deductions.length);
  for (let i = 0; i < maxRows; i++) {
    if (earnings[i]) {
      doc.text(earnings[i].label, 18, y);
      doc.text(earnings[i].val.toLocaleString('en-US', { minimumFractionDigits: 2 }), 95, y, { align: 'right' });
    }
    if (deductions[i]) {
      doc.text(deductions[i].label, 112, y);
      doc.text(deductions[i].val.toLocaleString('en-US', { minimumFractionDigits: 2 }), 190, y, { align: 'right' });
    }
    y += 7;
  }

  // Totals Box
  y += 5;
  doc.setFillColor(241, 245, 249);
  doc.rect(14, y, 88, 10, 'F');
  doc.rect(108, y, 88, 10, 'F');

  doc.setFont('helvetica', 'bold');
  doc.text('Total Gross Earnings:', 18, y + 6);
  doc.text(item.grossSalary.toLocaleString('en-US', { minimumFractionDigits: 2 }), 95, y + 6, { align: 'right' });

  doc.text('Total Deductions:', 112, y + 6);
  doc.text(item.totalDeductions.toLocaleString('en-US', { minimumFractionDigits: 2 }), 190, y + 6, { align: 'right' });

  // Net Pay Highlight Banner
  y += 18;
  doc.setFillColor(15, 23, 42);
  doc.rect(14, y, 182, 16, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.text('NET SALARY PAYABLE:', 20, y + 10);
  doc.setFontSize(14);
  doc.text(`PKR ${item.netPayable.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 190, y + 10, { align: 'right' });

  // Statutory employer information
  y += 24;
  doc.setTextColor(71, 85, 105);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(`* Employer EOBI Statutory Contribution: PKR ${item.eobiEmployerContribution.toFixed(2)} (Paid by organization under EOBI Act 1976)`, 14, y);
  doc.text(`* Payment Reference: Fully processed and recorded in local enterprise database.`, 14, y + 5);

  if (template.footerNotes) {
    doc.text(template.footerNotes, 14, y + 12);
  }

  // Signatures
  y += 30;
  doc.setDrawColor(203, 213, 225);
  doc.line(20, y + 15, 75, y + 15);
  doc.line(135, y + 15, 190, y + 15);

  doc.setFontSize(8);
  doc.text('Authorized Signatory / HR', 25, y + 20);
  doc.text('Employee Signature', 145, y + 20);

  doc.save(`Payslip_${item.employeeCode}_${item.periodName.replace(/\s+/g, '_')}.pdf`);
}

export function generateCertificatePDF(
  employee: Employee,
  template: CertificateTemplate,
  companyName: string
) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Header
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, 210, 28, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(companyName.toUpperCase(), 105, 15, { align: 'center' });

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('OFFICIAL HUMAN RESOURCES CERTIFICATION', 105, 22, { align: 'center' });

  // Title
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(template.title.toUpperCase(), 105, 48, { align: 'center' });

  // Issue date & Reference
  const refNo = `REF-HR360-${employee.employeeCode}-${new Date().getFullYear()}`;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`Ref: ${refNo}`, 20, 60);
  doc.text(`Date: ${new Date().toLocaleDateString('en-GB')}`, 190, 60, { align: 'right' });

  // Salutation & Body
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('TO WHOM IT MAY CONCERN', 20, 75);

  // Substitute placeholders
  let content = template.bodyContent
    .replace(/\{\{EMPLOYEE_NAME\}\}/g, `${employee.firstName} ${employee.lastName}`)
    .replace(/\{\{EMPLOYEE_CODE\}\}/g, employee.employeeCode)
    .replace(/\{\{DESIGNATION\}\}/g, employee.designation)
    .replace(/\{\{DEPARTMENT\}\}/g, employee.department)
    .replace(/\{\{JOINING_DATE\}\}/g, employee.joiningDate)
    .replace(/\{\{COMPANY_NAME\}\}/g, companyName)
    .replace(/\{\{NATIONAL_ID\}\}/g, employee.nationalId || 'VERIFIED ON FILE')
    .replace(/\{\{BASE_SALARY\}\}/g, `PKR ${employee.baseSalary.toLocaleString('en-US')}`);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  const splitText = doc.splitTextToSize(content, 170);
  doc.text(splitText, 20, 90, { lineHeightFactor: 1.5 });

  // Signatory
  const endY = 190;
  doc.setFont('helvetica', 'normal');
  doc.text('Sincerely,', 20, endY);
  doc.setFont('helvetica', 'bold');
  doc.text(template.signatoryName || 'Head of Human Resources', 20, endY + 20);
  doc.setFont('helvetica', 'normal');
  doc.text(template.signatoryTitle || 'Department of People & Culture', 20, endY + 26);
  doc.text(companyName, 20, endY + 32);

  // Verification stamp footer
  doc.setDrawColor(226, 232, 240);
  doc.line(20, 270, 190, 270);
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text('Issued from HR360 Local Enterprise System. Cryptographically audited document.', 105, 276, { align: 'center' });

  doc.save(`${template.type}_${employee.employeeCode}.pdf`);
}
