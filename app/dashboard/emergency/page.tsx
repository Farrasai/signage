"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Display, EmergencyNotice } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";
import { sanitizeText } from "@/lib/sanitize";
import StatusDot from "@/components/StatusDot";
import EmergencyOverlay from "@/components/EmergencyOverlay";

const DEFAULT_TITLE = "PENGUMUMAN DARURAT LAYANAN";
const PRESETS = [
  { label: "Default", title: "PENGUMUMAN", message: "tes" },
  { label: "Rapat Staf AA", title: "PENGUMUMAN", message: "Mohon segera menuju titik kumpul di Ruang Aula" },
  { label: "Evakuasi Gedung", title: "EVAKUASI GEDUNG", message: "Mohon segera menuju titik kumpul di halaman depan. Ikuti petunjuk petugas." },
  { label: "Gangguan Layanan", title: "GANGGUAN LAYANAN", message: "Sistem sinkronisasi pusat sedang dalam pemeliharaan berkala. Pelayanan manual tetap berjalan." },
];

export default function EmergencyPage() {
  const [notice, setNotice] = useState<EmergencyNotice | null>(null);
  const [displays, setDisplays] = useState<Display[]>([]);
  const [loading, setLoading] = useState(true);

  const [title, setTitle] = useState(DEFAULT_TITLE);
  const [message, setMessage] = useState("");
  const [charCount, setCharCount] = useState({ title: DEFAULT_TITLE.length, message: 0 });
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
    const safeTitle = sanitizeText(title.trim() || DEFAULT_TITLE).slice(0, 120);
    const safeMessage = sanitizeText(message.trim()).slice(0, 1000);
    await supabase
      .from("emergency_notice")
      .update({
        title: safeTitle,
        message: safeMessage,
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
      {notice?.is_active && (
        <div data-testid="emergency-active-banner" className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3.5 dark:border-rose-900/50 dark:bg-rose-950/30">
          <div className="flex items-center gap-2.5 text-sm font-medium text-rose-700 dark:text-rose-300">
            <span className="h-2 w-2 animate-pulse rounded-full bg-rose-600" />
            Sedang tayang di {activeTargetCount} layar sejak {formatDateTime(notice.published_at)}
          </div>
          <button
            data-testid="emergency-close-button"
            onClick={handleClose}
            disabled={saving}
            className="rounded-md bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            Tutup Pengumuman di Semua Layar
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12 grid-cols-1 gap-6 lg:grid-cols-[1fr_380px]">
        <form onSubmit={handlePublish} className="min-w-0 space-y-4">
          <div>
            <p className="mb-2 text-xs font-bold tracking-widest text-slate-400 uppercase">Template Cepat</p>
              <div className="flex flex-wrap gap-2">{PRESETS.map((pr) => (<button key={pr.label} type="button" onClick={() => { setTitle(pr.title); setMessage(pr.message); }} className="cursor-pointer rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">{pr.label}</button>))}</div>
              <label className="mb-1.5 block text-sm text-slate-500 dark:text-slate-400">Judul</label>
            <input
              data-testid="emergency-title-input"
              value={title}
              maxLength={120}
              onChange={(e) => {
                setTitle(e.target.value);
                setCharCount((c) => ({ ...c, title: e.target.value.length }));
              }}
              placeholder={DEFAULT_TITLE}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800 px-3.5 py-2.5 text-sm outline-none focus:border-emerald-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
            <p className="mt-1 text-xs text-slate-400">{charCount.title}/120 karakter</p>
          </div>

          <div>
            <label className="mb-1.5 block text-sm text-slate-500 dark:text-slate-400">Pesan</label>
            <textarea
              data-testid="emergency-message-input"
              value={message}
              maxLength={1000}
              onChange={(e) => {
                setMessage(e.target.value);
                setCharCount((c) => ({ ...c, message: e.target.value.length }));
              }}
              rows={4}
              placeholder="Contoh: Sistem Sinkronisasi Pusat Sedang Dalam Pemeliharaan Berkala Selama 15 Menit. Pelayanan Manual Tetap Berjalan."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800 px-3.5 py-2.5 text-sm outline-none focus:border-emerald-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
            <p className="mt-1 text-xs text-slate-400">{charCount.message}/1000 karakter</p>
          </div>

          <div>
            <label className="mb-1.5 block text-sm text-slate-500 dark:text-slate-400">Tayangkan ke</label>
            <div className="flex gap-1 rounded-lg bg-white dark:bg-slate-900 p-1">
              <button
                data-testid="emergency-target-all"
                type="button"
                onClick={() => setTargetMode("all")}
                className={`flex-1 rounded-lg py-1.5 text-sm ${
                  targetMode === "all" ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white" : "text-slate-500 dark:text-slate-400"
                }`}
              >
                Semua layar
              </button>
              <button
                data-testid="emergency-target-specific"
                type="button"
                onClick={() => setTargetMode("specific")}
                className={`flex-1 rounded-lg py-1.5 text-sm ${
                  targetMode === "specific" ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white" : "text-slate-500 dark:text-slate-400"
                }`}
              >
                Pilih layar tertentu
              </button>
            </div>

            {targetMode === "specific" && (
              <div className="mt-3 max-h-56 space-y-1 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-800 p-2">
                {displays.length === 0 && (
                  <p className="px-2 py-3 text-center text-xs text-slate-500 dark:text-slate-400">
                    Belum ada layar terdaftar.
                  </p>
                )}
                {displays.map((d) => (
                  <label
                    key={d.id}
                    className="flex cursor-pointer items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-sm hover:bg-white dark:bg-slate-900"
                  >
                    <span className="flex items-center gap-2.5">
                      <input
                        type="checkbox"
                        data-testid={`emergency-target-${d.id}`}
                        checked={selectedIds.has(d.id)}
                        onChange={() => toggleDisplay(d.id)}
                        className="accent-emerald-600"
                      />
                      {d.name}
                    </span>
                    <StatusDot lastSeen={d.last_seen} />
                  </label>
                ))}
              </div>
            )}
          </div>

          {error && <p data-testid="emergency-error" className="text-sm text-rose-600 dark:text-rose-400">{error}</p>}

          <button
            data-testid="emergency-publish-button"
            type="submit"
            disabled={saving || loading}
            className="w-full cursor-pointer rounded-xl bg-rose-600 px-4 py-3.5 text-sm font-extrabold text-white shadow-lg shadow-rose-600/25 hover:bg-rose-500 disabled:opacity-50"
          >
            {saving
              ? "Menayangkan..."
              : `Tayangkan ke ${targetMode === "all" ? "Semua Layar" : `${targetCount} Layar Terpilih`}`}
          </button>
          <p className="text-center text-xs text-slate-500 dark:text-slate-400">
            Menayangkan ulang akan memperbarui judul/pesan/target yang sedang aktif juga.
          </p>
        </form>

        <div className="lg:sticky lg:top-24">
          <p className="mb-2 text-sm font-bold text-slate-900 dark:text-white">Pratinjau tampilan di layar</p>
          <p className="mb-2 text-xs text-slate-400">Rasio 16:9 — seperti yang dilihat TV</p>
          <div className="relative aspect-video overflow-hidden rounded-2xl border border-slate-900 bg-[#070b12]">
            <div className="pointer-events-none absolute inset-y-0 left-0 w-20 bg-gradient-to-r from-rose-700/75 to-transparent" aria-hidden="true"></div>
              <div className="pointer-events-none absolute inset-y-0 left-5 w-[1px] bg-white/15" aria-hidden="true"></div>
              <div className="pointer-events-none absolute inset-y-0 right-0 w-20 bg-gradient-to-l from-rose-700/75 to-transparent" aria-hidden="true"></div>
              <div className="pointer-events-none absolute inset-y-0 right-5 w-[1px] bg-white/15" aria-hidden="true"></div>
              <div className="absolute inset-0 flex items-center justify-center text-xs text-white/20">Konten layar</div>
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