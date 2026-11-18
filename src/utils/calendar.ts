import { CalendarDaySlot, CalendarWeekGroup, WeekDayInfo } from '../types/system';

export const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

export const MONTH_SHORT_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

export const WEEKDAY_TINY = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'] as const;
export const WEEKDAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;
export const WEEKDAY_FULL = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
] as const;

export function makeMonthKey(year: number, monthIndex: number): string {
  const safeYear = clampYear(year);
  const mm = String(monthIndex + 1).padStart(2, '0');
  return `${safeYear}-${mm}`;
}

export function clampYear(year: number): number {
  if (!Number.isFinite(year)) return 2026;
  return Math.min(2099, Math.max(1970, Math.floor(year)));
}

export function getDaysInMonth(year: number, monthIndex: number): number {
  const safeYear = clampYear(year);
  return new Date(safeYear, monthIndex + 1, 0).getDate();
}

export function toIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parseIsoDate(iso: string): Date {
  const parts = iso.split('-').map(Number);
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) {
    return new Date(2026, 3, 6);
  }
  const [y, m, d] = parts;
  return new Date(y, m - 1, d);
}

/**
 * Builds Week 1 .. Week 5 (and Week 6 only when a month's final 1-2 days overflow slot 35)
 * with exact Monday-through-Sunday columns (Mo Tu We Th Fr Sa Su).
 */
export function buildMonthCalendarWeeks(year: number, monthIndex: number): CalendarWeekGroup[] {
  const safeYear = clampYear(year);
  const daysInMonth = getDaysInMonth(safeYear, monthIndex);
  const firstJsDay = new Date(safeYear, monthIndex, 1).getDay(); // 0 = Sun .. 6 = Sat
  const startOffset = (firstJsDay + 6) % 7; // 0 = Mo .. 6 = Su

  const totalSlotsNeeded = startOffset + daysInMonth;
  const numWeeks = Math.max(5, Math.ceil(totalSlotsNeeded / 7));

  const now = new Date();
  const todayYear = now.getFullYear();
  const todayMonth = now.getMonth();
  const todayDate = now.getDate();

  const weeks: CalendarWeekGroup[] = [];

  for (let w = 0; w < numWeeks; w++) {
    const days: CalendarDaySlot[] = [];
    for (let d = 0; d < 7; d++) {
      const slotIndex = w * 7 + d;
      const dayNumber = slotIndex - startOffset + 1;
      const validDay = dayNumber >= 1 && dayNumber <= daysInMonth ? dayNumber : null;
      const isToday =
        validDay !== null &&
        safeYear === todayYear &&
        monthIndex === todayMonth &&
        validDay === todayDate;

      days.push({
        weekNumber: w + 1,
        weekdayIndex: d,
        weekdayLabel: WEEKDAY_TINY[d],
        day: validDay,
        isToday,
        isWeekend: d >= 5,
      });
    }

    weeks.push({
      weekNumber: w + 1,
      label: `Week ${w + 1}`,
      days,
    });
  }

  return weeks;
}

/**
 * Given any ISO date, returns the Monday ISO date for that week (Monday-start convention).
 */
export function getMondayIso(iso: string): string {
  const date = parseIsoDate(iso);
  const jsDay = date.getDay(); // 0 = Sun .. 6 = Sat
  const diffToMonday = (jsDay + 6) % 7;
  date.setDate(date.getDate() - diffToMonday);
  return toIsoDate(date);
}

export function shiftIsoByDays(iso: string, deltaDays: number): string {
  const date = parseIsoDate(iso);
  date.setDate(date.getDate() + deltaDays);
  return toIsoDate(date);
}

/**
 * Given a week start ISO date, produces the 7 days (Monday through Sunday) with labels.
 */
export function buildWeekDays(weekStartIso: string): WeekDayInfo[] {
  const mondayIso = getMondayIso(weekStartIso);
  const monday = parseIsoDate(mondayIso);
  const todayIso = toIsoDate(new Date());

  return Array.from({ length: 7 }, (_, idx) => {
    const current = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + idx);
    const iso = toIsoDate(current);
    const monthShort = MONTH_SHORT_NAMES[current.getMonth()];
    const dayNum = current.getDate();
    const yearNum = current.getFullYear();

    return {
      isoDate: iso,
      shortName: WEEKDAY_SHORT[idx],
      fullName: WEEKDAY_FULL[idx],
      shortDateLabel: `${monthShort} ${dayNum}`,
      fullDateLabel: `${monthShort} ${dayNum}, ${yearNum}`,
      isToday: iso === todayIso,
    };
  });
}

export function formatPercent(value: number, decimals = 0): string {
  if (!Number.isFinite(value) || value <= 0) return '0%';
  if (value >= 100) return '100%';
  if (decimals === 0) {
    return `${Math.round(value)}%`;
  }
  const rounded = Number(value.toFixed(decimals));
  return `${rounded}%`;
}
