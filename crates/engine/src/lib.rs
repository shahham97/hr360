#![forbid(unsafe_code)]

use rust_decimal::Decimal;
use rust_decimal_macros::dec;
use serde::{Deserialize, Serialize};

// =============================================================================
// Attendance Reconciliation Engine (Section 8.2)
// Integer minutes, grace periods, overnight shifts, overtime, and half days
// =============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ShiftConfig {
    pub start_minute: i32,             // Minutes from midnight (e.g., 9:00 AM = 540)
    pub end_minute: i32,               // Minutes from midnight (e.g., 5:00 PM = 1020)
    pub grace_in_minutes: i32,         // e.g. 15
    pub grace_out_minutes: i32,        // e.g. 15
    pub full_day_target_minutes: i32,  // e.g. 480 (8 hours)
    pub half_day_threshold_minutes: i32, // e.g. 240 (4 hours)
    pub is_overnight: bool,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum AttendanceStatus {
    Present,
    Absent,
    HalfDay,
    OnLeave,
    RestDay,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReconciliationResult {
    pub work_minutes: i32,
    pub late_minutes: i32,
    pub early_exit_minutes: i32,
    pub overtime_minutes: i32,
    pub status: AttendanceStatus,
}

pub fn reconcile_attendance(
    first_in_minute: Option<i32>,
    last_out_minute: Option<i32>,
    shift: &ShiftConfig,
    is_on_leave: bool,
    is_rest_day: bool,
) -> ReconciliationResult {
    if is_on_leave {
        return ReconciliationResult {
            work_minutes: 0,
            late_minutes: 0,
            early_exit_minutes: 0,
            overtime_minutes: 0,
            status: AttendanceStatus::OnLeave,
        };
    }

    if is_rest_day {
        return ReconciliationResult {
            work_minutes: 0,
            late_minutes: 0,
            early_exit_minutes: 0,
            overtime_minutes: 0,
            status: AttendanceStatus::RestDay,
        };
    }

    let (in_min, out_min) = match (first_in_minute, last_out_minute) {
        (Some(i), Some(o)) => (i, o),
        _ => {
            return ReconciliationResult {
                work_minutes: 0,
                late_minutes: 0,
                early_exit_minutes: 0,
                overtime_minutes: 0,
                status: AttendanceStatus::Absent,
            };
        }
    };

    let total_worked = if shift.is_overnight && out_min < in_min {
        (1440 - in_min) + out_min
    } else {
        (out_min - in_min).max(0)
    };

    // Calculate late arrival
    let late_cutoff = shift.start_minute + shift.grace_in_minutes;
    let late_minutes = if in_min > late_cutoff {
        in_min - shift.start_minute
    } else {
        0
    };

    // Calculate early departure
    let early_exit_minutes = if out_min < (shift.end_minute - shift.grace_out_minutes) {
        shift.end_minute - out_min
    } else {
        0
    };

    // Calculate overtime
    let overtime_minutes = if total_worked > shift.full_day_target_minutes {
        total_worked - shift.full_day_target_minutes
    } else {
        0
    };

    // Determine status
    let status = if total_worked >= shift.full_day_target_minutes {
        AttendanceStatus::Present
    } else if total_worked >= shift.half_day_threshold_minutes {
        AttendanceStatus::HalfDay
    } else {
        AttendanceStatus::Absent
    };

    ReconciliationResult {
        work_minutes: total_worked,
        late_minutes,
        early_exit_minutes,
        overtime_minutes,
        status,
    }
}

// =============================================================================
// Deterministic Payroll Calculation Engine (Section 8.4)
// Exact Decimal(14,4) with zero floating point representation
// =============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TaxSlab {
    pub min_income: Decimal,
    pub max_income: Option<Decimal>,
    pub fixed_tax: Decimal,
    pub rate_percentage: Decimal,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PayrollInput {
    pub base_salary: Decimal,
    pub allowances: Decimal,
    pub days_worked: Decimal,
    pub days_in_month: Decimal,
    pub eobi_employee: Decimal,
    pub provident_fund_employee: Decimal,
    pub tax_slabs: Vec<TaxSlab>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PayrollResult {
    pub gross_pay: Decimal,
    pub income_tax: Decimal,
    pub total_deductions: Decimal,
    pub net_pay: Decimal,
}

pub fn calculate_payroll(input: &PayrollInput) -> PayrollResult {
    // Prorate gross pay by attendance days
    let proration_factor = if input.days_in_month > Decimal::ZERO {
        (input.days_worked / input.days_in_month).min(dec!(1.0))
    } else {
        dec!(1.0)
    };

    let full_gross = input.base_salary + input.allowances;
    let gross_pay = (full_gross * proration_factor).round_dp(4);

    // Annualized taxable income for slab calculation
    let annualized_income = gross_pay * dec!(12.0);
    let mut annual_tax = Decimal::ZERO;

    for slab in &input.tax_slabs {
        if annualized_income > slab.min_income {
            match slab.max_income {
                Some(max_inc) => {
                    let taxable_in_slab = annualized_income.min(max_inc) - slab.min_income;
                    annual_tax = slab.fixed_tax + (taxable_in_slab * slab.rate_percentage / dec!(100.0));
                }
                None => {
                    let taxable_above = annualized_income - slab.min_income;
                    annual_tax = slab.fixed_tax + (taxable_above * slab.rate_percentage / dec!(100.0));
                }
            }
        }
    }

    let income_tax = (annual_tax / dec!(12.0)).round_dp(4);
    let total_deductions = (income_tax + input.eobi_employee + input.provident_fund_employee).round_dp(4);
    let net_pay = (gross_pay - total_deductions).round_dp(4);

    PayrollResult {
        gross_pay,
        income_tax,
        total_deductions,
        net_pay,
    }
}

// =============================================================================
// Deterministic Candidate Scoring Engine (Section 8.5)
// FinalScore = Wh*Hard + Ws*Soft + We*Exp + Wd*Edu
// =============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScoringWeights {
    pub weight_hard: Decimal, // e.g. 0.40
    pub weight_soft: Decimal, // e.g. 0.20
    pub weight_exp: Decimal,  // e.g. 0.25
    pub weight_edu: Decimal,  // e.g. 0.15
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CandidateScores {
    pub hard_skills_ratio: Decimal,
    pub soft_skills_ratio: Decimal,
    pub experience_years: Decimal,
    pub target_experience_years: Decimal,
    pub education_tier: Decimal,
    pub target_education_tier: Decimal,
    pub is_knocked_out: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CandidateEvaluation {
    pub final_score: Decimal,
    pub is_knocked_out: bool,
}

pub fn evaluate_candidate(scores: &CandidateScores, weights: &ScoringWeights) -> CandidateEvaluation {
    if scores.is_knocked_out {
        return CandidateEvaluation {
            final_score: Decimal::ZERO,
            is_knocked_out: true,
        };
    }

    let exp_score = if scores.target_experience_years > Decimal::ZERO {
        (scores.experience_years / scores.target_experience_years).min(dec!(1.0))
    } else {
        dec!(1.0)
    };

    let edu_score = if scores.target_education_tier > Decimal::ZERO {
        (scores.education_tier / scores.target_education_tier).min(dec!(1.0))
    } else {
        dec!(1.0)
    };

    let hard = scores.hard_skills_ratio.min(dec!(1.0));
    let soft = scores.soft_skills_ratio.min(dec!(1.0));

    let weighted_score = (weights.weight_hard * hard)
        + (weights.weight_soft * soft)
        + (weights.weight_exp * exp_score)
        + (weights.weight_edu * edu_score);

    let final_score = (weighted_score * dec!(100.0)).round_dp(2);

    CandidateEvaluation {
        final_score,
        is_knocked_out: false,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_attendance_reconciliation_exactness() {
        let shift = ShiftConfig {
            start_minute: 540,  // 9:00 AM
            end_minute: 1020,   // 5:00 PM
            grace_in_minutes: 15,
            grace_out_minutes: 15,
            full_day_target_minutes: 480,
            half_day_threshold_minutes: 240,
            is_overnight: false,
        };

        // Normal full day
        let res = reconcile_attendance(Some(540), Some(1020), &shift, false, false);
        assert_eq!(res.status, AttendanceStatus::Present);
        assert_eq!(res.work_minutes, 480);
        assert_eq!(res.late_minutes, 0);

        // Late arrival (9:30 AM)
        let res_late = reconcile_attendance(Some(570), Some(1020), &shift, false, false);
        assert_eq!(res_late.late_minutes, 30);
    }

    #[test]
    fn test_payroll_exact_decimal_arithmetic() {
        let slabs = vec![
            TaxSlab {
                min_income: dec!(0.0),
                max_income: Some(dec!(600000.0)),
                fixed_tax: dec!(0.0),
                rate_percentage: dec!(0.0),
            },
            TaxSlab {
                min_income: dec!(600000.0),
                max_income: Some(dec!(1200000.0)),
                fixed_tax: dec!(0.0),
                rate_percentage: dec!(5.0),
            },
        ];

        let input = PayrollInput {
            base_salary: dec!(80000.0),
            allowances: dec!(20000.0),
            days_worked: dec!(30.0),
            days_in_month: dec!(30.0),
            eobi_employee: dec!(130.0),
            provident_fund_employee: dec!(0.0),
            tax_slabs: slabs,
        };

        let res = calculate_payroll(&input);
        assert_eq!(res.gross_pay, dec!(100000.0000));
        assert_eq!(res.gross_pay - res.total_deductions, res.net_pay);
    }
}
