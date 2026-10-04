"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { AnnouncerItem, Display } from "@/lib/types";
import Modal from "@/components/Modal";
import StatusDot from "@/components/StatusDot";

export default function AnnouncerPage() {
  const [queue, setQueue] = useState<AnnouncerItem[]>([]);
  const [displays, setDisplays] = useState<Display[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);

  // Form state
  const [label, setLabel] = useState("Pengumuman");
  const [repeatCount, setRepeatCount] = useState<1 | 2 | 3>(1);
  const [targetMode, setTargetMode] = useState<"all" | "specific">("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const supabase = createClient();
    const [{ data: q }, { data: d }] = await Promise.all([
      supabase.from("announcer_queue").select("*").order("created_at", { ascending: true }),
      supabase.from("displays").select("*").order("name"),
    ]);
    setQueue((q as AnnouncerItem[]) ?? []);
    setDisplays((d as Display[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();

    const supabase = createClient();
    const channel = supabase
      .channel("announcer-dashboard")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "announcer_queue" },
        (payload) => setQueue((q) => [...q, payload.new as AnnouncerItem])
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "announcer_queue" },
        (payload) =>
          setQueue((q) => q.filter((i) => i.id !== (payload.old as { id: string }).id))
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [load]);

  function resetForm() {
    setLabel("Pengumuman");
    setRepeatCount(1);
    setTargetMode("all");
    setSelectedIds(new Set());
    setFile(null);
    setFormError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (!file) {
      setFormError("Pilih file audio terlebih dahulu.");
      return;
    }
    if (targetMode === "specific" && selectedIds.size === 0) {
      setFormError("Pilih minimal satu layar, atau gunakan opsi \"Semua layar\".");
      return;
    }

    setUploading(true);
    const supabase = createClient();

    const path = `${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_")}`;
    const { error: uploadError } = await supabase.storage
      .from("announcer")
      .upload(path, file, { cacheControl: "31536000", upsert: false });

    if (uploadError) {
      setFormError(`Gagal mengunggah: ${uploadError.message}`);
      setUploading(false);
      return;
    }

    const { data: pub } = supabase.storage.from("announcer").getPublicUrl(path);
    await supabase.from("announcer_queue").insert({
      label: label.trim() || "Pengumuman",
      audio_url: pub.publicUrl,
      repeat_count: repeatCount,
      target_display_ids: targetMode === "all" ? [] : Array.from(selectedIds),
    });

    setUploading(false);
    setShowAdd(false);
    resetForm();
  }

  async function handleCancel(item: AnnouncerItem) {
    const supabase = createClient();
    // Hapus file audio dari Storage
    const parts = item.audio_url.split("/");
    const storagePath = parts.slice(parts.indexOf("announcer") + 1).join("/");
    if (storagePath) {
      await supabase.storage.from("announcer").remove([decodeURIComponent(storagePath)]);
    }
    await supabase.from("announcer_queue").delete().eq("id", item.id);
  }

  function toggleDisplay(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const currentItem = queue[0] ?? null;

  return (
    <div>
      <header className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold">Pengumuman Suara</h1>
          <p className="mt-1 text-sm text-text-muted">
            Kirim audio ke satu atau semua layar. Diputar bergantian (FIFO), tidak mengganggu konten yang tayang.
          </p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="shrink-0 rounded-md btn-aurora px-4 py-2 text-sm font-medium hover:opacity-90"
        >
          + Tambah Pengumuman
        </button>
      </header>

      {/* Antrean */}
      <div className="rounded-2xl border border-border bg-surface">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-sm font-medium">
            Antrean{queue.length > 0 && ` (${queue.length} item)`}
          </h2>
        </div>

        {loading && (
          <div className="px-4 py-8 text-center text-sm text-text-muted">Memuat...</div>
        )}

        {!loading && queue.length === 0 && (
          <div className="px-4 py-10 text-center text-sm text-text-muted">
            Belum ada pengumuman dalam antrean.
          </div>
        )}

        {!loading && queue.length > 0 && (
          <ul className="divide-y divide-border">
            {queue.map((item, idx) => (
              <li key={item.id} className="flex items-center gap-3 px-4 py-3">
                {/* Status indikator */}
                {idx === 0 ? (
                  <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-red-500" title="Sedang diputar" />
                ) : (
                  <span className="h-2 w-2 shrink-0 rounded-full bg-border" title="Menunggu" />
                )}

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{item.label}</p>
                  <p className="text-xs text-text-muted">
                    Diulang {item.repeat_count}x
                    {item.target_display_ids.length > 0
                      ? ` · ${item.target_display_ids.length} layar`
                      : " · Semua layar"}
                  </p>
                </div>

                {idx === 0 && (
                  <span className="shrink-0 rounded-md bg-red-500/15 px-2 py-0.5 text-xs text-red-400">
                    Diputar
                  </span>
                )}

                <button
                  onClick={() => handleCancel(item)}
                  className="shrink-0 text-xs text-text-muted hover:text-danger"
                  title="Batalkan dan hapus dari antrean"
                >
                  Batal
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Preview status */}
      {currentItem && (
        <p className="mt-3 text-xs text-text-muted">
          Layar yang mendapat pengumuman saat ini:{" "}
          <span className="text-text">
            {currentItem.target_display_ids.length === 0
              ? "Semua layar"
              : `${currentItem.target_display_ids.length} layar terpilih`}
          </span>
        </p>
      )}

      {/* Modal tambah */}
      {showAdd && (
        <Modal title="Tambah Pengumuman Suara" onClose={() => { setShowAdd(false); resetForm(); }}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm text-text-muted">Label pengumuman</label>
              <input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Contoh: Pengumuman Rapat Siang"
                className="w-full rounded-lg border border-border bg-surface-2 px-3.5 py-2.5 text-sm outline-none focus:border-signal"
              />
              <p className="mt-1 text-xs text-text-muted">Teks ini muncul di badge 🎤 pada layar TV.</p>
            </div>

            <div>
              <label className="mb-1.5 block text-sm text-text-muted">
                File audio (.mp3, .wav, .ogg)
              </label>
              <label className="flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-border py-7 text-sm text-text-muted hover:border-signal/50">
                {file ? (
                  <>
                    <span className="text-base">🎵</span>
                    <span className="font-medium text-text">{file.name}</span>
                    <span className="text-xs">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                  </>
                ) : (
                  <>
                    <span>Klik untuk pilih file audio</span>
                    <span className="text-xs">MP3, WAV, OGG</span>
                  </>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="audio/*"
                  className="hidden"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  disabled={uploading}
                />
              </label>
            </div>

            <div>
              <label className="mb-1.5 block text-sm text-text-muted">Diulang</label>
              <div className="flex gap-1 rounded-lg bg-surface-2 p-1">
                {([1, 2, 3] as const).map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setRepeatCount(n)}
                    className={`flex-1 rounded-md py-1.5 text-sm ${
                      repeatCount === n ? "bg-surface text-text" : "text-text-muted"
                    }`}
                  >
                    {n}x
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm text-text-muted">Tayangkan ke</label>
              <div className="flex gap-1 rounded-lg bg-surface-2 p-1">
                <button
                  type="button"
                  onClick={() => setTargetMode("all")}
                  className={`flex-1 rounded-md py-1.5 text-sm ${
                    targetMode === "all" ? "bg-surface text-text" : "text-text-muted"
                  }`}
                >
                  Semua layar
                </button>
                <button
                  type="button"
                  onClick={() => setTargetMode("specific")}
                  className={`flex-1 rounded-md py-1.5 text-sm ${
                    targetMode === "specific" ? "bg-surface text-text" : "text-text-muted"
                  }`}
                >
                  Pilih layar
                </button>
              </div>

              {targetMode === "specific" && (
                <div className="mt-3 max-h-48 space-y-1 overflow-y-auto rounded-lg border border-border p-2">
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

            {formError && <p className="text-sm text-danger">{formError}</p>}

            <button
              type="submit"
              disabled={uploading}
              className="w-full rounded-md btn-aurora px-4 py-2.5 text-sm font-medium hover:opacity-90 disabled:opacity-50"
            >
              {uploading ? "Mengunggah..." : `🎤 Mulai Pengumuman${targetMode === "specific" ? ` ke ${selectedIds.size} Layar` : ""}`}
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}

