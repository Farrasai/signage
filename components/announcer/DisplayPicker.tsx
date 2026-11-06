"use client";

import type { Display } from "@/lib/types";
import StatusDot from "@/components/StatusDot";

/**
 * Daftar centang target layar. Dipakai bersama oleh form Jadwal Pengumuman
 * dan form Siaran Langsung — jangan duplikasi markup ini di dua tempat.
 */
export default function DisplayPicker({
  displays,
  selected,
  onToggle,
}: {
  displays: Display[];
  selected: Set<string>;
  onToggle: (id: string) => void;
}) {
  return (
    <div className="mt-3 max-h-40 space-y-1 overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-800 p-2">
      {displays.length === 0 && (
        <p className="px-2 py-3 text-center text-xs text-slate-500 dark:text-slate-400">
          Belum ada layar terdaftar.
        </p>
      )}
      {displays.map((d) => (
        <label
          key={d.id}
          className="flex cursor-pointer items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-sm hover:bg-white dark:bg-slate-900"
        >
          <span className="flex items-center gap-2.5">
            <input
              type="checkbox"
              checked={selected.has(d.id)}
              onChange={() => onToggle(d.id)}
              className="accent-emerald-600"
            />
            {d.name}
          </span>
          <StatusDot lastSeen={d.last_seen} />
        </label>
      ))}
    </div>
  );
}