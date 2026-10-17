import test from 'node:test';
import assert from 'node:assert/strict';
import {
  resolveStatutoryPack,
  calculateAnnualIncomeTaxExact,
  computeStatutoryPayroll,
  STATUTORY_PACK_TY_2024_2025,
  STATUTORY_PACK_TY_2025_2026,
  STATUTORY_PACK_TY_2026_2027,
} from './statutory/index.js';

test('Statutory Compliance & Precision Payroll Engine', async (t) => {
  await t.test('1. Versioned Statutory Rule Pack Resolution', () => {
    // July 2026 onwards -> Tax Year 2026-2027
    const packJuly2026 = resolveStatutoryPack(2026, 7);
    assert.equal(packJuly2026.taxYear, '2026-2027');

    // January 2026 -> Tax Year 2025-2026 (began July 2025)
    const packJan2026 = resolveStatutoryPack(2026, 1);
    assert.equal(packJan2026.taxYear, '2025-2026');

    // October 2024 -> Tax Year 2024-2025
    const packOct2024 = resolveStatutoryPack(2024, 10);
    assert.equal(packOct2024.taxYear, '2024-2025');
  });

  await t.test('2. Tax Bracket Calculation Parity (Pure Integer Paisa)', () => {
    // Under 600,000 PKR / yr (50,000/mo) -> 0 tax
    const annual500k = 50_000_000;
    assert.equal(calculateAnnualIncomeTaxExact(annual500k), 0);

    // Exact 600,000 PKR / yr -> 0 tax
    const annual600k = 60_000_000;
    assert.equal(calculateAnnualIncomeTaxExact(annual600k), 0);

    // Slab 1: PKR 1,200,000/yr (100,000/mo)
    // Tax = (1,200,000 - 600,000) * 5% = 30,000 PKR = 3,000,000 paisa
    const annual1200k = 120_000_000;
    assert.equal(calculateAnnualIncomeTaxExact(annual1200k), 3_000_000);

    // Slab 2: PKR 1,800,000/yr (150,000/mo)
    // Tax = 30,000 + (1,800,000 - 1,200,000) * 15% = 30,000 + 90,000 = 120,000 PKR = 12,000,000 paisa
    const annual1800k = 180_000_000;
    assert.equal(calculateAnnualIncomeTaxExact(annual1800k), 12_000_000);

    // Slab 3: PKR 3,000,000/yr (250,000/mo)
    // Tax = 180,000 + (3,000,000 - 2,200,000) * 25% = 180,000 + 200,000 = 380,000 PKR = 38,000,000 paisa
    const annual3000k = 300_000_000;
    assert.equal(calculateAnnualIncomeTaxExact(annual3000k), 38_000_000);
  });

  await t.test('3. EOBI & Provincial Social Security Accuracy', () => {
    // TY 2026-2027 EOBI: Minimum wage base 37,000 PKR (3,700,000 paisa)
    // Employee (1%) = 370 PKR (37,000 paisa)
    // Employer (5%) = 1,850 PKR (185,000 paisa)
    const resPunjab = computeStatutoryPayroll({
      baseSalaryMinor: 15_000_000, // 150,000 PKR
      year: 2026,
      month: 7,
      province: 'PUNJAB',
    });

    assert.equal(resPunjab.eobiEmployeeMinor, 37_000);
    assert.equal(resPunjab.eobiEmployerMinor, 185_000);
    // Punjab PESSI: 6% of wage ceiling (37,000 * 6% = 2,220 PKR = 222,000 paisa)
    assert.equal(resPunjab.socialSecurityEmployerMinor, 222_000);

    // Sindh SESSI: 5% of wage ceiling (37,000 * 5% = 1,850 PKR = 185,000 paisa)
    const resSindh = computeStatutoryPayroll({
      baseSalaryMinor: 15_000_000,
      year: 2026,
      month: 7,
      province: 'SINDH',
    });
    assert.equal(resSindh.socialSecurityEmployerMinor, 185_000);
  });

  await t.test('4. Invariant Property: netPay === grossPay - totalDeductions to the single paisa', () => {
    const salaries = [
      30_000_000,  // 300k
      15_000_000,  // 150k
      8_000_000,   // 80k
      5_000_000,   // 50k
      2_500_000,   // 25k (minimum wage bracket)
      100_000_000, // 1M (executive)
    ];

    for (const base of salaries) {
      for (let days = 1; days <= 30; days += 5) {
        const out = computeStatutoryPayroll({
          baseSalaryMinor: base,
          allowancesMinor: Math.round(base * 0.2),
          daysWorked: days,
          daysInMonth: 30,
          providentFundRate: 0.0833,
          year: 2026,
          month: 7,
        });

        // Strict mathematical invariant: Net must exactly equal Gross minus Deductions
        assert.equal(
          out.netPayMinor,
          out.grossPayMinor - out.totalDeductionsMinor,
          `Failed invariant for base: ${base}, days: ${days}`
        );
        // All outputs must be exact integers (no decimals/floats)
        assert.ok(Number.isInteger(out.netPayMinor), 'netPay must be integer minor unit');
        assert.ok(Number.isInteger(out.grossPayMinor), 'grossPay must be integer minor unit');
        assert.ok(Number.isInteger(out.totalDeductionsMinor), 'totalDeductions must be integer minor unit');
      }
    }
  });
});
