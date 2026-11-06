"use client";

import type { Media } from "@/lib/types";
import { TYPE_BADGE, TYPE_LABEL, formatDate } from "./constants";
import DurationInput from "./DurationInput";
import MediaThumb from "./MediaThumb";

/** Tampilan list/tabel perpustakaan konten. */
export default function MediaList({
  items,
  onEdit,
  onDelete,
  onSaveDuration,
}: {
  items: Media[];
  onEdit: (m: Media) => void;
  onDelete: (m: Media) => void;
  onSaveDuration: (id: string, duration: number) => void;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-slate-200 dark:border-slate-800">
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Konten
            </th>
            <th className="hidden px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400 sm:table-cell">
              Tipe
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Durasi
            </th>
            <th className="hidden px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400 md:table-cell">
              Ditambahkan
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Aksi
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((m, idx) => (
            <tr
              key={m.id}
              className={`border-b border-slate-200 dark:border-slate-800 last:border-0 hover:bg-slate-100 dark:bg-slate-800 transition-colors ${
                idx % 2 === 1 ? "bg-slate-100 dark:bg-slate-800/30" : ""
              }`}
            >
              <td className="px-4 py-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-11 w-11 shrink-0 overflow-hidden rounded-md">
                    <MediaThumb m={m} className="h-full w-full" />
                  </div>
                  <span className="truncate font-medium">{m.name}</span>
                </div>
              </td>
              <td className="hidden px-4 py-3 sm:table-cell">
                <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${TYPE_BADGE[m.type]}`}>
                  {TYPE_LABEL[m.type]}
                </span>
              </td>
              <td className="px-4 py-3">
                <DurationInput m={m} onSave={onSaveDuration} />
              </td>
              <td className="hidden px-4 py-3 text-xs text-slate-500 dark:text-slate-400 md:table-cell">
                {m.created_at ? formatDate(m.created_at) : "-"}
              </td>
              <td className="px-4 py-3 text-right">
                <div className="flex items-center justify-end gap-3">
                  <button
                    onClick={() => onEdit(m)}
                    className="cursor-pointer rounded-xl border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600 btn-press hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => onDelete(m)}
                    className="cursor-pointer rounded-xl border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-600 btn-press hover:bg-rose-100 dark:border-rose-900/40 dark:bg-rose-950/30"
                  >
                    Hapus
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}