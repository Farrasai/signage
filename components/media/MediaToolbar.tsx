"use client";

import type { FilterType, ViewMode } from "./constants";

/** Toolbar perpustakaan konten: pencarian, filter per tipe, dan pemilih tampilan. */
export default function MediaToolbar({
  search,
  filter,
  viewMode,
  pills,
  onSearchChange,
  onFilterChange,
  onViewModeChange,
}: {
  search: string;
  filter: FilterType;
  viewMode: ViewMode;
  pills: { key: FilterType; label: string; count: number }[];
  onSearchChange: (value: string) => void;
  onFilterChange: (filter: FilterType) => void;
  onViewModeChange: (mode: ViewMode) => void;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-center gap-2">
      {/* Search */}
      <div className="relative min-w-0 flex-1">
        <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-500 dark:text-slate-400 text-sm">
          ⌕
        </span>
        <input
          type="search"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Cari nama konten..."
          className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 py-2.5 pl-8 pr-3 text-sm outline-none focus:border-emerald-500"
          aria-label="Cari konten"
        />
      </div>

      {/* Filter pills */}
      <div className="flex flex-wrap gap-1">
        {pills.map((pill) => (
          <button
            key={pill.key}
            onClick={() => onFilterChange(pill.key)}
            aria-pressed={filter === pill.key}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              filter === pill.key
                ? "bg-emerald-600 text-white"
                : "border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 hover:border-emerald-500/40 hover:text-slate-900 dark:text-white"
            }`}
          >
            {pill.label}
            <span
              className={`rounded px-1 py-0.5 text-[10px] tabular-nums ${
                filter === pill.key ? "bg-white/20" : "bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400"
              }`}
            >
              {pill.count}
            </span>
          </button>
        ))}
      </div>

      {/* View toggle */}
      <div className="flex rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 p-0.5">
        <button
          onClick={() => onViewModeChange("grid")}
          aria-label="Tampilan grid"
          aria-pressed={viewMode === "grid"}
          title="Tampilan Grid"
          className={`rounded-lg px-2.5 py-1.5 text-sm transition-colors ${
            viewMode === "grid"
              ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white"
          }`}
        >
          ⊞
        </button>
        <button
          onClick={() => onViewModeChange("list")}
          aria-label="Tampilan list"
          aria-pressed={viewMode === "list"}
          title="Tampilan List"
          className={`rounded-lg px-2.5 py-1.5 text-sm transition-colors ${
            viewMode === "list"
              ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white"
          }`}
        >
          ☰
        </button>
      </div>
    </div>
  );
}