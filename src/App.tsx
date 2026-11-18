import { useMemo, useCallback, useEffect, useState, useRef } from 'react';
import { X } from 'lucide-react';
import {
  ActiveTab,
  Habit,
  HabitCompletions,
  WeeklyTodosMap,
} from './types/system';
import {
  DEFAULT_MONTH_INDEX,
  DEFAULT_WEEK_START,
  DEFAULT_YEAR,
  INITIAL_COMPLETIONS,
  INITIAL_HABITS,
  INITIAL_WEEKLY_TODOS,
  LEGACY_STORAGE_KEYS,
  STARTER_HABITS,
} from './data/defaultData';
import { useLocalStorage } from './hooks/useLocalStorage';
import {
  MONTH_SHORT_NAMES,
  clampYear,
  getDaysInMonth,
  getMondayIso,
  makeMonthKey,
} from './utils/calendar';
import { Navbar } from './components/Navbar';
import { HabitTrackerView } from './components/HabitTrackerView';
import { AnalyticsView } from './components/AnalyticsView';
import { WeeklyTodosView } from './components/WeeklyTodosView';

function createId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function purgeLegacyStorage() {
  if (typeof window === 'undefined') return;
  try {
    for (const key of LEGACY_STORAGE_KEYS) {
      window.localStorage.removeItem(key);
    }
  } catch {
    // Ignore storage access errors in restricted environments
  }
}

// Immediately wipe any cached v1 demo data before reading state
purgeLegacyStorage();

