import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
} from 'lucide-react';
import { Habit } from '../types/system';
import {
  MONTH_NAMES,
  buildMonthCalendarWeeks,
  clampYear,
  formatPercent,
  getDaysInMonth,
} from '../utils/calendar';

interface HabitTrackerViewProps {
  habits: Habit[];
  selectedMonth: number;
  selectedYear: number;
  monthCompletions: Record<string, number[]>;
  onChangeMonth: (month: number) => void;
  onChangeYear: (year: number) => void;
  onToggleHabitDay: (habitId: string, day: number) => void;
  onAddHabit: (name: string) => void;
  onEditHabit: (habitId: string, newName: string) => void;
  onDeleteHabit: (habitId: string) => void;
  onRestoreHabit: (habit: Habit, index: number, checkedDays: number[]) => void;
  onClearMonth: () => void;
  onRestoreDefaults: () => void;
}

interface DeletedHabitSnapshot {
  habit: Habit;
  index: number;
  checkedDays: number[];
}

export const HabitTrackerView: React.FC<HabitTrackerViewProps> = ({
  habits,
  selectedMonth,
  selectedYear,
  monthCompletions,
  onChangeMonth,
  onChangeYear,
  onToggleHabitDay,
  onAddHabit,
  onEditHabit,
  onDeleteHabit,
  onRestoreHabit,
  onClearMonth,
  onRestoreDefaults,
}) => {
  // Year text input allows smooth typing before clamping
  const [yearInput, setYearInput] = useState<string>(String(selectedYear));
  useEffect(() => {
    setYearInput(String(selectedYear));
  }, [selectedYear]);

  // Add habit state
  const [isAdding, setIsAdding] = useState(false);
  const [newHabitName, setNewHabitName] = useState('');
  const addInputRef = useRef<HTMLInputElement>(null);

  // Edit habit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const editInputRef = useRef<HTMLInputElement>(null);

  // Mobile week filter ('all' or 1..6)
  const [mobileWeekFilter, setMobileWeekFilter] = useState<number | 'all'>('all');

  // Reset mobile week filter when month/year changes
  useEffect(() => {
    setMobileWeekFilter('all');
  }, [selectedMonth, selectedYear]);

  // Undo deleted habit toast
  const [deletedSnapshot, setDeletedSnapshot] = useState<DeletedHabitSnapshot | null>(null);
  const undoTimerRef = useRef<number | null>(null);

  // Clear month inline confirm
  const [confirmClear, setConfirmClear] = useState(false);

  useEffect(() => {
    if (isAdding) {
      addInputRef.current?.focus();
    }
  }, [isAdding]);

  useEffect(() => {
    if (editingId) {
      editInputRef.current?.focus();
      editInputRef.current?.select();
    }
  }, [editingId]);

  useEffect(() => {
    return () => {
      if (undoTimerRef.current) window.clearTimeout(undoTimerRef.current);
    };
  }, []);

  const daysInMonth = useMemo(
    () => getDaysInMonth(selectedYear, selectedMonth),
    [selectedYear, selectedMonth]
  );

  const allWeeks = useMemo(
    () => buildMonthCalendarWeeks(selectedYear, selectedMonth),
    [selectedYear, selectedMonth]
  );

  // Fast O(1) lookup Sets per habit for the active month
  const completionSets = useMemo(() => {
    const map: Record<string, Set<number>> = {};
    for (const habit of habits) {
      const arr = monthCompletions[habit.id] || [];
      map[habit.id] = new Set(arr.filter((d) => d >= 1 && d <= daysInMonth));
    }
    return map;
  }, [habits, monthCompletions, daysInMonth]);

  // Daily summary stats for days 1..daysInMonth
  const dailyStats = useMemo(() => {
    const totalHabits = habits.length;
    const byDay: Record<number, { completed: number; remaining: number; percentage: number }> = {};
    let totalCompleted = 0;
    let perfectDays = 0;

    for (let day = 1; day <= daysInMonth; day++) {
      let count = 0;
      for (const habit of habits) {
        if (completionSets[habit.id]?.has(day)) {
          count++;
        }
      }
      totalCompleted += count;
      const percentage = totalHabits > 0 ? (count / totalHabits) * 100 : 0;
      if (totalHabits > 0 && count === totalHabits) {
        perfectDays++;
      }
      byDay[day] = {
        completed: count,
        remaining: Math.max(0, totalHabits - count),
        percentage,
      };
    }

    const totalPossible = totalHabits * daysInMonth;
    const overallPercentage = totalPossible > 0 ? (totalCompleted / totalPossible) * 100 : 0;

    return {
      byDay,
      totalCompleted,
      totalPossible,
      overallPercentage,
      perfectDays,
    };
  }, [habits, completionSets, daysInMonth]);

  // Handlers
  const handleYearInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setYearInput(raw);
    const parsed = parseInt(raw, 10);
    if (!Number.isNaN(parsed) && raw.length === 4 && parsed >= 1970 && parsed <= 2099) {
      onChangeYear(parsed);
    }
  };

  const commitYearInput = () => {
    const parsed = parseInt(yearInput, 10);
    const clamped = Number.isNaN(parsed) ? 2026 : clampYear(parsed);
    onChangeYear(clamped);
    setYearInput(String(clamped));
  };

  const handleStepYear = (delta: number) => {
    const next = clampYear(selectedYear + delta);
    onChangeYear(next);
    setYearInput(String(next));
  };

  const handleOpenAdd = () => {
    setIsAdding(true);
    setNewHabitName('');
  };

  const handleSubmitAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newHabitName.trim();
    if (!trimmed) return;
    onAddHabit(trimmed);
    setNewHabitName('');
    setIsAdding(false);
  };

  const handleStartEdit = (habit: Habit) => {
    setEditingId(habit.id);
    setEditingName(habit.name);
  };

  const handleSaveEdit = () => {
    if (!editingId) return;
    const trimmed = editingName.trim();
    if (trimmed) {
      onEditHabit(editingId, trimmed);
    }
    setEditingId(null);
    setEditingName('');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingName('');
  };

  const handleRemoveHabit = (habit: Habit, index: number) => {
    const checkedDays = [...(monthCompletions[habit.id] || [])];
    onDeleteHabit(habit.id);
    if (editingId === habit.id) {
      setEditingId(null);
    }
    setDeletedSnapshot({ habit, index, checkedDays });
    if (undoTimerRef.current) window.clearTimeout(undoTimerRef.current);
    undoTimerRef.current = window.setTimeout(() => {
      setDeletedSnapshot(null);
    }, 5500);
  };

  const handleUndoDelete = () => {
    if (!deletedSnapshot) return;
    onRestoreHabit(deletedSnapshot.habit, deletedSnapshot.index, deletedSnapshot.checkedDays);
    setDeletedSnapshot(null);
    if (undoTimerRef.current) window.clearTimeout(undoTimerRef.current);
  };

  // On desktop (lg+) all weeks always show; on mobile/tablet respect mobileWeekFilter
  const getWeekVisibilityClass = (weekNumber: number) => {
    if (mobileWeekFilter === 'all') return '';
    return mobileWeekFilter === weekNumber ? '' : 'hidden lg:table-cell';
  };

  return (
    <section className="space-y-5">
      {/* Page Header & Period Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-[-0.03em] text-neutral-950 sm:text-[28px]">
              My Habits
            </h1>
            <span className="inline-flex items-center rounded-full border border-neutral-200 bg-neutral-50 px-2.5 py-0.5 text-xs font-semibold tabular-nums text-neutral-700">
              {habits.length} {habits.length === 1 ? 'habit' : 'habits'}
            </span>
          </div>
          <p className="mt-1 text-sm text-neutral-500">
            {MONTH_NAMES[selectedMonth]} {selectedYear} &middot; {daysInMonth} days &middot; Click any
            day to track consistency
          </p>
        </div>

        {/* Controls Bar: Month Dropdown, Year Input, Add Habit */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Month Dropdown */}
          <div className="relative">
            <label htmlFor="habit-month-select" className="sr-only">
              Month
            </label>
            <select
              id="habit-month-select"
              aria-label="Month"
              value={selectedMonth}
              onChange={(e) => {
                onChangeMonth(Number(e.target.value));
                setConfirmClear(false);
              }}
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

          {/* Year Input with subtle steppers */}
          <div className="flex h-9 items-center rounded-lg border border-neutral-200 bg-white shadow-2xs transition-colors focus-within:border-neutral-950 hover:border-neutral-300">
            <button
              type="button"
              onClick={() => handleStepYear(-1)}
              aria-label="Previous year"
              className="flex h-full items-center px-2 text-neutral-400 transition-colors hover:text-neutral-900"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <label htmlFor="habit-year-input" className="sr-only">
              Year
            </label>
            <input
              id="habit-year-input"
              aria-label="Year"
              type="number"
              min={1970}
              max={2099}
              value={yearInput}
              onChange={handleYearInputChange}
              onBlur={commitYearInput}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitYearInput();
              }}
              className="w-14 [appearance:textfield] bg-transparent text-center text-sm font-semibold tabular-nums text-neutral-900 focus:outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
            <button
              type="button"
              onClick={() => handleStepYear(1)}
              aria-label="Next year"
              className="flex h-full items-center px-2 text-neutral-400 transition-colors hover:text-neutral-900"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Add New Habit Button */}
          <button
            type="button"
            onClick={handleOpenAdd}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-neutral-950 px-3.5 text-sm font-medium text-white shadow-2xs transition-colors hover:bg-neutral-800 focus:ring-2 focus:ring-neutral-950 focus:ring-offset-1 focus:outline-none"
          >
            <Plus className="h-4 w-4" />
            <span>Add Habit</span>
          </button>
        </div>
      </div>

      {/* Inline Add New Habit Bar (when opened from top button or bottom row) */}
      {isAdding && (
        <form
          onSubmit={handleSubmitAdd}
          className="flex flex-col gap-2 rounded-xl border border-neutral-200 bg-neutral-50/80 p-3 sm:flex-row sm:items-center"
        >
          <input
            ref={addInputRef}
            type="text"
            value={newHabitName}
            onChange={(e) => setNewHabitName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setIsAdding(false);
                setNewHabitName('');
              }
            }}
            placeholder="Enter new habit name (e.g., Meditate 10 min, Journal, 10k Steps)..."
            maxLength={60}
            className="h-9 flex-1 rounded-lg border border-neutral-200 bg-white px-3 text-sm text-neutral-950 placeholder:text-neutral-400 focus:border-neutral-950 focus:outline-none"
          />
          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={!newHabitName.trim()}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#22c55e] px-3.5 text-sm font-semibold text-white transition-colors hover:bg-[#16a34a] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Check className="h-4 w-4" />
              <span>Save Habit</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setIsAdding(false);
                setNewHabitName('');
              }}
              className="inline-flex h-9 items-center rounded-lg border border-neutral-200 bg-white px-3 text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-900"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Mobile / Tablet Quick Week Filter */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 lg:hidden">
        <span className="mr-1 shrink-0 text-xs font-medium text-neutral-400">View:</span>
        <button
          type="button"
          onClick={() => setMobileWeekFilter('all')}
          className={`shrink-0 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
            mobileWeekFilter === 'all'
              ? 'bg-neutral-950 text-white'
              : 'border border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50'
          }`}
        >
          All Weeks
        </button>
        {allWeeks.map((w) => (
          <button
            key={w.weekNumber}
            type="button"
            onClick={() => setMobileWeekFilter(w.weekNumber)}
            className={`shrink-0 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
              mobileWeekFilter === w.weekNumber
                ? 'bg-neutral-950 text-white'
                : 'border border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50'
            }`}
          >
            W{w.weekNumber}
          </button>
        ))}
      </div>

      {/* Main Calendar Matrix Container */}
      <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-2xs">
        <div className="system-scroll overflow-x-auto">
          <table className="w-full border-separate border-spacing-0 text-left">
            <thead>
              {/* Row 1: Week 1 .. Week 5 Group Headers */}
              <tr className="bg-neutral-50/90">
                <th
                  rowSpan={3}
                  scope="col"
                  className="sticky left-0 z-20 min-w-[185px] border-r border-b border-neutral-200 bg-neutral-50 px-3.5 py-2.5 align-bottom sm:min-w-[215px]"
                >
                  <div className="text-[11px] font-bold tracking-[0.06em] text-neutral-500 uppercase">
                    Habit
                  </div>
                  <div className="mt-0.5 text-xs font-normal text-neutral-400">
                    {MONTH_NAMES[selectedMonth]} {selectedYear}
                  </div>
                </th>

                {allWeeks.map((week, wIdx) => (
                  <th
                    key={week.weekNumber}
                    colSpan={7}
                    scope="colgroup"
                    className={`${getWeekVisibilityClass(week.weekNumber)} border-r border-b border-neutral-200 py-1.5 text-center text-[11px] font-bold tracking-[0.05em] text-neutral-800 uppercase ${
                      wIdx % 2 === 0 ? 'bg-neutral-50/90' : 'bg-neutral-100/70'
                    }`}
                  >
                    {week.label}
                  </th>
                ))}

                <th
                  rowSpan={3}
                  scope="col"
                  className="min-w-[74px] border-b border-neutral-200 bg-neutral-50 px-2.5 py-2.5 text-right align-bottom"
                >
                  <div className="text-[11px] font-bold tracking-[0.06em] text-neutral-500 uppercase">
                    Done
                  </div>
                  <div className="mt-0.5 text-[11px] font-normal tabular-nums text-neutral-400">
                    / {daysInMonth}
                  </div>
                </th>
              </tr>

              {/* Row 2: Weekday Labels (Mo Tu We Th Fr Sa Su) */}
              <tr className="bg-white">
                {allWeeks.map((week) =>
                  week.days.map((slot, dIdx) => (
                    <th
                      key={`wd-${week.weekNumber}-${slot.weekdayIndex}`}
                      scope="col"
                      className={`${getWeekVisibilityClass(week.weekNumber)} min-w-[30px] border-b border-b-neutral-100 px-0.5 py-1 text-center text-[10px] font-semibold select-none ${
                        dIdx === 6 ? 'border-r border-r-neutral-200' : 'border-r border-r-neutral-100/80'
                      } ${
                        slot.day === null
                          ? 'bg-neutral-50/70 text-neutral-300'
                          : slot.isWeekend
                          ? 'text-neutral-400'
                          : 'text-neutral-500'
                      }`}
                    >
                      {slot.weekdayLabel}
                    </th>
                  ))
                )}
              </tr>

              {/* Row 3: Calendar Date Numbers (1..30/31) */}
              <tr className="bg-white">
                {allWeeks.map((week) =>
                  week.days.map((slot, dIdx) => (
                    <th
                      key={`dn-${week.weekNumber}-${slot.weekdayIndex}`}
                      scope="col"
                      className={`${getWeekVisibilityClass(week.weekNumber)} min-w-[30px] border-b border-b-neutral-200 px-0.5 py-1 text-center text-[11px] tabular-nums select-none ${
                        dIdx === 6 ? 'border-r border-r-neutral-200' : 'border-r border-r-neutral-100/80'
                      } ${
                        slot.day === null
                          ? 'bg-neutral-50/70 text-neutral-300'
                          : 'font-semibold text-neutral-700'
                      }`}
                    >
                      {slot.day !== null ? (
                        slot.isToday ? (
                          <span
                            title="Today"
                            className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-neutral-950 text-[10px] font-bold text-white"
                          >
                            {slot.day}
                          </span>
                        ) : (
                          <span>{slot.day}</span>
                        )
                      ) : (
                        <span className="text-neutral-200">&ndash;</span>
                      )}
                    </th>
                  ))
                )}
              </tr>
            </thead>

            <tbody>
              {habits.length === 0 ? (
                <tr>
                  <td
                    colSpan={allWeeks.length * 7 + 2}
                    className="border-b-2 border-b-neutral-200 bg-white px-6 py-14 text-center"
                  >
                    <p className="text-sm font-semibold text-neutral-900">
                      No habits added yet
                    </p>
                    <p className="mt-1 text-xs text-neutral-500">
                      Start fresh by adding your first habit, or load the 10 default habits with 0% progress.
                    </p>
                    <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5">
                      <button
                        type="button"
                        onClick={handleOpenAdd}
                        className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-neutral-950 px-3.5 text-xs font-semibold text-white transition-colors hover:bg-neutral-800"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Add Habit
                      </button>
                      <button
                        type="button"
                        onClick={onRestoreDefaults}
                        className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3.5 text-xs font-medium text-neutral-700 transition-colors hover:border-neutral-300 hover:bg-neutral-50"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        Load Default Habits
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                habits.map((habit, index) => {
                  const habitSet = completionSets[habit.id] || new Set<number>();
                  const habitCount = habitSet.size;
                  const habitPct = daysInMonth > 0 ? (habitCount / daysInMonth) * 100 : 0;
                  const isEditing = editingId === habit.id;

                  return (
                    <tr
                      key={habit.id}
                      className="group transition-colors hover:bg-neutral-50/60"
                    >
                      {/* Sticky Left Column: Habit Name + Inline Edit / Delete */}
                      <td className="sticky left-0 z-10 border-r border-b border-r-neutral-200 border-b-neutral-100 bg-white px-3 py-1.5 transition-colors group-hover:bg-neutral-50">
                        {isEditing ? (
                          <div className="flex items-center gap-1">
                            <input
                              ref={editInputRef}
                              type="text"
                              value={editingName}
                              onChange={(e) => setEditingName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveEdit();
                                if (e.key === 'Escape') handleCancelEdit();
                              }}
                              maxLength={60}
                              aria-label="Edit habit name"
                              className="h-7 w-full min-w-0 rounded border border-neutral-900 bg-white px-2 text-xs font-medium text-neutral-950 focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={handleSaveEdit}
                              title="Save"
                              aria-label="Save habit name"
                              className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-[#22c55e] text-white hover:bg-[#16a34a]"
                            >
                              <Check className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={handleCancelEdit}
                              title="Cancel"
                              aria-label="Cancel editing"
                              className="flex h-6 w-6 shrink-0 items-center justify-center rounded border border-neutral-200 bg-white text-neutral-500 hover:text-neutral-900"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between gap-1.5">
                            <span
                              onDoubleClick={() => handleStartEdit(habit)}
                              title={`${habit.name} (double-click to edit)`}
                              className="truncate text-[13px] font-medium text-neutral-900"
                            >
                              {habit.name}
                            </span>
                            <div className="flex shrink-0 items-center gap-0.5 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100">
                              <button
                                type="button"
                                onClick={() => handleStartEdit(habit)}
                                title={`Edit "${habit.name}"`}
                                aria-label={`Edit ${habit.name}`}
                                className="flex h-6 w-6 items-center justify-center rounded text-neutral-400 transition-colors hover:bg-neutral-200/70 hover:text-neutral-900"
                              >
                                <Pencil className="h-3 w-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveHabit(habit, index)}
                                title={`Delete "${habit.name}"`}
                                aria-label={`Delete ${habit.name}`}
                                className="flex h-6 w-6 items-center justify-center rounded text-neutral-400 transition-colors hover:bg-red-50 hover:text-red-600"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        )}
                      </td>

                      {/* Calendar Day Checkbox Cells */}
                      {allWeeks.map((week) =>
                        week.days.map((slot, dIdx) => {
                          const borderClass =
                            dIdx === 6
                              ? 'border-r border-b border-r-neutral-200 border-b-neutral-100'
                              : 'border-r border-b border-r-neutral-100/80 border-b-neutral-100';

                          if (slot.day === null) {
                            return (
                              <td
                                key={`cell-${habit.id}-${week.weekNumber}-${slot.weekdayIndex}`}
                                className={`${getWeekVisibilityClass(week.weekNumber)} ${borderClass} bg-neutral-50/75 p-0`}
                              />
                            );
                          }

                          const dayNum = slot.day;
                          const isChecked = habitSet.has(dayNum);

                          return (
                            <td
                              key={`cell-${habit.id}-${week.weekNumber}-${slot.weekdayIndex}`}
                              className={`${getWeekVisibilityClass(week.weekNumber)} ${borderClass} p-0 text-center align-middle ${
                                slot.isToday ? 'bg-green-50/35' : ''
                              }`}
                            >
                              <label
                                title={`${habit.name} — ${MONTH_NAMES[selectedMonth]} ${dayNum}, ${selectedYear}`}
                                className="flex h-8 w-full items-center justify-center select-none sm:h-[33px]"
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => onToggleHabitDay(habit.id, dayNum)}
                                  aria-label={`${habit.name}, ${MONTH_NAMES[selectedMonth]} ${dayNum}`}
                                  className="peer sr-only"
                                />
                                <span
                                  className={`flex h-[18px] w-[18px] items-center justify-center rounded-[4px] border transition-all duration-100 peer-focus-visible:ring-2 peer-focus-visible:ring-[#22c55e] peer-focus-visible:ring-offset-1 ${
                                    isChecked
                                      ? 'animate-check-pop border-[#22c55e] bg-[#22c55e] text-white'
                                      : 'border-neutral-300 bg-white text-transparent hover:border-[#22c55e] hover:bg-green-50/50'
                                  }`}
                                >
                                  <Check className="h-3 w-3 stroke-[3]" />
                                </span>
                              </label>
                            </td>
                          );
                        })
                      )}

                      {/* Row Completion Summary Cell */}
                      <td className="border-b border-b-neutral-100 px-2.5 py-1.5 text-right align-middle">
                        <div className="text-xs font-semibold tabular-nums text-neutral-800">
                          {habitCount}
                          <span className="font-normal text-neutral-400">/{daysInMonth}</span>
                        </div>
                        <div className="mt-1 ml-auto h-1 w-12 overflow-hidden rounded-full bg-neutral-100">
                          <div
                            className="h-full rounded-full bg-[#22c55e] transition-all duration-200"
                            style={{ width: `${Math.min(100, habitPct)}%` }}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}

              {/* Quick Inline Add Habit Trigger Row */}
              {habits.length > 0 && !isAdding && (
                <tr className="bg-white">
                  <td className="sticky left-0 z-10 border-r border-b-2 border-r-neutral-200 border-b-neutral-200 bg-white px-3 py-1.5">
                    <button
                      type="button"
                      onClick={handleOpenAdd}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-400 transition-colors hover:text-neutral-900"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>New habit</span>
                    </button>
                  </td>
                  {allWeeks.map((week) => (
                    <td
                      key={`add-spacer-${week.weekNumber}`}
                      colSpan={7}
                      className={`${getWeekVisibilityClass(week.weekNumber)} border-r border-b-2 border-r-neutral-200 border-b-neutral-200 bg-neutral-50/20 py-1.5`}
                    />
                  ))}
                  <td className="border-b-2 border-b-neutral-200 bg-neutral-50/20 py-1.5" />
                </tr>
              )}
            </tbody>

            {/* DAILY SUMMARY Footer inside Calendar Matrix */}
            <tfoot className="bg-neutral-50/85">
              {/* Row 1: Daily Progress Bars + Daily Percentage */}
              <tr>
                <td className="sticky left-0 z-10 border-r border-b border-r-neutral-200 border-b-neutral-200/80 bg-neutral-50 px-3.5 py-2 align-bottom">
                  <div className="text-[11px] font-extrabold tracking-[0.05em] text-neutral-950 uppercase">
                    Daily Summary
                  </div>
                  <div className="text-[11px] font-medium text-neutral-500">Completion %</div>
                </td>

                {allWeeks.map((week) =>
                  week.days.map((slot, dIdx) => {
                    const borderClass =
                      dIdx === 6
                        ? 'border-r border-b border-r-neutral-200 border-b-neutral-200/80'
                        : 'border-r border-b border-r-neutral-100 border-b-neutral-200/80';

                    if (slot.day === null) {
                      return (
                        <td
                          key={`sum-pct-${week.weekNumber}-${slot.weekdayIndex}`}
                          className={`${getWeekVisibilityClass(week.weekNumber)} ${borderClass} bg-neutral-100/50`}
                        />
                      );
                    }

                    const stat = dailyStats.byDay[slot.day] || {
                      completed: 0,
                      remaining: 0,
                      percentage: 0,
                    };
                    const roundedPct = Math.round(stat.percentage);

                    return (
                      <td
                        key={`sum-pct-${week.weekNumber}-${slot.weekdayIndex}`}
                        title={`${MONTH_NAMES[selectedMonth]} ${slot.day}: ${stat.completed}/${habits.length} (${roundedPct}%)`}
                        className={`${getWeekVisibilityClass(week.weekNumber)} ${borderClass} px-0.5 py-1.5 text-center align-bottom`}
                      >
                        <div className="mx-auto mb-1 flex h-6 w-2.5 items-end overflow-hidden rounded-[2px] bg-neutral-200/75">
                          <div
                            className="w-full rounded-[2px] bg-[#22c55e] transition-all duration-200"
                            style={{ height: `${Math.min(100, Math.max(0, stat.percentage))}%` }}
                          />
                        </div>
                        <span
                          className={`block text-[9.5px] leading-none tabular-nums ${
                            roundedPct === 100
                              ? 'font-bold text-[#16a34a]'
                              : roundedPct > 0
                              ? 'font-semibold text-neutral-700'
                              : 'font-medium text-neutral-400'
                          }`}
                        >
                          {roundedPct}%
                        </span>
                      </td>
                    );
                  })
                )}

                <td className="border-b border-b-neutral-200/80 bg-neutral-50 px-2.5 py-2 text-right align-bottom">
                  <span className="text-xs font-extrabold tabular-nums text-[#16a34a]">
                    {formatPercent(dailyStats.overallPercentage, 1)}
                  </span>
                </td>
              </tr>

              {/* Row 2: Total Habits Completed per Day */}
              <tr>
                <td className="sticky left-0 z-10 border-r border-b border-r-neutral-200 border-b-neutral-200/70 bg-neutral-50 px-3.5 py-1.5">
                  <span className="text-xs font-semibold text-neutral-800">Done</span>
                </td>

                {allWeeks.map((week) =>
                  week.days.map((slot, dIdx) => {
                    const borderClass =
                      dIdx === 6
                        ? 'border-r border-b border-r-neutral-200 border-b-neutral-200/70'
                        : 'border-r border-b border-r-neutral-100 border-b-neutral-200/70';

                    if (slot.day === null) {
                      return (
                        <td
                          key={`sum-done-${week.weekNumber}-${slot.weekdayIndex}`}
                          className={`${getWeekVisibilityClass(week.weekNumber)} ${borderClass} bg-neutral-100/50`}
                        />
                      );
                    }

                    const stat = dailyStats.byDay[slot.day] || {
                      completed: 0,
                      remaining: 0,
                      percentage: 0,
                    };
                    const isAllDone = habits.length > 0 && stat.completed === habits.length;

                    return (
                      <td
                        key={`sum-done-${week.weekNumber}-${slot.weekdayIndex}`}
                        className={`${getWeekVisibilityClass(week.weekNumber)} ${borderClass} px-0.5 py-1.5 text-center text-[11px] tabular-nums ${
                          isAllDone
                            ? 'font-bold text-[#16a34a]'
                            : 'font-semibold text-neutral-800'
                        }`}
                      >
                        {stat.completed}
                      </td>
                    );
                  })
                )}

                <td className="border-b border-b-neutral-200/70 bg-neutral-50 px-2.5 py-1.5 text-right text-xs font-bold tabular-nums whitespace-nowrap text-neutral-950">
                  {dailyStats.totalCompleted} / {dailyStats.totalPossible}
                </td>
              </tr>

              {/* Row 3: Not Done per Day */}
              <tr>
                <td className="sticky left-0 z-10 border-r border-r-neutral-200 bg-neutral-50 px-3.5 py-1.5">
                  <span className="text-xs font-medium text-neutral-400">Not Done</span>
                </td>

                {allWeeks.map((week) =>
                  week.days.map((slot, dIdx) => {
                    const borderClass =
                      dIdx === 6
                        ? 'border-r border-r-neutral-200'
                        : 'border-r border-r-neutral-100';

                    if (slot.day === null) {
                      return (
                        <td
                          key={`sum-left-${week.weekNumber}-${slot.weekdayIndex}`}
                          className={`${getWeekVisibilityClass(week.weekNumber)} ${borderClass} bg-neutral-100/50`}
                        />
                      );
                    }

                    const stat = dailyStats.byDay[slot.day] || {
                      completed: 0,
                      remaining: 0,
                      percentage: 0,
                    };

                    return (
                      <td
                        key={`sum-left-${week.weekNumber}-${slot.weekdayIndex}`}
                        className={`${getWeekVisibilityClass(week.weekNumber)} ${borderClass} px-0.5 py-1.5 text-center text-[11px] font-normal tabular-nums text-neutral-400`}
                      >
                        {stat.remaining}
                      </td>
                    );
                  })
                )}

                <td className="bg-neutral-50 px-2.5 py-1.5 text-right text-xs font-medium tabular-nums text-neutral-400">
                  {Math.max(0, dailyStats.totalPossible - dailyStats.totalCompleted)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Bottom Overall Daily Summary Bar */}
        <div className="flex flex-col gap-3 border-t border-neutral-200 bg-white px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <div className="flex items-center gap-2.5">
              <span className="text-xs font-bold tracking-[0.06em] text-neutral-500 uppercase">
                Total Completed
              </span>
              <span className="text-base font-extrabold tabular-nums text-neutral-950">
                {dailyStats.totalCompleted} / {dailyStats.totalPossible}
              </span>
            </div>

            <div className="flex items-center gap-2.5">
              <span className="text-xs font-bold tracking-[0.06em] text-neutral-500 uppercase">
                Overall
              </span>
              <div className="h-2.5 w-28 overflow-hidden rounded-full bg-neutral-100 sm:w-36">
                <div
                  className="h-full rounded-full bg-[#22c55e] transition-all duration-300"
                  style={{
                    width: `${Math.min(100, Math.max(0, dailyStats.overallPercentage))}%`,
                  }}
                />
              </div>
              <span className="text-base font-extrabold tabular-nums text-neutral-950">
                {formatPercent(dailyStats.overallPercentage, 1)}
              </span>
            </div>

            <div className="hidden items-center gap-1.5 text-xs text-neutral-500 md:flex">
              <span>Perfect days:</span>
              <span className="font-semibold tabular-nums text-neutral-800">
                {dailyStats.perfectDays} / {daysInMonth}
              </span>
            </div>
          </div>

          {/* Subtle Clear Month Utility */}
          {dailyStats.totalCompleted > 0 && (
            <div className="flex items-center gap-2 self-end sm:self-auto">
              {confirmClear ? (
                <>
                  <span className="text-xs text-neutral-500">
                    Clear {MONTH_NAMES[selectedMonth]} checks?
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      onClearMonth();
                      setConfirmClear(false);
                    }}
                    className="rounded-md bg-red-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-red-700"
                  >
                    Yes, clear
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmClear(false)}
                    className="rounded-md border border-neutral-200 px-2.5 py-1 text-xs font-medium text-neutral-600 hover:bg-neutral-50"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmClear(true)}
                  className="text-xs font-medium text-neutral-400 transition-colors hover:text-neutral-700"
                >
                  Clear month
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Non-blocking Undo Toast when a habit is deleted */}
      {deletedSnapshot && (
        <div
          role="status"
          className="fixed right-4 bottom-4 z-50 flex items-center gap-3 rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-2.5 text-sm text-white shadow-lg"
        >
          <span className="text-neutral-200">
            Deleted <strong className="font-semibold text-white">{deletedSnapshot.habit.name}</strong>
          </span>
          <button
            type="button"
            onClick={handleUndoDelete}
            className="font-semibold text-[#22c55e] transition-colors hover:text-green-400"
          >
            Undo
          </button>
          <button
            type="button"
            onClick={() => setDeletedSnapshot(null)}
            aria-label="Dismiss notification"
            className="text-neutral-400 hover:text-white"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </section>
  );
};
