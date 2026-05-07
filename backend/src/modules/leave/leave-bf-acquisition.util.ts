/** Burkina Faso — acquisition mensuelle des congés payés (PRD CONGES-BF-MVP-V1 §5.2). */

export type UtcDayInterval = { start: Date; end: Date };

const MS_PER_DAY = 86_400_000;

export function utcNoon(y: number, monthIndex: number, day: number): Date {
  return new Date(Date.UTC(y, monthIndex, day, 12, 0, 0));
}

export function utcDayKey(date: Date): number {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

export function normalizeUtcNoon(date: Date): Date {
  return utcNoon(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

export function inclusiveCalendarDaysBetween(start: Date, end: Date): number {
  const s = utcDayKey(start);
  const e = utcDayKey(end);
  if (e < s) {
    return 0;
  }
  return Math.floor((e - s) / MS_PER_DAY) + 1;
}

/** Arrondi au dixième supérieur (ex. 1.21 → 1.3, 1.20 → 1.2). */
export function ceilAcquisitionToTenth(value: number): number {
  const scaled = value * 10;
  const ceiled = Math.ceil(scaled - Number.EPSILON);
  return ceiled / 10;
}

export function computeBfMonthlyAcquisition(
  eligibleCalendarDays: number,
  daysInMonth: number,
  ratePerFullMonth = 2.5
): { raw: number; rounded: number } {
  if (daysInMonth <= 0 || eligibleCalendarDays <= 0) {
    return { raw: 0, rounded: 0 };
  }
  const raw = ratePerFullMonth * (eligibleCalendarDays / daysInMonth);
  return { raw, rounded: ceilAcquisitionToTenth(raw) };
}

export function monthUtcBounds(year: number, month: number): {
  monthStart: Date;
  monthEnd: Date;
  daysInMonth: number;
} {
  const monthStart = utcNoon(year, month - 1, 1);
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const monthEnd = utcNoon(year, month - 1, daysInMonth);
  return { monthStart, monthEnd, daysInMonth };
}

export function maxUtcDay(a: Date, b: Date): Date {
  return utcDayKey(a) >= utcDayKey(b) ? normalizeUtcNoon(a) : normalizeUtcNoon(b);
}

export function minUtcDay(a: Date, b: Date): Date {
  return utcDayKey(a) <= utcDayKey(b) ? normalizeUtcNoon(a) : normalizeUtcNoon(b);
}

export function clipIntervalToMonth(
  intervalStart: Date,
  intervalEnd: Date,
  monthStart: Date,
  monthEnd: Date
): UtcDayInterval | null {
  const start = maxUtcDay(intervalStart, monthStart);
  const end = minUtcDay(intervalEnd, monthEnd);
  if (utcDayKey(end) < utcDayKey(start)) {
    return null;
  }
  return { start, end };
}

export function mergeUtcIntervals(intervals: UtcDayInterval[]): UtcDayInterval[] {
  if (intervals.length === 0) {
    return [];
  }
  const sorted = [...intervals].sort((a, b) => utcDayKey(a.start) - utcDayKey(b.start));
  const merged: UtcDayInterval[] = [];
  let cur = { start: sorted[0].start, end: sorted[0].end };
  for (let i = 1; i < sorted.length; i++) {
    const next = sorted[i];
    if (utcDayKey(next.start) <= utcDayKey(cur.end) + MS_PER_DAY) {
      cur = {
        start: cur.start,
        end: utcDayKey(next.end) > utcDayKey(cur.end) ? next.end : cur.end
      };
    } else {
      merged.push(cur);
      cur = { start: next.start, end: next.end };
    }
  }
  merged.push(cur);
  return merged;
}

/** Contrats tenus : [{ startDate, endDate|null }] dans le tenant pour l’employé. */
export function eligibleCalendarDaysInMonthBf(params: {
  hireDate: Date;
  employmentLastInclusive?: Date;
  monthStart: Date;
  monthEnd: Date;
  contractSpans: { start: Date; endInclusive?: Date }[];
}): number {
  const hire = normalizeUtcNoon(params.hireDate);
  const hireKey = utcDayKey(hire);
  const monthEndKey = utcDayKey(params.monthEnd);
  if (hireKey > monthEndKey) {
    return 0;
  }

  let employmentEndKey = monthEndKey;
  if (params.employmentLastInclusive) {
    const empEnd = normalizeUtcNoon(params.employmentLastInclusive);
    employmentEndKey = utcDayKey(empEnd);
  }

  const empWindowStart = hireKey;
  const empWindowEnd = employmentEndKey;

  const clips: UtcDayInterval[] = [];

  if (params.contractSpans.length === 0) {
    const clip = clipIntervalToMonth(hire, utcNoon(3999, 11, 31), params.monthStart, params.monthEnd);
    if (clip) {
      clips.push(clip);
    }
  } else {
    for (const span of params.contractSpans) {
      const start = normalizeUtcNoon(span.start);
      const end =
        span.endInclusive !== undefined ? normalizeUtcNoon(span.endInclusive) : utcNoon(3999, 11, 31);
      const clip = clipIntervalToMonth(start, end, params.monthStart, params.monthEnd);
      if (clip) {
        clips.push(clip);
      }
    }
  }

  const merged = mergeUtcIntervals(clips);
  let total = 0;
  for (const iv of merged) {
    const ivStartKey = utcDayKey(iv.start);
    const ivEndKey = utcDayKey(iv.end);
    const effStartKey = Math.max(ivStartKey, empWindowStart);
    const effEndKey = Math.min(ivEndKey, empWindowEnd);
    if (effEndKey < effStartKey) {
      continue;
    }
    total += inclusiveCalendarDaysBetween(new Date(effStartKey), new Date(effEndKey));
  }
  return total;
}

/** Compte les jours ouvrés (lun–ven) entre deux dates inclusives (UTC date-only safe). */
export function countWorkingDaysInclusiveUtc(start: Date, end: Date): number {
  let count = 0;
  const cur = new Date(normalizeUtcNoon(start));
  const last = normalizeUtcNoon(end);
  while (utcDayKey(cur) <= utcDayKey(last)) {
    const dow = cur.getUTCDay();
    if (dow >= 1 && dow <= 5) {
      count++;
    }
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return count;
}
