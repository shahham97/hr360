export interface PunchRecordInput {
  employeeId: string;
  punchTimeIso: string;
  terminalId: string;
}

export interface AttendanceStatusEvaluation {
  status: 'ON_TIME' | 'LATE' | 'EARLY_DEPARTURE' | 'HALF_DAY';
  lateMinutes: number;
}

/**
 * Filters out duplicate biometric punches on the same terminal within a grace window (e.g. 120 seconds)
 */
export function deduplicatePunches<T extends PunchRecordInput>(
  punches: T[],
  graceWindowSeconds: number = 120
): T[] {
  const sorted = [...punches].sort(
    (a, b) => new Date(a.punchTimeIso).getTime() - new Date(b.punchTimeIso).getTime()
  );

  const deduplicated: T[] = [];
  const lastPunchMap = new Map<string, number>();

  for (const punch of sorted) {
    const timeMs = new Date(punch.punchTimeIso).getTime();
    const key = `${punch.employeeId}:${punch.terminalId}`;
    const lastTimeMs = lastPunchMap.get(key);

    if (lastTimeMs === undefined || (timeMs - lastTimeMs) >= graceWindowSeconds * 1000) {
      deduplicated.push(punch);
      lastPunchMap.set(key, timeMs);
    }
  }

  return deduplicated;
}

/**
 * Evaluates shift check-in time against scheduled start with grace period
 */
export function evaluateCheckIn(
  punchTimeIso: string,
  shiftStartHour: number = 9,
  shiftStartMinute: number = 0,
  graceMinutes: number = 15
): AttendanceStatusEvaluation {
  const punchDate = new Date(punchTimeIso);
  const scheduledMs = new Date(punchDate).setUTCHours(shiftStartHour, shiftStartMinute, 0, 0);
  const actualMs = punchDate.getTime();

  const diffMinutes = Math.floor((actualMs - scheduledMs) / (60 * 1000));

  if (diffMinutes <= graceMinutes) {
    return { status: 'ON_TIME', lateMinutes: 0 };
  }

  if (diffMinutes > 120) {
    return { status: 'HALF_DAY', lateMinutes: diffMinutes };
  }

  return { status: 'LATE', lateMinutes: diffMinutes };
}
