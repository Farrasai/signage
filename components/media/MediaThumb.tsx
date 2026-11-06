"use client";

import type { Media } from "@/lib/types";

/**
 * Thumbnail konten untuk tampilan grid & list.
 * Video memakai elemen <video> yang di-mute (bukan poster) supaya tidak perlu
 * endpoint thumbnail tambahan; browser menampilkan frame pertama.
 */
export default function MediaThumb({ m, className }: { m: Media; className?: string }) {
  if (m.type === "image") {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={m.url} alt={m.name} className={`object-cover ${className ?? ""}`} />;
  }
  if (m.type === "video") {
    return <video src={m.url} className={`object-cover ${className ?? ""}`} muted />;
  }
  if (m.type === "table") {
    return (
      <div
        className={`flex flex-col items-center justify-center gap-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 ${className ?? ""}`}
      >
        <span className="text-xl">▦</span>
        <span className="text-[9px]">
          {m.content?.columns.length ?? 0}k · {m.content?.rows.length ?? 0}b
        </span>
      </div>
    );
  }
  return (
    <div className={`flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-red-400 ${className ?? ""}`}>
      <span className="text-xl">▶</span>
    </div>
  );
}