export function App() {
  useEffect(() => {
    purgeLegacyStorage();
  }, []);

  const [activeTab, setActiveTab] = useLocalStorage<ActiveTab>(
    'system_active_tab_v2',
    'tracker'
  );
  const [selectedMonth, setSelectedMonth] = useLocalStorage<number>(
    'system_selected_month_v2',
    DEFAULT_MONTH_INDEX
  );
  const [selectedYear, setSelectedYear] = useLocalStorage<number>(
    'system_selected_year_v2',
    DEFAULT_YEAR
  );
  const [habits, setHabits] = useLocalStorage<Habit[]>(
    'system_habits_v2',
    INITIAL_HABITS
  );
  const [completions, setCompletions] = useLocalStorage<HabitCompletions>(
    'system_completions_v2',
    INITIAL_COMPLETIONS
  );
  const [weekStartIso, setWeekStartIso] = useLocalStorage<string>(
    'system_week_start_v2',
    DEFAULT_WEEK_START
  );
  const [weeklyTodos, setWeeklyTodos] = useLocalStorage<WeeklyTodosMap>(
    'system_weekly_todos_v2',
    INITIAL_WEEKLY_TODOS
  );

  // Brief confirmation toast when clearing data
  const [statusNotice, setStatusNotice] = useState<string | null>(null);
  const noticeTimerRef = useRef<number | null>(null);

  const showNotice = useCallback((message: string) => {
    setStatusNotice(message);
    if (noticeTimerRef.current) window.clearTimeout(noticeTimerRef.current);
    noticeTimerRef.current = window.setTimeout(() => {
      setStatusNotice(null);
    }, 3500);
  }, []);

  useEffect(() => {
    return () => {
      if (noticeTimerRef.current) window.clearTimeout(noticeTimerRef.current);
    };
  }, []);

  const safeMonth =
    selectedMonth >= 0 && selectedMonth <= 11 ? selectedMonth : DEFAULT_MONTH_INDEX;
  const safeYear = clampYear(selectedYear);
  const monthKey = useMemo(() => makeMonthKey(safeYear, safeMonth), [safeYear, safeMonth]);
  const monthCompletions = useMemo(
    () => completions[monthKey] || {},
    [completions, monthKey]
  );

  // Detect whether any checkmarks/tasks or habits currently exist
  const hasAnyEntries = useMemo(() => {
    const hasChecks = Object.values(completions).some((monthMap) =>
      Object.values(monthMap).some((days) => days.length > 0)
    );
    if (hasChecks) return true;
    return Object.values(weeklyTodos).some((tasks) => tasks.length > 0);
  }, [completions, weeklyTodos]);

  const hasAnyData = habits.length > 0 || hasAnyEntries;

  // Header live progress summary for selected month
  const headerStats = useMemo(() => {
    const daysInMonth = getDaysInMonth(safeYear, safeMonth);
    const totalPossible = habits.length * daysInMonth;
    let totalCompleted = 0;

    for (const habit of habits) {
      const days = monthCompletions[habit.id];
      if (!days || days.length === 0) continue;
      const validSet = new Set(days.filter((d) => d >= 1 && d <= daysInMonth));
      totalCompleted += validSet.size;
    }

    const overallPercentage =
      totalPossible > 0 ? (totalCompleted / totalPossible) * 100 : 0;

    return {
      totalCompleted,
      totalPossible,
      overallPercentage,
      monthLabel: `${MONTH_SHORT_NAMES[safeMonth]} ${safeYear}`,
    };
  }, [habits, monthCompletions, safeMonth, safeYear]);

  // --- Habit Handlers ---
  const handleToggleHabitDay = useCallback(
    (habitId: string, day: number) => {
      setCompletions((prev) => {
        const currentMonth = prev[monthKey] || {};
        const currentDays = currentMonth[habitId] || [];
        const exists = currentDays.includes(day);
        const nextDays = exists
          ? currentDays.filter((d) => d !== day)
          : [...currentDays, day].sort((a, b) => a - b);

        return {
          ...prev,
          [monthKey]: {
            ...currentMonth,
            [habitId]: nextDays,
          },
        };
      });
    },
    [monthKey, setCompletions]
  );

  const handleAddHabit = useCallback(
    (name: string) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      const newHabit: Habit = {
        id: createId('h'),
        name: trimmed,
      };
      setHabits((prev) => [...prev, newHabit]);
    },
    [setHabits]
  );

  const handleEditHabit = useCallback(
    (habitId: string, newName: string) => {
      const trimmed = newName.trim();
      if (!trimmed) return;
      setHabits((prev) =>
        prev.map((h) => (h.id === habitId ? { ...h, name: trimmed } : h))
      );
    },
    [setHabits]
  );

  const handleDeleteHabit = useCallback(
    (habitId: string) => {
      setHabits((prev) => prev.filter((h) => h.id !== habitId));
      setCompletions((prev) => {
        const next: HabitCompletions = {};
        for (const [mKey, monthMap] of Object.entries(prev)) {
          if (habitId in monthMap) {
            const copy = { ...monthMap };
            delete copy[habitId];
            if (Object.keys(copy).length > 0) {
              next[mKey] = copy;
            }
          } else {
            next[mKey] = monthMap;
          }
        }
        return next;
      });
    },
    [setHabits, setCompletions]
  );

  const handleRestoreHabit = useCallback(
    (habit: Habit, index: number, checkedDays: number[]) => {
      setHabits((prev) => {
        if (prev.some((h) => h.id === habit.id)) return prev;
        const copy = [...prev];
        const insertAt = Math.min(Math.max(0, index), copy.length);
        copy.splice(insertAt, 0, habit);
        return copy;
      });
      if (checkedDays.length > 0) {
        setCompletions((prev) => ({
          ...prev,
          [monthKey]: {
            ...(prev[monthKey] || {}),
            [habit.id]: checkedDays,
          },
        }));
      }
    },
    [monthKey, setHabits, setCompletions]
  );

  const handleClearMonth = useCallback(() => {
    setCompletions((prev) => {
      const next = { ...prev };
      delete next[monthKey];
      return next;
    });
    showNotice('Cleared checkmarks for this month');
  }, [monthKey, setCompletions, showNotice]);

  const handleLoadStarterHabits = useCallback(() => {
    setHabits(STARTER_HABITS);
  }, [setHabits]);

  // --- Weekly To-Do Handlers ---
  const handleChangeWeekStart = useCallback(
    (newIso: string) => {
      setWeekStartIso(getMondayIso(newIso));
    },
    [setWeekStartIso]
  );

  const handleAddTask = useCallback(
    (isoDate: string, text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      setWeeklyTodos((prev) => {
        const list = prev[isoDate] || [];
        return {
          ...prev,
          [isoDate]: [
            ...list,
            {
              id: createId('t'),
              text: trimmed,
              completed: false,
            },
          ],
        };
      });
    },
    [setWeeklyTodos]
  );

  const handleToggleTask = useCallback(
    (isoDate: string, taskId: string) => {
      setWeeklyTodos((prev) => {
        const list = prev[isoDate] || [];
        return {
          ...prev,
          [isoDate]: list.map((t) =>
            t.id === taskId ? { ...t, completed: !t.completed } : t
          ),
        };
      });
    },
    [setWeeklyTodos]
  );

  const handleEditTask = useCallback(
    (isoDate: string, taskId: string, newText: string) => {
      const trimmed = newText.trim();
      if (!trimmed) return;
      setWeeklyTodos((prev) => {
        const list = prev[isoDate] || [];
        return {
          ...prev,
          [isoDate]: list.map((t) =>
            t.id === taskId ? { ...t, text: trimmed } : t
          ),
        };
      });
    },
    [setWeeklyTodos]
  );

  const handleDeleteTask = useCallback(
    (isoDate: string, taskId: string) => {
      setWeeklyTodos((prev) => {
        const list = (prev[isoDate] || []).filter((t) => t.id !== taskId);
        const next = { ...prev };
        if (list.length === 0) {
          delete next[isoDate];
        } else {
          next[isoDate] = list;
        }
        return next;
      });
    },
    [setWeeklyTodos]
  );

  const handleClearWeek = useCallback(
    (isoDates: string[]) => {
      setWeeklyTodos((prev) => {
        const next = { ...prev };
        for (const iso of isoDates) {
          delete next[iso];
        }
        return next;
      });
      showNotice('Cleared tasks for this week');
    },
    [setWeeklyTodos, showNotice]
  );

  // --- Global Clear Data Handlers ---
  const handleClearEntriesOnly = useCallback(() => {
    setCompletions({});
    setWeeklyTodos({});
    showNotice('All checkmarks and weekly tasks cleared');
  }, [setCompletions, setWeeklyTodos, showNotice]);

  const handleClearAllData = useCallback(() => {
    setHabits([]);
    setCompletions({});
    setWeeklyTodos({});
    purgeLegacyStorage();
    showNotice('All data cleared');
  }, [setHabits, setCompletions, setWeeklyTodos, showNotice]);

  return (
    <div className="min-h-screen bg-white text-neutral-950">
      <Navbar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        totalCompleted={headerStats.totalCompleted}
        totalPossible={headerStats.totalPossible}
        overallPercentage={headerStats.overallPercentage}
        monthLabel={headerStats.monthLabel}
        hasAnyData={hasAnyData}
        hasAnyEntries={hasAnyEntries}
        onClearEntriesOnly={handleClearEntriesOnly}
        onClearAllData={handleClearAllData}
      />

      <main className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        {activeTab === 'tracker' && (
          <HabitTrackerView
            habits={habits}
            selectedMonth={safeMonth}
            selectedYear={safeYear}
            monthCompletions={monthCompletions}
            onChangeMonth={setSelectedMonth}
            onChangeYear={setSelectedYear}
            onToggleHabitDay={handleToggleHabitDay}
            onAddHabit={handleAddHabit}
            onEditHabit={handleEditHabit}
            onDeleteHabit={handleDeleteHabit}
            onRestoreHabit={handleRestoreHabit}
            onClearMonth={handleClearMonth}
            onRestoreDefaults={handleLoadStarterHabits}
          />
        )}

        {activeTab === 'analytics' && (
          <AnalyticsView
            habits={habits}
            selectedMonth={safeMonth}
            selectedYear={safeYear}
            monthCompletions={monthCompletions}
            onChangeMonth={setSelectedMonth}
            onChangeYear={setSelectedYear}
            onGoToTracker={() => setActiveTab('tracker')}
          />
        )}

        {activeTab === 'weekly' && (
          <WeeklyTodosView
            weekStartIso={weekStartIso}
            weeklyTodos={weeklyTodos}
            onChangeWeekStart={handleChangeWeekStart}
            onAddTask={handleAddTask}
            onToggleTask={handleToggleTask}
            onEditTask={handleEditTask}
            onDeleteTask={handleDeleteTask}
            onClearWeek={handleClearWeek}
          />
        )}
      </main>

      {statusNotice && (
        <div
          role="status"
          className="fixed right-4 bottom-4 z-50 flex items-center gap-3 rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-2.5 text-sm text-white shadow-lg"
        >
          <span className="text-neutral-100">{statusNotice}</span>
          <button
            type="button"
            onClick={() => setStatusNotice(null)}
            aria-label="Dismiss notification"
            className="text-neutral-400 hover:text-white"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

export default App;
