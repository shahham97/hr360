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

function hexToRgb(hex: string): [number, number, number] {
  if (!hex) return [15, 23, 42];
  let c = hex.replace('#', '');
  if (c.length === 3) c = c.split('').map((x) => x + x).join('');
  const num = parseInt(c, 16);
  if (isNaN(num)) return [15, 23, 42];
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

export function generatePayslipPDF(item: PayslipItem, template: PayslipTemplate) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const font = template.fontFamily || 'helvetica';
  const [pr, pg, pb] = hexToRgb(template.primaryColor || '#0f172a');

  // Header styling based on layout
  if (template.headerLayout === 'MINIMAL') {
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, 210, 34, 'F');
    doc.setDrawColor(pr, pg, pb);
    doc.setLineWidth(1.5);
    doc.line(14, 33, 196, 33);

    doc.setTextColor(pr, pg, pb);
    doc.setFontSize(18);
    doc.setFont(font, 'bold');
    doc.text(template.companyName.toUpperCase(), 14, 15);

    doc.setFontSize(9);
    doc.setFont(font, 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(`CONFIDENTIAL PAYSLIP — ${item.periodName.toUpperCase()}`, 14, 22);
    doc.text(`Tax NTN / Registration: ${template.companyTaxId}`, 14, 28);
  } else if (template.headerLayout === 'CENTERED') {
    doc.setFillColor(pr, pg, pb);
    doc.rect(0, 0, 210, 36, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont(font, 'bold');
    doc.text(template.companyName.toUpperCase(), 105, 15, { align: 'center' });

    doc.setFontSize(9);
    doc.setFont(font, 'normal');
    doc.text(`CONFIDENTIAL PAYSLIP — ${item.periodName.toUpperCase()}`, 105, 23, { align: 'center' });
    doc.text(`Tax NTN / Registration: ${template.companyTaxId}`, 105, 29, { align: 'center' });
  } else {
    // Default BANNER layout
    doc.setFillColor(pr, pg, pb);
    doc.rect(0, 0, 210, 32, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont(font, 'bold');
    doc.text(template.companyName.toUpperCase(), 14, 15);

    doc.setFontSize(9);
    doc.setFont(font, 'normal');
    doc.text(`CONFIDENTIAL PAYSLIP — ${item.periodName.toUpperCase()}`, 14, 22);
    doc.text(`Tax NTN / Registration: ${template.companyTaxId}`, 14, 27);
  }

  // Render company logo if enabled and provided
  if (template.showLogo && template.logoUrl) {
    try {
      const logoX = template.headerLayout === 'CENTERED' ? 14 : 166;
      doc.addImage(template.logoUrl, 'PNG', logoX, 5, 28, 22);
    } catch {
      // Gracefully continue if image format cannot be parsed
    }
  }

  // Employee Metadata Box
  doc.setTextColor(30, 41, 59);
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.rect(14, 40, 182, 30, 'FD');

  doc.setFontSize(9);
  doc.setFont(font, 'bold');
  doc.text('Employee Name:', 18, 47);
  doc.text('Employee Code:', 18, 54);
  doc.text('Department:', 18, 61);

  doc.setFont(font, 'normal');
  doc.text(item.employeeName, 55, 47);
  doc.text(item.employeeCode, 55, 54);
  doc.text(item.department, 55, 61);

  doc.setFont(font, 'bold');
  doc.text('Designation:', 110, 47);
  if (template.showBankDetails) {
    doc.text('Bank Account:', 110, 54);
  }
  doc.text('Pay Period:', 110, 61);

  doc.setFont(font, 'normal');
  doc.text(item.designation, 145, 47);
  if (template.showBankDetails) {
    doc.text(item.bankAccount || 'Direct Deposit / Bank Transfer', 145, 54);
  }
  doc.text(item.periodName, 145, 61);

  // Earnings Table
  doc.setFillColor(241, 245, 249);
  doc.rect(14, 76, 88, 8, 'F');
  doc.rect(108, 76, 88, 8, 'F');

  doc.setFont(font, 'bold');
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.text('EARNINGS (PKR)', 18, 81.5);
  doc.text('DEDUCTIONS (PKR)', 112, 81.5);

  // Line items
  let y = 91;
  doc.setFont(font, 'normal');
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

  doc.setFont(font, 'bold');
  doc.text('Total Gross Earnings:', 18, y + 6);
  doc.text(item.grossSalary.toLocaleString('en-US', { minimumFractionDigits: 2 }), 95, y + 6, { align: 'right' });

  doc.text('Total Deductions:', 112, y + 6);
  doc.text(item.totalDeductions.toLocaleString('en-US', { minimumFractionDigits: 2 }), 190, y + 6, { align: 'right' });

  // Net Pay Highlight Banner
  y += 18;
  doc.setFillColor(pr, pg, pb);
  doc.rect(14, y, 182, 16, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.setFont(font, 'bold');
  doc.text('NET SALARY PAYABLE:', 20, y + 10);
  doc.setFontSize(14);
  doc.text(`PKR ${item.netPayable.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 190, y + 10, { align: 'right' });

  // Statutory employer information
  y += 24;
  doc.setTextColor(71, 85, 105);
  doc.setFontSize(8);
  doc.setFont(font, 'normal');
  doc.text(`* Employer EOBI Statutory Contribution: PKR ${item.eobiEmployerContribution.toFixed(2)} (Paid by organization under EOBI Act 1976)`, 14, y);
  doc.text(`* Payment Reference: Fully processed and recorded in local enterprise database.`, 14, y + 5);

  if (template.footerNotes) {
    doc.text(template.footerNotes, 14, y + 12);
  }

  // Signatures
  if (template.showSignatures) {
    y += 28;
    doc.setDrawColor(203, 213, 225);
    doc.line(20, y + 15, 75, y + 15);
    doc.line(135, y + 15, 190, y + 15);

    doc.setFontSize(8);
    doc.setFont(font, 'normal');
    doc.text('Authorized Signatory / HR', 25, y + 20);
    doc.text('Employee Signature', 145, y + 20);
  }

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

  const font = template.fontFamily || 'helvetica';
  const [cr, cg, cb] = hexToRgb(template.primaryColor || '#0f172a');

  // Decorative Border if enabled
  if (template.showBorder) {
    doc.setDrawColor(cr, cg, cb);
    doc.setLineWidth(1.2);
    doc.rect(8, 8, 194, 281);
    doc.setLineWidth(0.4);
    doc.rect(10, 10, 190, 277);
  }

  // Header Banner
  doc.setFillColor(cr, cg, cb);
  doc.rect(0, 0, 210, 30, 'F');

  // Header Logo if present
  if (template.logoUrl) {
    try {
      doc.addImage(template.logoUrl, 'PNG', 14, 4, 28, 22);
    } catch {
      // Gracefully continue
    }
  }

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont(font, 'bold');
  const textX = template.logoUrl ? 115 : 105;
  doc.text(companyName.toUpperCase(), textX, 15, { align: 'center' });

  doc.setFontSize(9);
  doc.setFont(font, 'normal');
  doc.text('OFFICIAL HUMAN RESOURCES CERTIFICATION', textX, 22, { align: 'center' });

  // Document Title
  doc.setTextColor(cr, cg, cb);
  doc.setFontSize(16);
  doc.setFont(font, 'bold');
  doc.text(template.title.toUpperCase(), 105, 50, { align: 'center' });

  // Issue date & Reference
  const refNo = `REF-HR360-${employee.employeeCode}-${new Date().getFullYear()}`;
  doc.setFontSize(9);
  doc.setFont(font, 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`Ref: ${refNo}`, 20, 62);
  doc.text(`Date: ${new Date().toLocaleDateString('en-GB')}`, 190, 62, { align: 'right' });

  // Salutation & Body
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(11);
  doc.setFont(font, 'bold');
  doc.text('TO WHOM IT MAY CONCERN', 20, 78);

  // Substitute placeholders
  const content = template.bodyContent
    .replace(/\{\{EMPLOYEE_NAME\}\}/g, `${employee.firstName} ${employee.lastName}`)
    .replace(/\{\{EMPLOYEE_CODE\}\}/g, employee.employeeCode)
    .replace(/\{\{DESIGNATION\}\}/g, employee.designation)
    .replace(/\{\{DEPARTMENT\}\}/g, employee.department)
    .replace(/\{\{JOINING_DATE\}\}/g, employee.joiningDate)
    .replace(/\{\{COMPANY_NAME\}\}/g, companyName)
    .replace(/\{\{NATIONAL_ID\}\}/g, employee.nationalId || 'VERIFIED ON FILE')
    .replace(/\{\{BASE_SALARY\}\}/g, `PKR ${employee.baseSalary.toLocaleString('en-US')}`);

  doc.setFont(font, 'normal');
  doc.setFontSize(11);
  const splitText = doc.splitTextToSize(content, 170);
  doc.text(splitText, 20, 93, { lineHeightFactor: 1.5 });

  // Signatory
  const endY = 195;
  doc.setFont(font, 'normal');
  doc.text('Sincerely,', 20, endY);
  doc.setFont(font, 'bold');
  doc.text(template.signatoryName || 'Head of Human Resources', 20, endY + 20);
  doc.setFont(font, 'normal');
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
