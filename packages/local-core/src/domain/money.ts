/**
 * Minor Units (Paisa) Money Precision Engine
 * 1 PKR = 100 Paisa (Integer Minor Unit)
 * Strictly eliminates floating point inaccuracies in payroll and billing.
 */
export class MoneyMinor {
  /**
   * Converts PKR decimal amount to minor unit (paisa integer)
   * Example: 125000.50 -> 12500050
   */
  public static fromPkr(amountPkr: number): number {
    return Math.round(amountPkr * 100);
  }

  /**
   * Converts minor unit (paisa) to PKR decimal float
   */
  public static toPkr(paisa: number): number {
    return paisa / 100;
  }

  /**
   * Formats paisa to standard formatted PKR display string
   * Example: 12500050 -> "PKR 125,000.50"
   */
  public static format(paisa: number): string {
    const pkr = this.toPkr(paisa);
    return `PKR ${pkr.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  /**
   * Performs integer division with rounding
   */
  public static divide(paisa: number, divisor: number): number {
    if (divisor === 0) return 0;
    return Math.round(paisa / divisor);
  }

  /**
   * Multiplies paisa by ratio with integer rounding
   */
  public static multiplyRatio(paisa: number, numerator: number, denominator: number): number {
    if (denominator === 0) return 0;
    return Math.round((paisa * numerator) / denominator);
  }
}
