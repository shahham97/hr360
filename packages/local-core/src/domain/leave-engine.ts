export interface LeaveBalanceCheck {
  allocatedDays: number;
  usedDays: number;
  availableDays: number;
  requestedDays: number;
  canApprove: boolean;
  reason?: string;
}

export function validateLeaveDeduction(
  allocatedDays: number,
  usedDays: number,
  requestedDays: number
): LeaveBalanceCheck {
  const availableDays = Math.max(0, allocatedDays - usedDays);
  const canApprove = requestedDays <= availableDays;

  return {
    allocatedDays,
    usedDays,
    availableDays,
    requestedDays,
    canApprove,
    reason: canApprove ? undefined : `Requested leave (${requestedDays} days) exceeds available balance (${availableDays} days).`,
  };
}

export function calculateWorkingDaysBetween(startDateIso: string, endDateIso: string): number {
  const start = new Date(startDateIso);
  const end = new Date(endDateIso);
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) {
    return 0;
  }

  let count = 0;
  const cur = new Date(start);
  while (cur <= end) {
    const dayOfWeek = cur.getUTCDay();
    // Exclude Saturday (6) and Sunday (0) by default
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      count++;
    }
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return Math.max(1, count);
}
