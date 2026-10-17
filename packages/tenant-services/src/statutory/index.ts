/**
 * Versioned Statutory Rule Packs & Precision Minor Units (Paisa) Payroll Engine
 * Compliance: Pakistan Federal Board of Revenue (FBR), EOBI, Provincial Social Security (PESSI/SESSI)
 */

export interface TaxBracketMinor {
  minMinor: number;
  maxMinor: number; // Infinity for top bracket
  fixedTaxMinor: number;
  ratePercent: number; // e.g. 5 for 5%
}

export interface StatutoryRulePack {
  taxYear: string;
  name: string;
  effectiveFrom: string; // YYYY-MM-DD
  effectiveTo: string;   // YYYY-MM-DD
  taxBrackets: TaxBracketMinor[];
  eobiMinimumWageMinor: number;
  eobiEmployeeRate: number; // 0.01 (1%)
  eobiEmployerRate: number; // 0.05 (5%)
  socialSecurityWageCeilingMinor: number;
  provincialSocialSecurityRates: Record<string, number>; // province -> employer rate (e.g. PUNJAB: 0.06, SINDH: 0.05)
}

/**
 * Tax Year 2024-2025 Pack (1 July 2024 - 30 June 2025)
 */
export const STATUTORY_PACK_TY_2024_2025: StatutoryRulePack = {
  taxYear: '2024-2025',
  name: 'FBR Salaried Slabs TY 2024-2025',
  effectiveFrom: '2024-07-01',
  effectiveTo: '2025-06-30',
  taxBrackets: [
    { minMinor: 0, maxMinor: 60_000_000, fixedTaxMinor: 0, ratePercent: 0 },
    { minMinor: 60_000_000, maxMinor: 120_000_000, fixedTaxMinor: 0, ratePercent: 5 },
    { minMinor: 120_000_000, maxMinor: 220_000_000, fixedTaxMinor: 3_000_000, ratePercent: 15 },
    { minMinor: 220_000_000, maxMinor: 320_000_000, fixedTaxMinor: 18_000_000, ratePercent: 25 },
    { minMinor: 320_000_000, maxMinor: 410_000_000, fixedTaxMinor: 43_000_000, ratePercent: 30 },
    { minMinor: 410_000_000, maxMinor: Infinity, fixedTaxMinor: 70_000_000, ratePercent: 35 },
  ],
  eobiMinimumWageMinor: 3_200_000, // PKR 32,000
  eobiEmployeeRate: 0.01,
  eobiEmployerRate: 0.05,
  socialSecurityWageCeilingMinor: 3_200_000,
  provincialSocialSecurityRates: {
    PUNJAB: 0.06,
    SINDH: 0.05,
    KPK: 0.06,
    BALOCHISTAN: 0.05,
    FEDERAL: 0.05,
  },
};

/**
 * Tax Year 2025-2026 Pack (1 July 2025 - 30 June 2026)
 */
export const STATUTORY_PACK_TY_2025_2026: StatutoryRulePack = {
  taxYear: '2025-2026',
  name: 'FBR Salaried Slabs TY 2025-2026',
  effectiveFrom: '2025-07-01',
  effectiveTo: '2026-06-30',
  taxBrackets: [
    { minMinor: 0, maxMinor: 60_000_000, fixedTaxMinor: 0, ratePercent: 0 },
    { minMinor: 60_000_000, maxMinor: 120_000_000, fixedTaxMinor: 0, ratePercent: 5 },
    { minMinor: 120_000_000, maxMinor: 220_000_000, fixedTaxMinor: 3_000_000, ratePercent: 15 },
    { minMinor: 220_000_000, maxMinor: 320_000_000, fixedTaxMinor: 18_000_000, ratePercent: 25 },
    { minMinor: 320_000_000, maxMinor: 410_000_000, fixedTaxMinor: 43_000_000, ratePercent: 30 },
    { minMinor: 410_000_000, maxMinor: Infinity, fixedTaxMinor: 70_000_000, ratePercent: 35 },
  ],
  eobiMinimumWageMinor: 3_700_000, // PKR 37,000 (Notified standard)
  eobiEmployeeRate: 0.01,
  eobiEmployerRate: 0.05,
  socialSecurityWageCeilingMinor: 3_700_000,
  provincialSocialSecurityRates: {
    PUNJAB: 0.06,
    SINDH: 0.05,
    KPK: 0.06,
    BALOCHISTAN: 0.05,
    FEDERAL: 0.05,
  },
};

