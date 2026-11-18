export type ActiveTab = 'tracker' | 'analytics' | 'weekly';

export interface Habit {
  id: string;
  name: string;
}

/**
 * Stores checked state per month key ("YYYY-MM") -> habitId -> array of checked day numbers (1..31).
 * Compact, human-readable, and effortless to serialize in localStorage.
 */
export type HabitCompletions = Record<string, Record<string, number[]>>;

export interface CalendarDaySlot {
  weekNumber: number; // 1..5 (or 6 if a 31-day month starts late in the week)
  weekdayIndex: number; // 0 = Mo .. 6 = Su
  weekdayLabel: string; // 'Mo' | 'Tu' | 'We' | 'Th' | 'Fr' | 'Sa' | 'Su'
  day: number | null; // 1..daysInMonth, or null if padding slot outside selected month
  isToday: boolean;
  isWeekend: boolean;
}

export interface CalendarWeekGroup {
  weekNumber: number;
  label: string; // "Week 1" .. "Week 5"
  days: CalendarDaySlot[];
}

export interface HabitStat {
  id: string;
  name: string;
  goal: number;
  count: number;
  percentage: number; // 0..100
}

export interface TodoTask {
  id: string;
  text: string;
  completed: boolean;
}

/**
 * Keyed by ISO date string "YYYY-MM-DD" -> ordered list of TodoTask items.
 */
export type WeeklyTodosMap = Record<string, TodoTask[]>;

export interface WeekDayInfo {
  isoDate: string; // "YYYY-MM-DD"
  shortName: string; // "Mon" .. "Sun"
  fullName: string; // "Monday" .. "Sunday"
  shortDateLabel: string; // "Apr 6"
  fullDateLabel: string; // "Apr 6, 2026"
  isToday: boolean;
}
