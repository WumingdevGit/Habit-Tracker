import React, { useState, useMemo } from 'react';
import {
  Plus,
  Trash2,
  Check,
  ChevronLeft,
  ChevronRight,
  Calendar,
  X,
} from 'lucide-react';
import { WeeklyTodosMap } from '../types/system';
import {
  buildWeekDays,
  getMondayIso,
  shiftIsoByDays,
  toIsoDate,
} from '../utils/calendar';

interface WeeklyTodosViewProps {
  weekStartIso: string;
  weeklyTodos: WeeklyTodosMap;
  onChangeWeekStart: (newIso: string) => void;
  onAddTask: (isoDate: string, text: string) => void;
  onToggleTask: (isoDate: string, taskId: string) => void;
  onEditTask: (isoDate: string, taskId: string, newText: string) => void;
  onDeleteTask: (isoDate: string, taskId: string) => void;
  onClearWeek: (isoDates: string[]) => void;
}

export const WeeklyTodosView: React.FC<WeeklyTodosViewProps> = ({
  weekStartIso,
  weeklyTodos,
  onChangeWeekStart,
  onAddTask,
  onToggleTask,
  onEditTask,
  onDeleteTask,
  onClearWeek,
}) => {
  // Draft input text per day (keyed by ISO date)
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [confirmClearWeek, setConfirmClearWeek] = useState(false);

  // Optional inline edit for task text
  const [editingTask, setEditingTask] = useState<{
    isoDate: string;
    taskId: string;
    text: string;
  } | null>(null);

  const mondayIso = useMemo(() => getMondayIso(weekStartIso), [weekStartIso]);
  const weekDays = useMemo(() => buildWeekDays(mondayIso), [mondayIso]);

  // Compute per-day and weekly completion metrics live
  const daySummaries = useMemo(() => {
    return weekDays.map((day) => {
      const tasks = weeklyTodos[day.isoDate] || [];
      const total = tasks.length;
      const completed = tasks.filter((t) => t.completed).length;
      const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
      const exactPercentage = total > 0 ? (completed / total) * 100 : 0;

      return {
        ...day,
        tasks,
        total,
        completed,
        percentage,
        exactPercentage,
      };
    });
  }, [weekDays, weeklyTodos]);

  const weeklyTotals = useMemo(() => {
    const total = daySummaries.reduce((acc, d) => acc + d.total, 0);
    const completed = daySummaries.reduce((acc, d) => acc + d.completed, 0);
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, percentage };
  }, [daySummaries]);

  const handleDatePickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (!val) return;
    onChangeWeekStart(getMondayIso(val));
  };

  const handleShiftWeek = (deltaDays: number) => {
    onChangeWeekStart(shiftIsoByDays(mondayIso, deltaDays));
  };

  const handleJumpToCurrentWeek = () => {
    onChangeWeekStart(getMondayIso(toIsoDate(new Date())));
  };

  const handleSubmitTask = (e: React.FormEvent, isoDate: string) => {
    e.preventDefault();
    const raw = drafts[isoDate] || '';
    const trimmed = raw.trim();
    if (!trimmed) return;
    onAddTask(isoDate, trimmed);
    setDrafts((prev) => ({ ...prev, [isoDate]: '' }));
  };

  const handleSaveTaskEdit = () => {
    if (!editingTask) return;
    const trimmed = editingTask.text.trim();
    if (trimmed) {
      onEditTask(editingTask.isoDate, editingTask.taskId, trimmed);
    }
    setEditingTask(null);
  };

  const scrollToDayCard = (isoDate: string) => {
    const el = document.getElementById(`day-card-${isoDate}`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  const rangeSubtitle = `${weekDays[0].fullDateLabel} – ${weekDays[6].fullDateLabel}`;

  return (
    <section className="space-y-6">
      {/* Page Header & Start of the week Date Picker */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-[-0.03em] text-neutral-950 sm:text-[28px]">
            Weekly To-Do&apos;s
          </h1>
          <p className="mt-1 text-sm text-neutral-500">{rangeSubtitle}</p>
        </div>

        {/* Start of the Week Picker */}
        <div className="flex flex-wrap items-center gap-2.5">
          <label
            htmlFor="week-start-picker"
            className="flex items-center gap-1.5 text-xs font-semibold tracking-[0.04em] text-neutral-500 uppercase"
          >
            <Calendar className="h-3.5 w-3.5 text-neutral-400" />
            <span>Start of the week</span>
          </label>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => handleShiftWeek(-7)}
              title="Previous week"
              aria-label="Previous week"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-600 shadow-2xs transition-colors hover:border-neutral-300 hover:bg-neutral-50 hover:text-neutral-950"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <input
              id="week-start-picker"
              type="date"
              value={mondayIso}
              onChange={handleDatePickerChange}
              aria-label="Start of the week"
              className="h-9 rounded-lg border border-neutral-200 bg-white px-3 text-sm font-medium tabular-nums text-neutral-900 shadow-2xs transition-colors hover:border-neutral-300 focus:border-neutral-950 focus:outline-none"
            />

            <button
              type="button"
              onClick={() => handleShiftWeek(7)}
              title="Next week"
              aria-label="Next week"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-600 shadow-2xs transition-colors hover:border-neutral-300 hover:bg-neutral-50 hover:text-neutral-950"
            >
              <ChevronRight className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={handleJumpToCurrentWeek}
              className="h-9 rounded-lg border border-neutral-200 bg-white px-3 text-xs font-semibold text-neutral-700 shadow-2xs transition-colors hover:border-neutral-300 hover:bg-neutral-50 hover:text-neutral-950"
            >
              Today
            </button>
          </div>
        </div>
      </div>

      {/* Overall Progress Bar Chart Card (Mon - Sun) */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-2xs sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-bold tracking-[0.04em] text-neutral-950 uppercase">
              Overall Progress
            </h2>
            <p className="mt-0.5 text-xs text-neutral-500">
              Daily completion rate across Monday – Sunday
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-extrabold tracking-[-0.03em] tabular-nums text-neutral-950">
                  {weeklyTotals.percentage}%
                </span>
                <span className="text-xs font-medium tabular-nums text-neutral-500">
                  {weeklyTotals.completed} / {weeklyTotals.total} tasks
                </span>
              </div>
            </div>
            <div className="hidden h-2.5 w-28 overflow-hidden rounded-full bg-neutral-100 sm:block">
              <div
                className="h-full rounded-full bg-[#22c55e] transition-all duration-300"
                style={{ width: `${Math.min(100, Math.max(0, weeklyTotals.percentage))}%` }}
              />
            </div>

            {weeklyTotals.total > 0 && (
              <div className="flex items-center gap-1.5 border-l border-neutral-200 pl-3">
                {confirmClearWeek ? (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        onClearWeek(weekDays.map((d) => d.isoDate));
                        setConfirmClearWeek(false);
                      }}
                      className="rounded-md bg-red-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-red-700"
                    >
                      Confirm
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmClearWeek(false)}
                      className="rounded-md border border-neutral-200 px-2 py-1 text-xs font-medium text-neutral-600 hover:bg-neutral-50"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmClearWeek(true)}
                    className="text-xs font-medium text-neutral-400 transition-colors hover:text-neutral-700"
                  >
                    Clear week
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 7-Column Bar Chart: Mon Tue Wed Thu Fri Sat Sun */}
        <div className="mt-6">
          <div className="relative grid grid-cols-7 gap-2 sm:gap-4">
            {daySummaries.map((day) => {
              const isComplete = day.total > 0 && day.percentage === 100;

              return (
                <button
                  key={day.isoDate}
                  type="button"
                  onClick={() => scrollToDayCard(day.isoDate)}
                  className="group flex flex-col items-center rounded-xl px-1 py-2 transition-colors hover:bg-neutral-50 focus:outline-none"
                >
                  {/* % Label Above Bar */}
                  <span
                    className={`mb-2 text-xs font-bold tabular-nums sm:text-sm ${
                      isComplete
                        ? 'text-[#16a34a]'
                        : day.percentage > 0
                        ? 'text-neutral-900'
                        : 'text-neutral-400'
                    }`}
                  >
                    {day.percentage}%
                  </span>

                  {/* Vertical Progress Bar Track */}
                  <div className="relative flex h-32 w-full max-w-[52px] items-end overflow-hidden rounded-lg border border-neutral-200/70 bg-neutral-100/90 sm:h-40">
                    {/* Subtle 25/50/75% guide lines */}
                    <span className="pointer-events-none absolute right-0 bottom-1/4 left-0 border-t border-dashed border-neutral-200/80" />
                    <span className="pointer-events-none absolute right-0 bottom-2/4 left-0 border-t border-dashed border-neutral-200/80" />
                    <span className="pointer-events-none absolute right-0 bottom-3/4 left-0 border-t border-dashed border-neutral-200/80" />

                    {/* Green Progress Fill */}
                    <div
                      className="relative z-10 w-full rounded-t-md bg-[#22c55e] transition-all duration-300 group-hover:bg-[#16a34a]"
                      style={{
                        height: `${Math.min(100, Math.max(0, day.exactPercentage))}%`,
                      }}
                    />
                  </div>

                  {/* Day Abbreviation + Date + Fraction */}
                  <span
                    className={`mt-2.5 text-xs font-bold sm:text-sm ${
                      day.isToday ? 'text-[#16a34a]' : 'text-neutral-900'
                    }`}
                  >
                    {day.shortName}
                  </span>
                  <span className="mt-0.5 text-[11px] tabular-nums text-neutral-400">
                    {day.shortDateLabel}
                  </span>
                  <span className="mt-0.5 hidden text-[10px] font-medium tabular-nums text-neutral-400 sm:block">
                    {day.completed}/{day.total}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 7 Day Cards: Monday through Sunday */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {daySummaries.map((day) => {
          const isComplete = day.total > 0 && day.percentage === 100;
          const draftValue = drafts[day.isoDate] || '';

          return (
            <article
              key={day.isoDate}
              id={`day-card-${day.isoDate}`}
              className={`flex flex-col overflow-hidden rounded-xl border bg-white shadow-2xs transition-colors ${
                day.isToday
                  ? 'border-neutral-900 ring-1 ring-neutral-900/10'
                  : 'border-neutral-200 hover:border-neutral-300'
              }`}
            >
              {/* Card Header: Day Name, Date, and % Complete */}
              <div className="border-b border-neutral-100 bg-neutral-50/60 px-4 pt-4 pb-3.5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold tracking-[-0.02em] text-neutral-950">
                        {day.fullName}
                      </h3>
                      {day.isToday && (
                        <span className="rounded-full bg-neutral-950 px-2 py-0.5 text-[10px] font-bold tracking-wide text-white uppercase">
                          Today
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs font-medium tabular-nums text-neutral-500">
                      {day.fullDateLabel}
                    </p>
                  </div>

                  {/* Dynamic Completion Percentage Badge */}
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-extrabold tabular-nums transition-colors ${
                      isComplete
                        ? 'bg-green-100 text-[#15803d]'
                        : day.percentage > 0
                        ? 'bg-neutral-200/75 text-neutral-900'
                        : 'bg-neutral-100 text-neutral-400'
                    }`}
                  >
                    {day.percentage}%
                  </span>
                </div>

                {/* Per-Day Green Progress Bar */}
                <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-neutral-200/70">
                  <div
                    className="h-full rounded-full bg-[#22c55e] transition-all duration-300"
                    style={{
                      width: `${Math.min(100, Math.max(0, day.exactPercentage))}%`,
                    }}
                  />
                </div>

                <div className="mt-2 flex items-center justify-between text-[11px] tabular-nums text-neutral-500">
                  <span>
                    {day.total === 0
                      ? 'No tasks planned'
                      : `${day.completed} of ${day.total} completed`}
                  </span>
                  {isComplete && (
                    <span className="font-semibold text-[#16a34a]">Done</span>
                  )}
                </div>
              </div>

              {/* Tasks List */}
              <div className="flex-1 px-4 py-3">
                {day.tasks.length === 0 ? (
                  <div className="flex h-full min-h-[84px] items-center justify-center rounded-lg border border-dashed border-neutral-200/80 px-3 py-5 text-center">
                    <p className="text-xs text-neutral-400">
                      No tasks for {day.fullName}. Add one below.
                    </p>
                  </div>
                ) : (
                  <ul className="space-y-1.5">
                    {day.tasks.map((task) => {
                      const isEditingThis =
                        editingTask?.isoDate === day.isoDate &&
                        editingTask?.taskId === task.id;

                      if (isEditingThis) {
                        return (
                          <li
                            key={task.id}
                            className="flex items-center gap-1.5 rounded-lg bg-neutral-50 p-1"
                          >
                            <input
                              type="text"
                              autoFocus
                              value={editingTask.text}
                              onChange={(e) =>
                                setEditingTask({ ...editingTask, text: e.target.value })
                              }
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveTaskEdit();
                                if (e.key === 'Escape') setEditingTask(null);
                              }}
                              maxLength={120}
                              className="h-7 flex-1 rounded border border-neutral-900 bg-white px-2 text-xs font-medium text-neutral-950 focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={handleSaveTaskEdit}
                              aria-label="Save task"
                              className="flex h-6 w-6 items-center justify-center rounded bg-[#22c55e] text-white hover:bg-[#16a34a]"
                            >
                              <Check className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingTask(null)}
                              aria-label="Cancel edit"
                              className="flex h-6 w-6 items-center justify-center rounded border border-neutral-200 bg-white text-neutral-500 hover:text-neutral-900"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </li>
                        );
                      }

                      return (
                        <li
                          key={task.id}
                          className="group flex items-start justify-between gap-2 rounded-lg px-1.5 py-1.5 transition-colors hover:bg-neutral-50"
                        >
                          <div className="flex min-w-0 flex-1 items-start gap-2.5">
                            <label className="mt-0.5 flex shrink-0 items-center">
                              <input
                                type="checkbox"
                                checked={task.completed}
                                onChange={() => onToggleTask(day.isoDate, task.id)}
                                aria-label={`Mark "${task.text}" as ${
                                  task.completed ? 'incomplete' : 'complete'
                                }`}
                                className="peer sr-only"
                              />
                              <span
                                className={`flex h-[18px] w-[18px] items-center justify-center rounded-[4px] border transition-all duration-100 peer-focus-visible:ring-2 peer-focus-visible:ring-[#22c55e] peer-focus-visible:ring-offset-1 ${
                                  task.completed
                                    ? 'animate-check-pop border-[#22c55e] bg-[#22c55e] text-white'
                                    : 'border-neutral-300 bg-white text-transparent hover:border-[#22c55e]'
                                }`}
                              >
                                <Check className="h-3 w-3 stroke-[3]" />
                              </span>
                            </label>

                            <span
                              onDoubleClick={() =>
                                setEditingTask({
                                  isoDate: day.isoDate,
                                  taskId: task.id,
                                  text: task.text,
                                })
                              }
                              title="Double-click to edit task"
                              className={`break-words text-sm leading-snug transition-colors ${
                                task.completed
                                  ? 'text-neutral-400 line-through'
                                  : 'text-neutral-800'
                              }`}
                            >
                              {task.text}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => onDeleteTask(day.isoDate, task.id)}
                            title="Delete task"
                            aria-label={`Delete task "${task.text}"`}
                            className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-neutral-300 opacity-100 transition-all hover:bg-red-50 hover:text-red-600 sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              {/* Add Task Footer Form */}
              <form
                onSubmit={(e) => handleSubmitTask(e, day.isoDate)}
                className="flex items-center gap-1.5 border-t border-neutral-100 bg-white p-3"
              >
                <input
                  type="text"
                  value={draftValue}
                  onChange={(e) =>
                    setDrafts((prev) => ({ ...prev, [day.isoDate]: e.target.value }))
                  }
                  placeholder="Add a task..."
                  aria-label={`Add task for ${day.fullName}`}
                  maxLength={120}
                  className="h-8 min-w-0 flex-1 rounded-lg border border-neutral-200 bg-neutral-50/70 px-2.5 text-xs text-neutral-900 placeholder:text-neutral-400 transition-colors focus:border-neutral-900 focus:bg-white focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={!draftValue.trim()}
                  aria-label={`Submit task for ${day.fullName}`}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-neutral-950 text-white transition-colors hover:bg-neutral-800 disabled:cursor-not-allowed disabled:bg-neutral-200 disabled:text-neutral-400"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </form>
            </article>
          );
        })}
      </div>
    </section>
  );
};
