"use client";

import type { Media } from "@/lib/types";

/** Input durasi inline (blur-to-save) — dipakai grid & list. */
export default function DurationInput({
  m,
  onSave,
}: {
  m: Media;
  onSave: (id: string, duration: number) => void;
}) {
  return (
    <label className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
      <input
        type="number"
        min={1}
        defaultValue={m.duration}
        onBlur={(e) => {
          const val = parseInt(e.target.value, 10);
          if (val > 0 && val !== m.duration) onSave(m.id, val);
        }}
        className="w-16 rounded-xl border border-slate-200 bg-slate-50 px-1.5 py-1 text-center font-mono font-extrabold outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-800"
        aria-label={`Durasi ${m.name}`}
      />
      <span>dtk</span>
    </label>
  );
}