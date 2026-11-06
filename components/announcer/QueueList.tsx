"use client";

import type { AnnouncerItem } from "@/lib/types";

/**
 * Panel antrean pengumuman suara yang sedang berjalan di TV.
 * Item indeks 0 = sedang diputar; sisanya menunggu giliran (FIFO).
 */
export default function QueueList({
  queue,
  loading,
  onCancel,
}: {
  queue: AnnouncerItem[];
  loading: boolean;
  onCancel: (item: AnnouncerItem) => void;
}) {
  return (
    <div className="card-lift rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
      <div className="border-b border-slate-200 dark:border-slate-800 px-4 py-3">
        <h2 className="text-sm font-medium">
          Antrean Pemutaran di TV{queue.length > 0 && ` (${queue.length} item)`}
        </h2>
      </div>

      {loading && (
        <div className="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400">Memuat antrean...</div>
      )}

      {!loading && queue.length === 0 && (
        <div className="px-4 py-10 text-center text-sm text-slate-500 dark:text-slate-400">
          Tidak ada siaran suara yang sedang aktif atau mengantre.
        </div>
      )}

      {!loading && queue.length > 0 && (
        <ul className="divide-y divide-border">
          {queue.map((item, idx) => (
            <li key={item.id} className="flex items-center gap-3 px-4 py-3">
              {idx === 0 ? (
                <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-red-500" title="Sedang diputar di TV" />
              ) : (
                <span className="h-2 w-2 shrink-0 rounded-full bg-border" title="Menunggu giliran" />
              )}

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{item.label}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Diulang {item.repeat_count}x
                  {item.target_display_ids.length > 0
                    ? ` · ${item.target_display_ids.length} layar`
                    : " · Semua layar"}
                </p>
              </div>

              {idx === 0 && (
                <span className="shrink-0 rounded-md bg-red-500/15 px-2 py-0.5 text-xs text-red-400">Diputar</span>
              )}

              <button
                onClick={() => onCancel(item)}
                className="shrink-0 text-xs text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:text-rose-400"
                title="Batalkan siaran ini dari antrean"
              >
                Batal
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}