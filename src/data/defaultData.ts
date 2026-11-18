import { Habit, HabitCompletions, WeeklyTodosMap } from '../types/system';
import { getMondayIso, toIsoDate } from '../utils/calendar';

export const DEFAULT_MONTH_INDEX = new Date().getMonth();
export const DEFAULT_YEAR = 2026;
export const DEFAULT_WEEK_START = getMondayIso(toIsoDate(new Date()));

// Clean empty initial state — zero pre-filled habits, checkmarks, or tasks
export const INITIAL_HABITS: Habit[] = [];
export const INITIAL_COMPLETIONS: HabitCompletions = {};
export const INITIAL_WEEKLY_TODOS: WeeklyTodosMap = {};

// Optional starter habits the user can load manually with 0 checkmarks
export const STARTER_HABITS: Habit[] = [
  { id: 'h-wake-0500', name: 'Wake up at 05:00' },
  { id: 'h-gym', name: 'Gym' },
  { id: 'h-no-porn', name: 'No Porn' },
  { id: 'h-reading', name: 'Reading / Learning' },
  { id: 'h-day-planning', name: 'Day Planning' },
  { id: 'h-budget', name: 'Budget Tracking' },
  { id: 'h-project-work', name: 'Project Work' },
  { id: 'h-no-alcohol', name: 'No Alcohol' },
  { id: 'h-cold-shower', name: 'Cold Shower' },
  { id: 'h-social-detox', name: 'Social Media Detox' },
];

// Previous storage keys removed on load so any cached demo data is cleared
export const LEGACY_STORAGE_KEYS = [
  'system_active_tab_v1',
  'system_selected_month_v1',
  'system_selected_year_v1',
  'system_habits_v1',
  'system_completions_v1',
  'system_week_start_v1',
  'system_weekly_todos_v1',
] as const;