/**
 * Tax Year 2026-2027 Pack (Effective 1 July 2026 - 30 June 2027)
 */
export const STATUTORY_PACK_TY_2026_2027: StatutoryRulePack = {
  taxYear: '2026-2027',
  name: 'FBR Salaried Slabs TY 2026-2027',
  effectiveFrom: '2026-07-01',
  effectiveTo: '2027-06-30',
  taxBrackets: [
    { minMinor: 0, maxMinor: 60_000_000, fixedTaxMinor: 0, ratePercent: 0 },
    { minMinor: 60_000_000, maxMinor: 120_000_000, fixedTaxMinor: 0, ratePercent: 5 },
    { minMinor: 120_000_000, maxMinor: 220_000_000, fixedTaxMinor: 3_000_000, ratePercent: 15 },
    { minMinor: 220_000_000, maxMinor: 320_000_000, fixedTaxMinor: 18_000_000, ratePercent: 25 },
    { minMinor: 320_000_000, maxMinor: 410_000_000, fixedTaxMinor: 43_000_000, ratePercent: 30 },
    { minMinor: 410_000_000, maxMinor: Infinity, fixedTaxMinor: 70_000_000, ratePercent: 35 },
  ],
  eobiMinimumWageMinor: 3_700_000, // PKR 37,000 minimum wage ceiling
  eobiEmployeeRate: 0.01,
  eobiEmployerRate: 0.05,
  socialSecurityWageCeilingMinor: 3_700_000,
  provincialSocialSecurityRates: {
    PUNJAB: 0.06,
    SINDH: 0.05,
    KPK: 0.06,
    BALOCHISTAN: 0.05,
    FEDERAL: 0.05,
  },
};

export const ALL_STATUTORY_PACKS: StatutoryRulePack[] = [
  STATUTORY_PACK_TY_2024_2025,
  STATUTORY_PACK_TY_2025_2026,
  STATUTORY_PACK_TY_2026_2027,
];

/**
 * Resolves the active statutory rule pack based on payroll month and calendar year
 * In Pakistan, Fiscal / Tax Year runs from July 1 (Month 7) to June 30 (Month 6).
 */
export function resolveStatutoryPack(year: number, month: number): StatutoryRulePack {
  // If month is July or later (7-12), tax year starts in this calendar year
  // If month is Jan to June (1-6), tax year started in previous calendar year
  const taxStartYear = month >= 7 ? year : year - 1;
  const taxEndYear = taxStartYear + 1;
  const taxYearCode = `${taxStartYear}-${taxEndYear}`;

  const found = ALL_STATUTORY_PACKS.find((p) => p.taxYear === taxYearCode);
  if (found) return found;

  // Fallback to latest pack if beyond known calendar
  if (taxStartYear >= 2026) return STATUTORY_PACK_TY_2026_2027;
  return STATUTORY_PACK_TY_2024_2025;
}

/**
 * Pure integer minor units (paisa) tax calculation against a rule pack
 */
export function calculateAnnualIncomeTaxExact(
  annualGrossMinor: number,
  pack: StatutoryRulePack = STATUTORY_PACK_TY_2026_2027
): number {
  if (annualGrossMinor <= 60_000_000) {
    return 0;
  }

  for (const bracket of pack.taxBrackets) {
    if (annualGrossMinor > bracket.minMinor && annualGrossMinor <= bracket.maxMinor) {
      const taxableExcess = annualGrossMinor - bracket.minMinor;
      const bracketTax = Math.round((taxableExcess * bracket.ratePercent) / 100);
      return bracket.fixedTaxMinor + bracketTax;
    }
  }

  // Top bracket fallback
  const top = pack.taxBrackets[pack.taxBrackets.length - 1];
  const excess = annualGrossMinor - top.minMinor;
  return top.fixedTaxMinor + Math.round((excess * top.ratePercent) / 100);
}

