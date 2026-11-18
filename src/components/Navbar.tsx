import React, { useState } from 'react';
import { CheckSquare, BarChart3, ListTodo, Trash2, X } from 'lucide-react';
import { ActiveTab } from '../types/system';
import { formatPercent } from '../utils/calendar';

interface NavbarProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  totalCompleted: number;
  totalPossible: number;
  overallPercentage: number;
  monthLabel: string;
  hasAnyData: boolean;
  hasAnyEntries: boolean;
  onClearEntriesOnly: () => void;
  onClearAllData: () => void;
}

const TABS: {
  id: ActiveTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: 'tracker', label: 'Habit Tracker', icon: CheckSquare },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'weekly', label: "Weekly To-Do's", icon: ListTodo },
];

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onSelectTab,
  totalCompleted,
  totalPossible,
  overallPercentage,
  monthLabel,
  hasAnyData,
  hasAnyEntries,
  onClearEntriesOnly,
  onClearAllData,
}) => {
  const [showClearModal, setShowClearModal] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-neutral-200 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8">
          <div className="flex h-14 items-center justify-between gap-4">
            {/* Brand */}
            <button
              type="button"
              onClick={() => onSelectTab('tracker')}
              className="flex shrink-0 items-center gap-2.5 text-left focus:outline-none"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-neutral-950 shadow-2xs">
                <svg
                  viewBox="0 0 20 20"
                  fill="none"
                  className="h-4 w-4"
                  aria-hidden="true"
                >
                  <path
                    d="M5 10.5L8.25 13.75L15 6.75"
                    stroke="#22c55e"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              <span className="text-[17px] font-extrabold tracking-[-0.03em] text-neutral-950">
                System
              </span>
            </button>

            {/* Desktop / Tablet Top Navigation Tabs */}
            <nav
              aria-label="Primary"
              className="hidden h-full items-center gap-1 sm:flex"
            >
              {TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => onSelectTab(tab.id)}
                    className={`relative flex h-full items-center gap-2 px-3.5 text-sm transition-colors ${
                      isActive
                        ? 'font-semibold text-neutral-950'
                        : 'font-medium text-neutral-500 hover:text-neutral-900'
                    }`}
                  >
                    <Icon
                      className={`h-4 w-4 ${
                        isActive ? 'text-neutral-950' : 'text-neutral-400'
                      }`}
                    />
                    <span>{tab.label}</span>
                    {isActive && (
                      <span className="absolute right-0 bottom-0 left-0 h-[2px] rounded-full bg-neutral-950" />
                    )}
                  </button>
                );
              })}
            </nav>

            {/* Right Live Status Pill + Clear All Data Control */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onSelectTab('analytics')}
                title={`View ${monthLabel} analytics`}
                className="flex items-center gap-2.5 rounded-full border border-neutral-200 bg-neutral-50/80 px-3 py-1 text-xs transition-colors hover:border-neutral-300 hover:bg-neutral-100/80"
              >
                <span className="hidden text-neutral-500 lg:inline">{monthLabel}</span>
                <span className="hidden h-3 w-px bg-neutral-200 lg:inline-block" />
                <span className="h-1.5 w-12 overflow-hidden rounded-full bg-neutral-200">
                  <span
                    className="block h-full rounded-full bg-[#22c55e] transition-all duration-300"
                    style={{ width: `${Math.min(100, Math.max(0, overallPercentage))}%` }}
                  />
                </span>
                <span className="tabular-nums font-semibold text-neutral-950">
                  {formatPercent(overallPercentage, 0)}
                </span>
                <span className="hidden tabular-nums text-neutral-500 md:inline">
                  ({totalCompleted}/{totalPossible})
                </span>
              </button>

              {hasAnyData && (
                <button
                  type="button"
                  onClick={() => setShowClearModal(true)}
                  title="Clear all saved data"
                  aria-label="Clear all saved data"
                  className="inline-flex h-7 items-center gap-1 rounded-full border border-neutral-200 bg-white px-2.5 text-xs font-medium text-neutral-500 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2 className="h-3 w-3" />
                  <span className="hidden xl:inline">Clear Data</span>
                </button>
              )}
            </div>
          </div>

          {/* Mobile Top Navigation Tabs */}
          <nav
            aria-label="Primary mobile"
            className="-mx-4 flex border-t border-neutral-100 px-2 sm:hidden"
          >
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => onSelectTab(tab.id)}
                  className={`relative flex flex-1 items-center justify-center gap-1.5 py-2.5 text-xs transition-colors ${
                    isActive
                      ? 'font-semibold text-neutral-950'
                      : 'font-medium text-neutral-500 hover:text-neutral-800'
                  }`}
                >
                  <Icon
                    className={`h-3.5 w-3.5 shrink-0 ${
                      isActive ? 'text-neutral-950' : 'text-neutral-400'
                    }`}
                  />
                  <span className="truncate">{tab.label}</span>
                  {isActive && (
                    <span className="absolute right-2 bottom-0 left-2 h-[2px] rounded-full bg-neutral-950" />
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Minimal Clear Data Modal */}
      {showClearModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="clear-data-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4 backdrop-blur-[1px]"
          onClick={() => setShowClearModal(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2
                  id="clear-data-title"
                  className="text-base font-bold tracking-[-0.02em] text-neutral-950"
                >
                  Clear System Data
                </h2>
                <p className="mt-1 text-xs leading-relaxed text-neutral-500">
                  Choose whether to clear only your checkmarks and weekly tasks, or wipe
                  everything including your habit list from this browser.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowClearModal(false)}
                aria-label="Close modal"
                className="flex h-7 w-7 items-center justify-center rounded-lg text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-900"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-5 flex flex-col gap-2">
              {hasAnyEntries && (
                <button
                  type="button"
                  onClick={() => {
                    onClearEntriesOnly();
                    setShowClearModal(false);
                  }}
                  className="flex w-full items-center justify-between rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-left text-xs font-semibold text-neutral-900 transition-colors hover:border-neutral-300 hover:bg-neutral-50"
                >
                  <span>Clear checkmarks &amp; weekly tasks only</span>
                  <span className="font-normal text-neutral-400">Keep habits</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  onClearAllData();
                  setShowClearModal(false);
                }}
                className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-red-600 px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-red-700"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Clear all data (habits, checkmarks &amp; tasks)</span>
              </button>

              <button
                type="button"
                onClick={() => setShowClearModal(false)}
                className="mt-1 w-full rounded-xl py-2 text-xs font-medium text-neutral-500 transition-colors hover:bg-neutral-50 hover:text-neutral-900"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
