import { MoneyMinor } from './money';

export interface LocalPayrollCalculationInput {
  baseSalaryMinor: number;
  allowancesMinor?: number;
  daysWorked: number;
  daysInMonth: number;
  taxRatePercent?: number; // Custom override if any
  customDeductionsMinor?: number;
  providentFundMinor?: number;
}

export interface LocalPayrollCalculationResult {
  grossPayMinor: number;
  daysWorked: number;
  daysInMonth: number;
  prorationRatio: number;
  annualTaxMinor: number;
  monthlyTaxMinor: number;
  eobiEmployeeMinor: number;
  eobiEmployerMinor: number;
  pessiEmployerMinor: number;
  providentFundMinor: number;
  totalDeductionsMinor: number;
  netPayMinor: number;
}

/**
 * Pure Pakistan Statutory Tax Engine (Minor Units / Paisa)
 * FBR Income Tax Slabs for Salaried Individuals (Tax Year 2025-2026/2026-2027)
 */
export function calculateAnnualIncomeTaxMinor(annualGrossMinor: number): number {
  const taxablePkr = MoneyMinor.toPkr(annualGrossMinor);

  if (taxablePkr <= 600000) {
    return 0;
  }

  let taxPkr = 0;
  if (taxablePkr <= 1200000) {
    taxPkr = (taxablePkr - 600000) * 0.05;
  } else if (taxablePkr <= 2200000) {
    taxPkr = 30000 + (taxablePkr - 1200000) * 0.15;
  } else if (taxablePkr <= 3200000) {
    taxPkr = 180000 + (taxablePkr - 2200000) * 0.25;
  } else if (taxablePkr <= 4100000) {
    taxPkr = 430000 + (taxablePkr - 3200000) * 0.30;
  } else {
    taxPkr = 700000 + (taxablePkr - 4100000) * 0.35;
  }

  return MoneyMinor.fromPkr(taxPkr);
}

/**
 * Pure Local Payroll Item Computation
 * Guarantees exact invariant: netPayMinor === grossPayMinor - totalDeductionsMinor
 */
export function computeLocalPayrollItem(input: LocalPayrollCalculationInput): LocalPayrollCalculationResult {
  const allowancesMinor = input.allowancesMinor ?? 0;
  const customDeductionsMinor = input.customDeductionsMinor ?? 0;
  const pfMinor = input.providentFundMinor ?? 0;

  // 1. Pro-rata calculation for joiners/leavers
  const daysInMonth = input.daysInMonth > 0 ? input.daysInMonth : 30;
  const daysWorked = Math.max(0, Math.min(daysInMonth, input.daysWorked));
  const prorationRatio = daysWorked / daysInMonth;

  const fullNominalGrossMinor = input.baseSalaryMinor + allowancesMinor;
  const grossPayMinor = MoneyMinor.multiplyRatio(fullNominalGrossMinor, daysWorked, daysInMonth);

  // 2. Annual Tax Projection & Monthly Tax
  let monthlyTaxMinor = 0;
  let annualTaxMinor = 0;

  if (input.taxRatePercent !== undefined && input.taxRatePercent > 0) {
    // Percentage override if specified
    const annualTaxableMinor = grossPayMinor * 12;
    annualTaxMinor = Math.round(annualTaxableMinor * (input.taxRatePercent / 100));
    monthlyTaxMinor = Math.round(annualTaxMinor / 12);
  } else {
    // Official FBR statutory tax bracket calculation
    const annualProjectedMinor = grossPayMinor * 12;
    annualTaxMinor = calculateAnnualIncomeTaxMinor(annualProjectedMinor);
    monthlyTaxMinor = Math.round(annualTaxMinor / 12);
  }

  // 3. Pakistan Statutory Social Contributions
  // EOBI (Employees' Old-Age Benefits Institution)
  // Employee pays 1% of minimum wage ceiling = PKR 130 (13,000 paisa)
  // Employer pays 5% of minimum wage ceiling = PKR 650 (65,000 paisa)
  const eobiEmployeeMinor = 13000;
  const eobiEmployerMinor = 65000;

  // PESSI (Punjab/Sindh Employees Social Security Institution) - Employer 6% (up to ceiling)
  const pessiEmployerMinor = 240000; // Standard nominal employer social security

  // 4. Total Employee Deductions & Net Pay
  const totalDeductionsMinor = monthlyTaxMinor + eobiEmployeeMinor + pfMinor + customDeductionsMinor;
  const netPayMinor = grossPayMinor - totalDeductionsMinor;

  return {
    grossPayMinor,
    daysWorked,
    daysInMonth,
    prorationRatio,
    annualTaxMinor,
    monthlyTaxMinor,
    eobiEmployeeMinor,
    eobiEmployerMinor,
    pessiEmployerMinor,
    providentFundMinor: pfMinor,
    totalDeductionsMinor,
    netPayMinor,
  };
}
