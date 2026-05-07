import {
  ceilAcquisitionToTenth,
  computeBfMonthlyAcquisition,
  countWorkingDaysInclusiveUtc,
  eligibleCalendarDaysInMonthBf,
  inclusiveCalendarDaysBetween,
  mergeUtcIntervals,
  monthUtcBounds,
  utcNoon
} from "./leave-bf-acquisition.util";

describe("leave-bf-acquisition.util", () => {
  describe("ceilAcquisitionToTenth", () => {
    it("rounds 1.21 up to 1.3", () => {
      expect(ceilAcquisitionToTenth(1.21)).toBe(1.3);
    });

    it("keeps 1.20 as 1.2", () => {
      expect(ceilAcquisitionToTenth(1.2)).toBe(1.2);
    });
  });

  describe("computeBfMonthlyAcquisition", () => {
    it("full month yields rate", () => {
      const r = computeBfMonthlyAcquisition(31, 31, 2.5);
      expect(r.raw).toBeCloseTo(2.5, 5);
      expect(r.rounded).toBe(2.5);
    });

    it("PRD January entry on 16th (31-day month): ceil(2.5 * 16/31)", () => {
      const eligible = inclusiveCalendarDaysBetween(utcNoon(2026, 0, 16), utcNoon(2026, 0, 31));
      expect(eligible).toBe(16);
      const r = computeBfMonthlyAcquisition(16, 31, 2.5);
      expect(r.rounded).toBe(1.3);
    });

    it("PRD April exit on 10th (30-day month): ceil(2.5 * 10/30)", () => {
      const r = computeBfMonthlyAcquisition(10, 30, 2.5);
      expect(r.rounded).toBe(0.9);
    });

    it("February leap uses 29 days in month bounds", () => {
      const { daysInMonth } = monthUtcBounds(2024, 2);
      expect(daysInMonth).toBe(29);
      const r = computeBfMonthlyAcquisition(29, daysInMonth, 2.5);
      expect(r.rounded).toBe(2.5);
    });

    it("returns zero when no eligible days", () => {
      const r = computeBfMonthlyAcquisition(0, 31, 2.5);
      expect(r.rounded).toBe(0);
    });
  });

  describe("eligibleCalendarDaysInMonthBf", () => {
    it("counts full later month after hire mid-January (no contracts)", () => {
      const { monthStart, monthEnd, daysInMonth } = monthUtcBounds(2026, 2);
      expect(daysInMonth).toBe(28);
      const hireDate = utcNoon(2026, 0, 16);
      const eligible = eligibleCalendarDaysInMonthBf({
        hireDate,
        monthStart,
        monthEnd,
        contractSpans: []
      });
      expect(eligible).toBe(
        inclusiveCalendarDaysBetween(utcNoon(2026, 1, 1), utcNoon(2026, 1, 28))
      );
    });

    it("entry and exit same month counts inclusive span", () => {
      const { monthStart, monthEnd } = monthUtcBounds(2026, 5);
      const eligible = eligibleCalendarDaysInMonthBf({
        hireDate: utcNoon(2026, 4, 10),
        employmentLastInclusive: utcNoon(2026, 4, 20),
        monthStart,
        monthEnd,
        contractSpans: [{ start: utcNoon(2025, 0, 1), endInclusive: utcNoon(2027, 11, 31) }]
      });
      expect(eligible).toBe(11);
      const { rounded } = computeBfMonthlyAcquisition(eligible, 31, 2.5);
      expect(rounded).toBe(0.9);
    });
  });

  describe("mergeUtcIntervals", () => {
    it("merges overlapping intervals", () => {
      const m = mergeUtcIntervals([
        { start: utcNoon(2026, 0, 1), end: utcNoon(2026, 0, 10) },
        { start: utcNoon(2026, 0, 8), end: utcNoon(2026, 0, 15) }
      ]);
      expect(m).toHaveLength(1);
      expect(inclusiveCalendarDaysBetween(m[0].start, m[0].end)).toBe(15);
    });
  });

  describe("countWorkingDaysInclusiveUtc", () => {
    it("excludes weekends for a Mon–Fri block", () => {
      const start = utcNoon(2026, 5, 1);
      const end = utcNoon(2026, 5, 5);
      expect(countWorkingDaysInclusiveUtc(start, end)).toBe(5);
    });
  });
});
