"use client";

import type { TabMode } from "./types";

/**
 * Toolbar halaman Pengumuman Suara: tab switcher (Jadwal / Siaran Langsung)
 * dan tombol CREATE.
 *
 * PENTING (AGENTS.md aturan UI #1 & #2): tombol tambah WAJIB permanen di
 * toolbar, tidak boleh hanya dirender di empty-state. `setActiveTab` juga
 * harus punya pemanggil, kalau tidak seluruh blok tab menjadi kode mati.
 */
export default function AnnouncerToolbar({
  activeTab,
  onTabChange,
  onCreate,
}: {
  activeTab: TabMode;
  onTabChange: (tab: TabMode) => void;
  onCreate: () => void;
}) {
  const tabClass = (tab: TabMode) =>
    `cursor-pointer rounded-lg px-3.5 py-1.5 text-sm transition-colors ${
      activeTab === tab
        ? "bg-white font-medium text-slate-900 dark:bg-slate-900 dark:text-white"
        : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
    }`;

  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div className="flex gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
        <button
          type="button"
          data-testid="tab-schedules"
          onClick={() => onTabChange("schedules")}
          aria-pressed={activeTab === "schedules"}
          className={tabClass("schedules")}
        >
          Jadwal Pengumuman
        </button>
        <button
          type="button"
          data-testid="tab-broadcast"
          onClick={() => onTabChange("broadcast")}
          aria-pressed={activeTab === "broadcast"}
          className={tabClass("broadcast")}
        >
          Siaran Langsung
        </button>
      </div>

      <button
        type="button"
        data-testid="add-schedule-announcement-button"
        onClick={onCreate}
        className="cursor-pointer rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white shadow hover:bg-emerald-700"
      >
        {activeTab === "schedules" ? "+ Tambah Pengumuman" : "🎤 Mulai Siaran"}
      </button>
    </div>
  );
}