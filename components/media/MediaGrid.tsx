"use client";

import type { Media } from "@/lib/types";
import { TYPE_BADGE, TYPE_LABEL } from "./constants";
import DurationInput from "./DurationInput";
import MediaThumb from "./MediaThumb";

/** Tampilan grid perpustakaan konten. */
export default function MediaGrid({
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
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
      {items.map((m) => (
        <div
          key={m.id}
          data-testid={`media-card-${m.id}`}
          className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="relative flex h-44 items-center justify-center overflow-hidden bg-slate-100 dark:bg-slate-800">
            <MediaThumb m={m} className="h-full w-full" />
            <span
              className={`absolute left-2 top-2 rounded-md px-1.5 py-0.5 text-[10px] font-medium ${TYPE_BADGE[m.type]}`}
            >
              {TYPE_LABEL[m.type]}
            </span>
          </div>
          <div className="p-3">
            <p className="truncate text-sm font-medium">{m.name}</p>
            <div className="mt-2.5 flex items-center justify-between gap-2">
              <DurationInput m={m} onSave={onSaveDuration} />
              <div className="flex items-center gap-2.5">
                <button
                  data-testid={`edit-media-${m.id}`}
                  onClick={() => onEdit(m)}
                  className="cursor-pointer rounded-xl border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
                >
                  Edit
                </button>
                <button
                  data-testid={`delete-media-${m.id}`}
                  onClick={() => onDelete(m)}
                  className="cursor-pointer rounded-xl border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-100 dark:border-rose-900/40 dark:bg-rose-950/30"
                >
                  Hapus
                </button>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}