import React, { useMemo, useState, useEffect } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight, ArrowUpRight } from 'lucide-react';
import { Habit, HabitStat } from '../types/system';
import {
  MONTH_NAMES,
  clampYear,
  formatPercent,
  getDaysInMonth,
} from '../utils/calendar';

interface AnalyticsViewProps {
  habits: Habit[];
  selectedMonth: number;
  selectedYear: number;
  monthCompletions: Record<string, number[]>;
  onChangeMonth: (month: number) => void;
  onChangeYear: (year: number) => void;
  onGoToTracker: () => void;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  habits,
  selectedMonth,
  selectedYear,
  monthCompletions,
  onChangeMonth,
  onChangeYear,
  onGoToTracker,
}) => {
  const [yearInput, setYearInput] = useState<string>(String(selectedYear));
  useEffect(() => {
    setYearInput(String(selectedYear));
  }, [selectedYear]);

  const commitYear = () => {
    const parsed = parseInt(yearInput, 10);
    const clamped = Number.isNaN(parsed) ? 2026 : clampYear(parsed);
    onChangeYear(clamped);
    setYearInput(String(clamped));
  };

  const daysInMonth = useMemo(
    () => getDaysInMonth(selectedYear, selectedMonth),
    [selectedYear, selectedMonth]
  );

  // Per-habit stats preserving tracker order
  const habitStats: HabitStat[] = useMemo(() => {
    return habits.map((habit) => {
      const rawDays = monthCompletions[habit.id] || [];
      const uniqueValidDays = new Set(rawDays.filter((d) => d >= 1 && d <= daysInMonth));
      const count = uniqueValidDays.size;
      const goal = daysInMonth;
      const percentage = goal > 0 ? (count / goal) * 100 : 0;

      return {
        id: habit.id,
        name: habit.name,
        goal,
        count,
        percentage,
      };
    });
  }, [habits, monthCompletions, daysInMonth]);

  // Aggregate summary metrics
  const overview = useMemo(() => {
    const totalCompleted = habitStats.reduce((sum, h) => sum + h.count, 0);
    const totalPossible = habits.length * daysInMonth;
    const progressPct = totalPossible > 0 ? (totalCompleted / totalPossible) * 100 : 0;
    const remaining = Math.max(0, totalPossible - totalCompleted);
    const dailyAverage = daysInMonth > 0 ? totalCompleted / daysInMonth : 0;

    // Count 100% perfect days
    let perfectDays = 0;
    if (habits.length > 0) {
      const sets = habits.map(
        (h) => new Set((monthCompletions[h.id] || []).filter((d) => d >= 1 && d <= daysInMonth))
      );
      for (let d = 1; d <= daysInMonth; d++) {
        if (sets.every((s) => s.has(d))) {
          perfectDays++;
        }
      }
    }

    return {
      totalCompleted,
      totalPossible,
      progressPct,
      remaining,
      dailyAverage,
      perfectDays,
    };
  }, [habitStats, habits, monthCompletions, daysInMonth]);

  // Top 10 Most Consistent Habits sorted highest % to lowest
  const topConsistentHabits = useMemo(() => {
    return [...habitStats]
      .sort((a, b) => {
        if (b.percentage !== a.percentage) return b.percentage - a.percentage;
        if (b.count !== a.count) return b.count - a.count;
        return a.name.localeCompare(b.name);
      })
      .slice(0, 10);
  }, [habitStats]);

  return (
    <section className="space-y-6">
      {/* Header Row */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-[-0.03em] text-neutral-950 sm:text-[28px]">
            Analytics
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            Live monthly performance for {MONTH_NAMES[selectedMonth]} {selectedYear}
          </p>
        </div>

        {/* Synced Period Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative">
            <label htmlFor="analytics-month-select" className="sr-only">
              Month
            </label>
            <select
              id="analytics-month-select"
              aria-label="Analytics Month"
              value={selectedMonth}
              onChange={(e) => onChangeMonth(Number(e.target.value))}
              className="h-9 appearance-none rounded-lg border border-neutral-200 bg-white pr-8 pl-3 text-sm font-medium text-neutral-900 shadow-2xs transition-colors hover:border-neutral-300 focus:border-neutral-950 focus:outline-none"
            >
              {MONTH_NAMES.map((name, idx) => (
                <option key={name} value={idx}>
                  {name}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute top-1/2 right-2.5 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          </div>

          <div className="flex h-9 items-center rounded-lg border border-neutral-200 bg-white shadow-2xs transition-colors focus-within:border-neutral-950 hover:border-neutral-300">
            <button
              type="button"
              onClick={() => onChangeYear(clampYear(selectedYear - 1))}
              aria-label="Previous year"
              className="flex h-full items-center px-2 text-neutral-400 transition-colors hover:text-neutral-900"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <input
              type="number"
              aria-label="Analytics Year"
              min={1970}
              max={2099}
              value={yearInput}
              onChange={(e) => {
                const raw = e.target.value;
                setYearInput(raw);
                const val = parseInt(raw, 10);
                if (!Number.isNaN(val) && raw.length === 4 && val >= 1970 && val <= 2099) {
                  onChangeYear(clampYear(val));
                }
              }}
              onBlur={commitYear}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitYear();
              }}
              className="w-14 [appearance:textfield] bg-transparent text-center text-sm font-semibold tabular-nums text-neutral-900 focus:outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
            <button
              type="button"
              onClick={() => onChangeYear(clampYear(selectedYear + 1))}
              aria-label="Next year"
              className="flex h-full items-center px-2 text-neutral-400 transition-colors hover:text-neutral-900"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <button
            type="button"
            onClick={onGoToTracker}
            className="inline-flex h-9 items-center gap-1 rounded-lg border border-neutral-200 bg-white px-3 text-sm font-medium text-neutral-700 shadow-2xs transition-colors hover:border-neutral-300 hover:bg-neutral-50 hover:text-neutral-950"
          >
            <span>Open Tracker</span>
            <ArrowUpRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Big Hero Summary Card: PROGRESS % and HABITS X / 300 */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-2xs sm:p-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 md:gap-10">
          {/* PROGRESS % */}
          <div className="flex flex-col justify-between">
            <div>
              <span className="text-xs font-bold tracking-[0.08em] text-neutral-500 uppercase">
                PROGRESS
              </span>
              <div className="mt-2 flex items-baseline gap-3">
                <span className="text-4xl font-extrabold tracking-[-0.04em] tabular-nums text-neutral-950 sm:text-5xl">
                  {formatPercent(overview.progressPct, 1)}
                </span>
                <span className="text-sm font-medium text-neutral-500">
                  monthly completion
                </span>
              </div>
            </div>

            <div className="mt-5">
              <div className="h-3.5 w-full overflow-hidden rounded-full bg-neutral-100">
                <div
                  className="h-full rounded-full bg-[#22c55e] transition-all duration-300"
                  style={{ width: `${Math.min(100, Math.max(0, overview.progressPct))}%` }}
                />
              </div>
            </div>
          </div>

          {/* HABITS X / 300 */}
          <div className="flex flex-col justify-between border-t border-neutral-100 pt-6 md:border-t-0 md:border-l md:border-neutral-200 md:pt-0 md:pl-10">
            <div>
              <span className="text-xs font-bold tracking-[0.08em] text-neutral-500 uppercase">
                HABITS
              </span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-4xl font-extrabold tracking-[-0.04em] tabular-nums text-neutral-950 sm:text-5xl">
                  {overview.totalCompleted}
                </span>
                <span className="text-2xl font-bold tracking-[-0.02em] tabular-nums text-neutral-400 sm:text-3xl">
                  / {overview.totalPossible}
                </span>
              </div>
            </div>

            <p className="mt-5 text-sm font-medium tabular-nums text-neutral-500">
              {habits.length} {habits.length === 1 ? 'habit' : 'habits'} &times; {daysInMonth} days
              <span className="mx-2 text-neutral-300">&middot;</span>
              {MONTH_NAMES[selectedMonth]} {selectedYear}
            </p>
          </div>
        </div>

        {/* Supporting Metrics Strip */}
        <div className="mt-7 grid grid-cols-3 gap-4 border-t border-neutral-100 pt-5">
          <div>
            <div className="text-[11px] font-semibold tracking-[0.05em] text-neutral-400 uppercase">
              Daily Average
            </div>
            <div className="mt-1 text-base font-bold tabular-nums text-neutral-900 sm:text-lg">
              {overview.dailyAverage.toFixed(1)}{' '}
              <span className="text-xs font-normal text-neutral-400">/ {habits.length}</span>
            </div>
          </div>

          <div>
            <div className="text-[11px] font-semibold tracking-[0.05em] text-neutral-400 uppercase">
              Perfect Days
            </div>
            <div className="mt-1 text-base font-bold tabular-nums text-neutral-900 sm:text-lg">
              {overview.perfectDays}{' '}
              <span className="text-xs font-normal text-neutral-400">of {daysInMonth}</span>
            </div>
          </div>

          <div>
            <div className="text-[11px] font-semibold tracking-[0.05em] text-neutral-400 uppercase">
              Remaining
            </div>
            <div className="mt-1 text-base font-bold tabular-nums text-neutral-900 sm:text-lg">
              {overview.remaining}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid: Breakdown Table + Top 10 Most Consistent Habits */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Habit Breakdown Table */}
        <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-2xs lg:col-span-7">
          <div className="border-b border-neutral-200 px-5 py-4">
            <h2 className="text-sm font-bold tracking-[0.04em] text-neutral-950 uppercase">
              Habit Breakdown
            </h2>
            <p className="mt-0.5 text-xs text-neutral-500">
              Goal, completion rate, and exact check-in count per habit
            </p>
          </div>

          <div className="system-scroll overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-neutral-200 bg-neutral-50/80">
                  <th
                    scope="col"
                    className="px-5 py-3 text-[11px] font-bold tracking-[0.06em] text-neutral-500 uppercase"
                  >
                    Habit Name
                  </th>
                  <th
                    scope="col"
                    className="w-20 px-3 py-3 text-center text-[11px] font-bold tracking-[0.06em] text-neutral-500 uppercase"
                  >
                    GOAL
                  </th>
                  <th
                    scope="col"
                    className="min-w-[180px] px-4 py-3 text-[11px] font-bold tracking-[0.06em] text-neutral-500 uppercase"
                  >
                    PERCENTAGE
                  </th>
                  <th
                    scope="col"
                    className="w-24 px-5 py-3 text-right text-[11px] font-bold tracking-[0.06em] text-neutral-500 uppercase"
                  >
                    COUNT
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-neutral-100">
                {habitStats.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-5 py-12 text-center">
                      <p className="text-sm font-semibold text-neutral-800">
                        No habits to analyze yet
                      </p>
                      <p className="mt-1 text-xs text-neutral-500">
                        Add habits on the Habit Tracker page to see live goals and percentages.
                      </p>
                      <button
                        type="button"
                        onClick={onGoToTracker}
                        className="mt-4 inline-flex h-8 items-center rounded-lg bg-neutral-950 px-3.5 text-xs font-semibold text-white transition-colors hover:bg-neutral-800"
                      >
                        Go to Habit Tracker
                      </button>
                    </td>
                  </tr>
                ) : (
                  habitStats.map((stat) => {
                    const roundedPct = Math.round(stat.percentage);
                    return (
                      <tr
                        key={stat.id}
                        className="transition-colors hover:bg-neutral-50/70"
                      >
                        <td className="px-5 py-3.5 text-sm font-medium text-neutral-900">
                          {stat.name}
                        </td>

                        <td className="px-3 py-3.5 text-center text-sm font-medium tabular-nums text-neutral-600">
                          {stat.goal}
                        </td>

                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-neutral-100">
                              <div
                                className="h-full rounded-full bg-[#22c55e] transition-all duration-300"
                                style={{
                                  width: `${Math.min(100, Math.max(0, stat.percentage))}%`,
                                }}
                              />
                            </div>
                            <span
                              className={`w-11 text-right text-xs font-bold tabular-nums ${
                                roundedPct === 100 ? 'text-[#16a34a]' : 'text-neutral-800'
                              }`}
                            >
                              {roundedPct}%
                            </span>
                          </div>
                        </td>

                        <td className="px-5 py-3.5 text-right text-sm font-semibold tabular-nums whitespace-nowrap text-neutral-900">
                          {stat.count}
                          <span className="font-normal text-neutral-400">/{stat.goal}</span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>

                <tfoot>
                  <tr className="border-t-2 border-neutral-200 bg-neutral-50/80">
                    <td className="px-5 py-3.5 text-xs font-extrabold tracking-[0.05em] text-neutral-950 uppercase">
                      Total
                    </td>
                    <td className="px-3 py-3.5 text-center text-sm font-bold tabular-nums text-neutral-800">
                      {overview.totalPossible}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-neutral-200/80">
                          <div
                            className="h-full rounded-full bg-[#22c55e] transition-all duration-300"
                            style={{
                              width: `${Math.min(100, Math.max(0, overview.progressPct))}%`,
                            }}
                          />
                        </div>
                        <span className="w-11 text-right text-xs font-extrabold tabular-nums text-neutral-950">
                          {formatPercent(overview.progressPct, 1)}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-right text-sm font-extrabold tabular-nums whitespace-nowrap text-neutral-950">
                      {overview.totalCompleted}/{overview.totalPossible}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* TOP 10 MOST CONSISTENT HABITS Leaderboard */}
          <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-2xs lg:col-span-5">
            <div className="border-b border-neutral-200 px-5 py-4">
              <h2 className="text-sm font-bold tracking-[0.04em] text-neutral-950 uppercase">
                TOP 10 MOST CONSISTENT HABITS
              </h2>
              <p className="mt-0.5 text-xs text-neutral-500">
                Ranked from highest completion percentage to lowest
              </p>
            </div>

            {topConsistentHabits.length === 0 ? (
              <div className="px-5 py-12 text-center">
                <p className="text-sm font-semibold text-neutral-800">No rankings yet</p>
                <p className="mt-1 text-xs text-neutral-500">
                  Your most consistent habits will automatically rank here as you check off days.
                </p>
              </div>
            ) : (
              <ol className="divide-y divide-neutral-100">
                {topConsistentHabits.map((habit, idx) => {
                  const rank = idx + 1;
                  const roundedPct = Math.round(habit.percentage);
                  const isFirst = rank === 1 && habit.count > 0;

                  return (
                    <li
                      key={habit.id}
                      className="px-5 py-3.5 transition-colors hover:bg-neutral-50/70"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <span
                            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-xs font-bold tabular-nums ${
                              isFirst
                                ? 'bg-neutral-950 text-white'
                                : rank <= 3 && habit.count > 0
                                ? 'bg-neutral-200/80 text-neutral-900'
                                : 'bg-neutral-100 text-neutral-500'
                            }`}
                          >
                            {rank}
                          </span>
                          <span className="truncate text-sm font-semibold text-neutral-900">
                            {habit.name}
                          </span>
                        </div>

                        <div className="flex shrink-0 items-baseline gap-2 tabular-nums">
                          <span className="text-xs text-neutral-400">
                            {habit.count}/{habit.goal}
                          </span>
                          <span
                            className={`w-10 text-right text-sm font-extrabold ${
                              roundedPct === 100
                                ? 'text-[#16a34a]'
                                : roundedPct >= 80
                                ? 'text-neutral-950'
                                : 'text-neutral-700'
                            }`}
                          >
                            {roundedPct}%
                          </span>
                        </div>
                      </div>

                      <div className="mt-2 pl-9">
                        <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-100">
                          <div
                            className="h-full rounded-full bg-[#22c55e] transition-all duration-300"
                            style={{
                              width: `${Math.min(100, Math.max(0, habit.percentage))}%`,
                            }}
                          />
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>
        </div>
    </section>
  );
};
