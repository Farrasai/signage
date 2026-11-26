"use client";

import { useEffect, useState } from "react";
import {
  getLastVideoError,
  getYouTubeFrameCount,
  type VideoDebugEntry,
} from "@/lib/video-debug";

type Snapshot = { entry: VideoDebugEntry | null; ageSec: number; ytFrames: number };

/**
 * Badge diagnostik kecil di player TV. Hanya dirender bila URL memakai `?debug=1`,
 * supaya tidak pernah mengganggu tampilan produksi.
 *
 * Tujuan: bisa dibaca langsung di layar TV (tanpa chrome://inspect) saat video
 * gagal — menampilkan penyebabnya: DECODE / NETWORK / SRC_NOT_SUPPORTED.
 *
 * Untuk konten YouTube tidak ada elemen <video> milik kita, jadi error <video>
 * tidak pernah terpicu. Karena itu badge juga menampilkan jumlah embed YouTube
 * yang aktif: kalau > 1, ada stream YouTube yang belum dihentikan dan
 * decoder sedang berebut -> frame beku/glitch.
 *
 * Catatan: `Date.now()` hanya dipanggil di dalam callback effect (bukan saat
 * render) supaya komponen tetap murni.
 */
export default function VideoDebugBadge() {
  const [snap, setSnap] = useState<Snapshot | null>(null);

  useEffect(() => {
    const tick = () => {
      const entry = getLastVideoError();
      const ytFrames = getYouTubeFrameCount();
      if (!entry && ytFrames === 0) {
        setSnap(null);
        return;
      }
      setSnap({
        entry,
        ageSec: entry ? Math.round((Date.now() - entry.at) / 1000) : 0,
        ytFrames,
      });
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  if (!snap) return null;

  const { entry, ageSec, ytFrames } = snap;

  return (
    <div className="pointer-events-none absolute left-3 top-3 z-40 max-w-md rounded-md bg-black/80 px-3 py-2 font-mono text-[11px] leading-relaxed text-white">
      {entry && (
        <>
          <div className="font-bold text-red-400">
            {entry.label} (code {entry.code})
          </div>
          <div>readyState: {entry.readyState}</div>
          <div>networkState: {entry.networkState}</div>
          <div>{ageSec}s lalu</div>
          <div className="truncate opacity-60" title={entry.url}>
            {entry.url}
          </div>
        </>
      )}
      <div className={entry ? "mt-1 text-emerald-300" : "font-bold text-emerald-300"}>
        embed YouTube aktif: {ytFrames}
        {ytFrames > 1 ? " (BAHAYA: >1 = decoder berebut)" : ""}
      </div>
    </div>
  );
}