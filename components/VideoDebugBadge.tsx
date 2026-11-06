"use client";

import { useEffect, useState } from "react";
import { getLastVideoError, type VideoDebugEntry } from "@/lib/video-debug";

type Snapshot = { entry: VideoDebugEntry; ageSec: number };

/**
 * Badge diagnostik kecil di player TV. Hanya dirender bila URL memakai `?debug=1`,
 * supaya tidak pernah mengganggu tampilan produksi.
 *
 * Tujuan: bisa dibaca langsung di layar TV (tanpa chrome://inspect) saat video
 * gagal — menampilkan penyebabnya: DECODE / NETWORK / SRC_NOT_SUPPORTED.
 *
 * Catatan: `Date.now()` hanya dipanggil di dalam callback effect (bukan saat
 * render) supaya komponen tetap murni.
 */
export default function VideoDebugBadge() {
  const [snap, setSnap] = useState<Snapshot | null>(null);

  useEffect(() => {
    const tick = () => {
      const entry = getLastVideoError();
      if (!entry) {
        setSnap(null);
        return;
      }
      setSnap({ entry, ageSec: Math.round((Date.now() - entry.at) / 1000) });
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  if (!snap) return null;

  const { entry, ageSec } = snap;

  return (
    <div className="pointer-events-none absolute left-3 top-3 z-40 max-w-md rounded-md bg-black/80 px-3 py-2 font-mono text-[11px] leading-relaxed text-white">
      <div className="font-bold text-red-400">
        {entry.label} (code {entry.code})
      </div>
      <div>readyState: {entry.readyState}</div>
      <div>networkState: {entry.networkState}</div>
      <div>{ageSec}s lalu</div>
      <div className="truncate opacity-60" title={entry.url}>
        {entry.url}
      </div>
    </div>
  );
}