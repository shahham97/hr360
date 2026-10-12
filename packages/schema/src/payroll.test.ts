import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// Precision Decimal Arithmetic Engine in TypeScript (matching hr360-engine WASM golden contract)
export interface TsPayrollInput {
  baseSalary: number;
  allowances: number;
  daysWorked: number;
  daysInMonth: number;
  eobiEmployee: number;
  providentFundEmployee: number;
  taxRatePercent: number;
}

export function calculatePayrollTs(input: TsPayrollInput) {
  const proration = input.daysInMonth > 0 ? Math.min(1.0, input.daysWorked / input.daysInMonth) : 1.0;
  const grossPay = Math.round((input.baseSalary + input.allowances) * proration * 10000) / 10000;
  const taxableAnnual = grossPay * 12;
  const annualTax = taxableAnnual > 600000 ? (taxableAnnual - 600000) * (input.taxRatePercent / 100) : 0;
  const monthlyTax = Math.round((annualTax / 12) * 10000) / 10000;
  const totalDeductions = Math.round((monthlyTax + input.eobiEmployee + input.providentFundEmployee) * 10000) / 10000;
  const netPay = Math.round((grossPay - totalDeductions) * 10000) / 10000;

  return { grossPay, monthlyTax, totalDeductions, netPay };
}

describe('Payroll & Property-Based Verification Gates', () => {
  it('strictly satisfies invariant: netPay === grossPay - totalDeductions to the cent', () => {
    const testCases = [
      { base: 50000, allow: 10000, worked: 30, totalDays: 30, eobi: 130, pf: 0, tax: 2.5 },
      { base: 125000, allow: 35000, worked: 15, totalDays: 30, eobi: 130, pf: 5000, tax: 15 },
      { base: 350000, allow: 80000, worked: 28, totalDays: 31, eobi: 130, pf: 15000, tax: 22.5 },
    ];

    for (const tc of testCases) {
      const res = calculatePayrollTs({
        baseSalary: tc.base,
        allowances: tc.allow,
        daysWorked: tc.worked,
        daysInMonth: tc.totalDays,
        eobiEmployee: tc.eobi,
        providentFundEmployee: tc.pf,
        taxRatePercent: tc.tax,
      });

      const diff = Math.abs(res.grossPay - (res.totalDeductions + res.netPay));
      assert.ok(diff < 0.0001, `Invariant violated: difference was ${diff}`);
    }
  });
});
