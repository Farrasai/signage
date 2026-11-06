"use client";

import { DAYS } from "@/lib/types";
import type { Announcement } from "@/lib/types";

/** Satu baris tabel jadwal pengumuman. */
export default function ScheduleRow({
  item,
  isPlaying,
  onToggleEnabled,
  onTogglePreview,
  onTriggerNow,
  onEdit,
  onRequestDelete,
}: {
  item: Announcement;
  isPlaying: boolean;
  onToggleEnabled: (item: Announcement) => void;
  onTogglePreview: (id: string, url: string) => void;
  onTriggerNow: (item: Announcement) => void;
  onEdit: (item: Announcement) => void;
  onRequestDelete: (item: Announcement) => void;
}) {
  return (
    <tr className="transition-colors hover:bg-slate-100 dark:bg-slate-800/50">
      {/* Toggle Status */}
      <td className="px-4 py-3.5">
        <label
          className="relative inline-flex cursor-pointer items-center"
          title={item.is_enabled ? "Jadwal Aktif (klik untuk nonaktifkan)" : "Jadwal Nonaktif (klik untuk aktifkan)"}
        >
          <input
            type="checkbox"
            checked={item.is_enabled}
            onChange={() => onToggleEnabled(item)}
            className="peer sr-only"
          />
          <div className="h-5 w-9 rounded-full bg-border peer-checked:bg-emerald-600 peer-focus:outline-none after:absolute after:left-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-full" />
        </label>
      </td>

      {/* Label & Audio Preview */}
      <td className="px-4 py-3.5">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => onTogglePreview(item.id, item.audio_url)}
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-colors ${
              isPlaying
                ? "bg-emerald-600 text-white animate-pulse"
                : "border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 hover:border-emerald-500 hover:text-slate-900 dark:text-white"
            }`}
            title={isPlaying ? "Jeda pratinjau audio" : "Dengarkan audio"}
          >
            {isPlaying ? "⏸" : "▶"}
          </button>
          <span className="font-medium text-slate-900 dark:text-white">{item.label}</span>
        </div>
      </td>

      {/* Jam Tayang */}
      <td className="px-4 py-3.5">
        <span className="font-mono text-sm font-semibold text-slate-900 dark:text-white">
          {item.time.slice(0, 5)}
        </span>
      </td>

      {/* Hari Aktif */}
      <td className="px-4 py-3.5">
        {item.days_of_week.length === 0 ? (
          <span className="rounded bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-xs text-slate-500 dark:text-slate-400">
            Setiap hari
          </span>
        ) : (
          <div className="flex flex-wrap gap-1">
            {item.days_of_week.map((day) => {
              const dInfo = DAYS.find((d) => d.value === day);
              return (
                <span
                  key={day}
                  className="rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 text-[11px] font-medium text-slate-500 dark:text-slate-400"
                >
                  {dInfo?.label ?? day}
                </span>
              );
            })}
          </div>
        )}
      </td>

      {/* Target Layar */}
      <td className="px-4 py-3.5 text-slate-500 dark:text-slate-400">
        {item.target_display_ids.length === 0 ? (
          <span className="text-xs">Semua layar</span>
        ) : (
          <span className="text-xs">{item.target_display_ids.length} layar</span>
        )}
      </td>

      {/* Repeat Count */}
      <td className="px-4 py-3.5 text-xs text-slate-500 dark:text-slate-400">{item.repeat_count}x</td>

      {/* Actions */}
      <td className="px-4 py-3.5 text-right">
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={() => onTriggerNow(item)}
            className="rounded-md border border-slate-200 dark:border-slate-800 px-2.5 py-1 text-xs text-slate-500 dark:text-slate-400 transition-colors hover:border-emerald-500 hover:text-slate-900 dark:text-white"
            title="Bunyikan sekarang ke layar TV tanpa menunggu jam jadwal"
          >
            ▶ Bunyikan
          </button>
          <button
            onClick={() => onEdit(item)}
            className="rounded-md border border-slate-200 dark:border-slate-800 px-2.5 py-1 text-xs text-slate-500 dark:text-slate-400 transition-colors hover:bg-slate-100 dark:bg-slate-800 hover:text-slate-900 dark:text-white"
          >
            Edit
          </button>
          <button
            onClick={() => onRequestDelete(item)}
            className="rounded-md border border-slate-200 dark:border-slate-800 px-2.5 py-1 text-xs text-slate-500 dark:text-slate-400 transition-colors hover:border-rose-400 hover:text-rose-600 dark:text-rose-400"
          >
            Hapus
          </button>
        </div>
      </td>
    </tr>
  );
}