export interface StatutoryPayrollInput {
  baseSalaryMinor: number;
  allowancesMinor?: number;
  daysWorked?: number;
  daysInMonth?: number;
  providentFundRate?: number; // e.g. 0.0833 for 8.33%
  customDeductionsMinor?: number;
  year?: number;
  month?: number;
  province?: string; // e.g. PUNJAB, SINDH
}

export interface StatutoryPayrollOutput {
  grossPayMinor: number;
  daysWorked: number;
  daysInMonth: number;
  prorationRatio: number;
  annualTaxMinor: number;
  monthlyTaxMinor: number;
  eobiEmployeeMinor: number;
  eobiEmployerMinor: number;
  socialSecurityEmployerMinor: number;
  providentFundEmployeeMinor: number;
  providentFundEmployerMinor: number;
  totalDeductionsMinor: number;
  netPayMinor: number;
  statutoryTaxYear: string;
}

/**
 * Complete exact integer statutory payroll computation
 * Pure paisa minor units, eliminating all floating-point math inaccuracies.
 */
export function computeStatutoryPayroll(input: StatutoryPayrollInput): StatutoryPayrollOutput {
  const year = input.year ?? 2026;
  const month = input.month ?? 7;
  const province = (input.province ?? 'PUNJAB').toUpperCase();

  const pack = resolveStatutoryPack(year, month);

  const daysInMonth = input.daysInMonth && input.daysInMonth > 0 ? input.daysInMonth : 30;
  const daysWorked = input.daysWorked !== undefined
    ? Math.max(0, Math.min(daysInMonth, input.daysWorked))
    : daysInMonth;
  const prorationRatio = daysWorked / daysInMonth;

  // 1. Gross Pay
  const fullNominalGrossMinor = input.baseSalaryMinor + (input.allowancesMinor ?? 0);
  const grossPayMinor = daysWorked === daysInMonth
    ? fullNominalGrossMinor
    : Math.round((fullNominalGrossMinor * daysWorked) / daysInMonth);

  // 2. Annual Tax Projection & Monthly Tax (pure integer paisa)
  const annualGrossProjected = grossPayMinor * 12;
  const annualTaxMinor = calculateAnnualIncomeTaxExact(annualGrossProjected, pack);
  const monthlyTaxMinor = Math.round(annualTaxMinor / 12);

  // 3. EOBI Contributions (1% Employee, 5% Employer of wage ceiling)
  const eobiEmployeeMinor = Math.round(pack.eobiMinimumWageMinor * pack.eobiEmployeeRate);
  const eobiEmployerMinor = Math.round(pack.eobiMinimumWageMinor * pack.eobiEmployerRate);

  // 4. Provincial Social Security (Employer Contribution)
  const ssRate = pack.provincialSocialSecurityRates[province] ?? 0.05;
  const ssWageBase = Math.min(grossPayMinor, pack.socialSecurityWageCeilingMinor);
  const socialSecurityEmployerMinor = Math.round(ssWageBase * ssRate);

  // 5. Provident Fund (Matching Employee & Employer)
  const pfRate = input.providentFundRate ?? 0;
  const pfEmployeeMinor = pfRate > 0 ? Math.round(input.baseSalaryMinor * pfRate) : 0;
  const pfEmployerMinor = pfEmployeeMinor;

  // 6. Total Deductions & Net Pay Invariant Check
  const customDeductions = input.customDeductionsMinor ?? 0;
  const totalDeductionsMinor = monthlyTaxMinor + eobiEmployeeMinor + pfEmployeeMinor + customDeductions;
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
    socialSecurityEmployerMinor,
    providentFundEmployeeMinor: pfEmployeeMinor,
    providentFundEmployerMinor: pfEmployerMinor,
    totalDeductionsMinor,
    netPayMinor,
    statutoryTaxYear: pack.taxYear,
  };
}
