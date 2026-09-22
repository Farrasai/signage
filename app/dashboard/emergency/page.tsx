"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Display, EmergencyNotice } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";
import StatusDot from "@/components/StatusDot";
import EmergencyOverlay from "@/components/EmergencyOverlay";

const DEFAULT_TITLE = "PENGUMUMAN DARURAT LAYANAN";

export default function EmergencyPage() {
  const [notice, setNotice] = useState<EmergencyNotice | null>(null);
  const [displays, setDisplays] = useState<Display[]>([]);
  const [loading, setLoading] = useState(true);

  const [title, setTitle] = useState(DEFAULT_TITLE);
  const [message, setMessage] = useState("");
  const [targetMode, setTargetMode] = useState<"all" | "specific">("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const supabase = createClient();
    const [{ data: n }, { data: d }] = await Promise.all([
      supabase.from("emergency_notice").select("*").eq("id", 1).maybeSingle(),
      supabase.from("displays").select("*").order("name"),
    ]);
    setDisplays(d ?? []);
    if (n) {
      const notice = n as EmergencyNotice;
      setNotice(notice);
      setTitle(notice.title || DEFAULT_TITLE);
      setMessage(notice.message);
      if (notice.target_display_ids.length === 0) {
        setTargetMode("all");
      } else {
        setTargetMode("specific");
        setSelectedIds(new Set(notice.target_display_ids));
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  function toggleDisplay(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handlePublish(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!message.trim()) {
      setError("Isi pesan pengumuman terlebih dahulu.");
      return;
    }
    if (targetMode === "specific" && selectedIds.size === 0) {
      setError("Pilih minimal satu layar, atau gunakan opsi \"Semua layar\".");
      return;
    }

    setSaving(true);
    const supabase = createClient();
    const targetIds = targetMode === "all" ? [] : Array.from(selectedIds);
    await supabase
      .from("emergency_notice")
      .update({
        title: title.trim() || DEFAULT_TITLE,
        message: message.trim(),
        target_display_ids: targetIds,
        is_active: true,
        published_at: new Date().toISOString(),
      })
      .eq("id", 1);
    setSaving(false);
    load();
  }

  async function handleClose() {
    setSaving(true);
    const supabase = createClient();
    await supabase.from("emergency_notice").update({ is_active: false }).eq("id", 1);
    setSaving(false);
    load();
  }

  const targetCount = targetMode === "all" ? displays.length : selectedIds.size;
  const activeTargetCount = notice?.is_active
    ? notice.target_display_ids.length === 0
      ? displays.length
      : notice.target_display_ids.length
    : 0;

  return (
    <div>
      <header className="mb-7">
        <h1 className="font-display text-2xl font-semibold">Darurat</h1>
        <p className="mt-1 text-sm text-text-muted">
          Tayangkan banner peringatan yang menimpa (overlay) seluruh tampilan pada layar yang
          dipilih — konten di baliknya tetap berjalan, penutupan hanya dari halaman ini.
        </p>
      </header>

      {notice?.is_active && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-danger/40 bg-danger/10 px-4 py-3.5">
          <div className="flex items-center gap-2.5 text-sm text-danger">
            <span className="h-2 w-2 animate-pulse rounded-full bg-danger" />
            Sedang tayang di {activeTargetCount} layar sejak {formatDateTime(notice.published_at)}
          </div>
          <button
            onClick={handleClose}
            disabled={saving}
            className="rounded-lg bg-danger px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            Tutup Pengumuman di Semua Layar
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_380px]">
        <form onSubmit={handlePublish} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm text-text-muted">Judul</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={DEFAULT_TITLE}
              className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm outline-none focus:border-signal"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm text-text-muted">Pesan</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              placeholder="Contoh: Sistem Sinkronisasi Pusat Sedang Dalam Pemeliharaan Berkala Selama 15 Menit. Pelayanan Manual Tetap Berjalan."
              className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm outline-none focus:border-signal"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm text-text-muted">Tayangkan ke</label>
            <div className="flex gap-1 rounded-lg bg-surface p-1">
              <button
                type="button"
                onClick={() => setTargetMode("all")}
                className={`flex-1 rounded-md py-1.5 text-sm ${
                  targetMode === "all" ? "bg-surface-2 text-text" : "text-text-muted"
                }`}
              >
                Semua layar
              </button>
              <button
                type="button"
                onClick={() => setTargetMode("specific")}
                className={`flex-1 rounded-md py-1.5 text-sm ${
                  targetMode === "specific" ? "bg-surface-2 text-text" : "text-text-muted"
                }`}
              >
                Pilih layar tertentu
              </button>
            </div>

            {targetMode === "specific" && (
              <div className="mt-3 max-h-56 space-y-1 overflow-y-auto rounded-lg border border-border p-2">
                {displays.length === 0 && (
                  <p className="px-2 py-3 text-center text-xs text-text-muted">
                    Belum ada layar terdaftar.
                  </p>
                )}
                {displays.map((d) => (
                  <label
                    key={d.id}
                    className="flex cursor-pointer items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-sm hover:bg-surface"
                  >
                    <span className="flex items-center gap-2.5">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(d.id)}
                        onChange={() => toggleDisplay(d.id)}
                        className="accent-signal"
                      />
                      {d.name}
                    </span>
                    <StatusDot lastSeen={d.last_seen} />
                  </label>
                ))}
              </div>
            )}
          </div>

          {error && <p className="text-sm text-danger">{error}</p>}

          <button
            type="submit"
            disabled={saving || loading}
            className="w-full rounded-lg bg-danger px-4 py-3 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
          >
            {saving
              ? "Menayangkan..."
              : `🚨 Tayangkan ke ${targetMode === "all" ? "Semua Layar" : `${targetCount} Layar Terpilih`}`}
          </button>
          <p className="text-center text-xs text-text-muted">
            Menayangkan ulang akan memperbarui judul/pesan/target yang sedang aktif juga.
          </p>
        </form>

        <div>
          <p className="mb-2 text-sm text-text-muted">Pratinjau tampilan di layar</p>
          <div className="relative aspect-video overflow-hidden rounded-xl border border-border bg-black">
            <div className="absolute inset-0 flex items-center justify-center text-xs text-white/20">
              Konten layar
            </div>
            <EmergencyOverlay
              title={title.trim() || DEFAULT_TITLE}
              message={message.trim() || "Pesan pengumuman akan tampil di sini."}
              publishedAt={new Date().toISOString()}
            />
          </div>
        </div>
      </div>
    </div>
  );
}