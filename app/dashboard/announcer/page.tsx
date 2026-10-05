"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Announcement, AnnouncerItem, DayOfWeek, Display } from "@/lib/types";
import { DAYS } from "@/lib/types";
import Modal from "@/components/Modal";
import StatusDot from "@/components/StatusDot";

type TabMode = "schedules" | "broadcast";

export default function AnnouncerPage() {
  const [activeTab, setActiveTab] = useState<TabMode>("schedules");
  const [displays, setDisplays] = useState<Display[]>([]);
  const [loading, setLoading] = useState(true);

  // ---------- Master Schedules State ----------
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Announcement | null>(null);
  const [confirmDeleteSchedule, setConfirmDeleteSchedule] = useState<Announcement | null>(null);

  // Form Schedule State
  const [schedLabel, setSchedLabel] = useState("Pengumuman");
  const [schedTime, setSchedTime] = useState("08:00");
  const [schedDays, setSchedDays] = useState<Set<DayOfWeek>>(new Set());
  const [schedRepeat, setSchedRepeat] = useState<1 | 2 | 3>(1);
  const [schedTargetMode, setSchedTargetMode] = useState<"all" | "specific">("all");
  const [schedSelectedDisplays, setSchedSelectedDisplays] = useState<Set<string>>(new Set());
  const [schedFile, setSchedFile] = useState<File | null>(null);
  const [schedEnabled, setSchedEnabled] = useState(true);
  const [schedSaving, setSchedSaving] = useState(false);
  const [schedError, setSchedError] = useState<string | null>(null);
  const schedFileInputRef = useRef<HTMLInputElement>(null);

  // Audio Preview State
  const [previewAudioId, setPreviewAudioId] = useState<string | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  // Trigger feedback
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // ---------- Broadcast & Queue State ----------
  const [queue, setQueue] = useState<AnnouncerItem[]>([]);
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [broadcastLabel, setBroadcastLabel] = useState("Pengumuman Siaran Langsung");
  const [broadcastRepeat, setBroadcastRepeat] = useState<1 | 2 | 3>(1);
  const [broadcastTargetMode, setBroadcastTargetMode] = useState<"all" | "specific">("all");
  const [broadcastSelectedDisplays, setBroadcastSelectedDisplays] = useState<Set<string>>(new Set());
  const [broadcastFile, setBroadcastFile] = useState<File | null>(null);
  const [broadcastUploading, setBroadcastUploading] = useState(false);
  const [broadcastError, setBroadcastError] = useState<string | null>(null);
  const broadcastFileInputRef = useRef<HTMLInputElement>(null);

  // ---------- Load Data & Realtime ----------
  const load = useCallback(async () => {
    const supabase = createClient();
    const [{ data: ann }, { data: q }, { data: d }] = await Promise.all([
      supabase.from("announcements").select("*").order("time", { ascending: true }),
      supabase.from("announcer_queue").select("*").order("created_at", { ascending: true }),
      supabase.from("displays").select("*").order("name"),
    ]);

    setAnnouncements((ann as Announcement[]) ?? []);
    setQueue((q as AnnouncerItem[]) ?? []);
    setDisplays((d as Display[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();

    const supabase = createClient();
    const channel = supabase
      .channel("announcer-mgmt")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "announcements" },
        async () => {
          const { data } = await supabase.from("announcements").select("*").order("time", { ascending: true });
          if (data) setAnnouncements(data as Announcement[]);
        }
      )
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
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
        previewAudioRef.current = null;
      }
    };
  }, [load]);

  // ---------- Audio Preview Controller ----------
  function togglePreviewAudio(id: string, url: string) {
    if (previewAudioId === id) {
      previewAudioRef.current?.pause();
      setPreviewAudioId(null);
      return;
    }

    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
    }

    const audio = new Audio(url);
    previewAudioRef.current = audio;
    setPreviewAudioId(id);

    audio.onended = () => {
      setPreviewAudioId(null);
    };

    audio.onerror = () => {
      setPreviewAudioId(null);
    };

    audio.play().catch(() => {
      setPreviewAudioId(null);
    });
  }

  // ---------- Action: Bunyikan Sekarang (Trigger to Queue) ----------
  async function handleTriggerNow(item: Announcement) {
    const supabase = createClient();
    const { error } = await supabase.from("announcer_queue").insert({
      label: item.label,
      audio_url: item.audio_url,
      repeat_count: item.repeat_count,
      target_display_ids: item.target_display_ids,
    });

    if (!error) {
      setActionNotice(`Pengumuman "${item.label}" berhasil dimasukkan ke antrean siaran TV!`);
      setTimeout(() => setActionNotice(null), 4000);
    }
  }

  // ---------- Toggle Enable/Disable Schedule ----------
  async function handleToggleEnabled(item: Announcement) {
    const nextVal = !item.is_enabled;
    setAnnouncements((prev) =>
      prev.map((a) => (a.id === item.id ? { ...a, is_enabled: nextVal } : a))
    );

    const supabase = createClient();
    await supabase.from("announcements").update({ is_enabled: nextVal }).eq("id", item.id);
  }

  // ---------- Open Create / Edit Schedule Modal ----------
  function openAddScheduleModal() {
    setEditingSchedule(null);
    setSchedLabel("Pengumuman");
    setSchedTime("08:00");
    setSchedDays(new Set());
    setSchedRepeat(1);
    setSchedTargetMode("all");
    setSchedSelectedDisplays(new Set());
    setSchedFile(null);
    setSchedEnabled(true);
    setSchedError(null);
    if (schedFileInputRef.current) schedFileInputRef.current.value = "";
    setShowScheduleModal(true);
  }

  function openEditScheduleModal(item: Announcement) {
    setEditingSchedule(item);
    setSchedLabel(item.label);
    setSchedTime(item.time.slice(0, 5));
    setSchedDays(new Set(item.days_of_week));
    setSchedRepeat(item.repeat_count as 1 | 2 | 3);
    setSchedTargetMode(item.target_display_ids.length === 0 ? "all" : "specific");
    setSchedSelectedDisplays(new Set(item.target_display_ids));
    setSchedFile(null);
    setSchedEnabled(item.is_enabled);
    setSchedError(null);
    if (schedFileInputRef.current) schedFileInputRef.current.value = "";
    setShowScheduleModal(true);
  }

  // ---------- Save Schedule (Create or Update) ----------
  async function handleSaveSchedule(e: React.FormEvent) {
    e.preventDefault();
    setSchedError(null);

    if (!schedLabel.trim()) {
      setSchedError("Label pengumuman wajib diisi.");
      return;
    }
    if (!schedTime) {
      setSchedError("Waktu tayang wajib diisi.");
      return;
    }
    if (!editingSchedule && !schedFile) {
      setSchedError("Pilih file audio terlebih dahulu.");
      return;
    }
    if (schedTargetMode === "specific" && schedSelectedDisplays.size === 0) {
      setSchedError("Pilih minimal satu layar atau gunakan opsi 'Semua layar'.");
      return;
    }

    setSchedSaving(true);
    const supabase = createClient();
    let audioUrl = editingSchedule ? editingSchedule.audio_url : "";

    // Upload audio jika ada file baru
    if (schedFile) {
      const path = `${crypto.randomUUID()}-${schedFile.name.replace(/[^a-zA-Z0-9.\-_]/g, "_")}`;
      const { error: uploadError } = await supabase.storage
        .from("announcer")
        .upload(path, schedFile, { cacheControl: "31536000", upsert: false });

      if (uploadError) {
        setSchedError(`Gagal mengunggah file audio: ${uploadError.message}`);
        setSchedSaving(false);
        return;
      }

      // Hapus audio lama jika sedang edit dan berganti file
      if (editingSchedule && editingSchedule.audio_url) {
        const parts = editingSchedule.audio_url.split("/");
        const oldPath = parts.slice(parts.indexOf("announcer") + 1).join("/");
        if (oldPath) {
          await supabase.storage.from("announcer").remove([decodeURIComponent(oldPath)]);
        }
      }

      const { data: pub } = supabase.storage.from("announcer").getPublicUrl(path);
      audioUrl = pub.publicUrl;
    }

    const payload = {
      label: schedLabel.trim(),
      audio_url: audioUrl,
      time: schedTime,
      days_of_week: Array.from(schedDays),
      repeat_count: schedRepeat,
      target_display_ids: schedTargetMode === "all" ? [] : Array.from(schedSelectedDisplays),
      is_enabled: schedEnabled,
    };

    if (editingSchedule) {
      const { error: updateError } = await supabase
        .from("announcements")
        .update(payload)
        .eq("id", editingSchedule.id);

      if (updateError) {
        setSchedError(`Gagal memperbarui: ${updateError.message}`);
        setSchedSaving(false);
        return;
      }
    } else {
      const { error: insertError } = await supabase.from("announcements").insert(payload);
      if (insertError) {
        setSchedError(`Gagal menyimpan: ${insertError.message}`);
        setSchedSaving(false);
        return;
      }
    }

    setSchedSaving(false);
    setShowScheduleModal(false);
    load();
  }

  // ---------- Delete Schedule ----------
  async function handleDeleteSchedule() {
    if (!confirmDeleteSchedule) return;
    const supabase = createClient();

    // Bersihkan file audio dari storage
    const parts = confirmDeleteSchedule.audio_url.split("/");
    const oldPath = parts.slice(parts.indexOf("announcer") + 1).join("/");
    if (oldPath) {
      await supabase.storage.from("announcer").remove([decodeURIComponent(oldPath)]);
    }

    await supabase.from("announcements").delete().eq("id", confirmDeleteSchedule.id);
    setConfirmDeleteSchedule(null);
    load();
  }

  // ---------- Broadcast Submit (Instant) ----------
  async function handleBroadcastSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBroadcastError(null);

    if (!broadcastFile) {
      setBroadcastError("Pilih file audio siaran terlebih dahulu.");
      return;
    }
    if (broadcastTargetMode === "specific" && broadcastSelectedDisplays.size === 0) {
      setBroadcastError("Pilih minimal satu layar atau gunakan opsi 'Semua layar'.");
      return;
    }

    setBroadcastUploading(true);
    const supabase = createClient();

    const path = `${crypto.randomUUID()}-${broadcastFile.name.replace(/[^a-zA-Z0-9.\-_]/g, "_")}`;
    const { error: uploadError } = await supabase.storage
      .from("announcer")
      .upload(path, broadcastFile, { cacheControl: "31536000", upsert: false });

    if (uploadError) {
      setBroadcastError(`Gagal mengunggah file audio: ${uploadError.message}`);
      setBroadcastUploading(false);
      return;
    }

    const { data: pub } = supabase.storage.from("announcer").getPublicUrl(path);
    await supabase.from("announcer_queue").insert({
      label: broadcastLabel.trim() || "Pengumuman",
      audio_url: pub.publicUrl,
      repeat_count: broadcastRepeat,
      target_display_ids: broadcastTargetMode === "all" ? [] : Array.from(broadcastSelectedDisplays),
    });

    setBroadcastUploading(false);
    setShowBroadcastModal(false);
    setBroadcastFile(null);
    if (broadcastFileInputRef.current) broadcastFileInputRef.current.value = "";
  }

  // ---------- Cancel Queue Item ----------
  async function handleCancelQueueItem(item: AnnouncerItem) {
    const supabase = createClient();
    const parts = item.audio_url.split("/");
    const storagePath = parts.slice(parts.indexOf("announcer") + 1).join("/");
    if (storagePath) {
      await supabase.storage.from("announcer").remove([decodeURIComponent(storagePath)]);
    }
    await supabase.from("announcer_queue").delete().eq("id", item.id);
  }

  // Helper toggle day
  function toggleDay(day: DayOfWeek) {
    setSchedDays((prev) => {
      const next = new Set(prev);
      if (next.has(day)) next.delete(day);
      else next.add(day);
      return next;
    });
  }

  return (
    <div>
      {/* Header & Tabs */}
      <header className="mb-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-semibold">Pengumuman Suara</h1>
            <p className="mt-1 text-sm text-text-muted">
              Atur jadwal pengumuman otomatis atau siarkan audio langsung ke TV tanpa mengganggu playlist visual.
            </p>
          </div>

          {activeTab === "schedules" ? (
            <button
              onClick={openAddScheduleModal}
              className="shrink-0 rounded-md btn-aurora px-4 py-2 text-sm font-medium hover:opacity-90"
            >
              + Tambah Jadwal
            </button>
          ) : (
            <button
              onClick={() => setShowBroadcastModal(true)}
              className="shrink-0 rounded-md btn-aurora px-4 py-2 text-sm font-medium hover:opacity-90"
            >
              + Siaran Langsung
            </button>
          )}
        </div>

        {/* Tab Switcher */}
        <div className="mt-6 flex border-b border-border">
          <button
            onClick={() => setActiveTab("schedules")}
            className={`border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              activeTab === "schedules"
                ? "border-signal text-text"
                : "border-transparent text-text-muted hover:text-text"
            }`}
          >
            🗓 Jadwal Pengumuman ({announcements.length})
          </button>
          <button
            onClick={() => setActiveTab("broadcast")}
            className={`border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              activeTab === "broadcast"
                ? "border-signal text-text"
                : "border-transparent text-text-muted hover:text-text"
            }`}
          >
            ⚡ Siaran Langsung & Antrean {queue.length > 0 && `(${queue.length})`}
          </button>
        </div>
      </header>

      {/* Alert Notifikasi Aksi */}
      {actionNotice && (
        <div className="mb-4 flex items-center justify-between rounded-lg border border-signal/30 bg-signal-soft px-4 py-3 text-sm text-text">
          <span>✓ {actionNotice}</span>
          <button onClick={() => setActionNotice(null)} className="text-text-muted hover:text-text">
            ✕
          </button>
        </div>
      )}

      {/* ================= TAB 1: PENGUMUMAN TERJADWAL ================= */}
      {activeTab === "schedules" && (
        <div className="space-y-4">
          <div className="overflow-hidden rounded-2xl border border-border bg-surface">
            {loading ? (
              <div className="px-4 py-12 text-center text-sm text-text-muted">Memuat data jadwal...</div>
            ) : announcements.length === 0 ? (
              <div className="px-4 py-12 text-center">
                <p className="text-base font-medium text-text">Belum ada jadwal pengumuman.</p>
                <p className="mt-1 text-xs text-text-muted">
                  Buat pengumuman bersuara yang akan otomatis diputar pada jam dan hari tertentu.
                </p>
                <button
                  onClick={openAddScheduleModal}
                  className="mt-4 rounded-md btn-aurora px-4 py-2 text-xs font-medium"
                >
                  Buat Jadwal Pertama
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-border bg-surface-2 text-xs text-text-muted">
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium">Label & Pratinjau</th>
                      <th className="px-4 py-3 font-medium">Jam Tayang</th>
                      <th className="px-4 py-3 font-medium">Hari Aktif</th>
                      <th className="px-4 py-3 font-medium">Target Layar</th>
                      <th className="px-4 py-3 font-medium">Ulang</th>
                      <th className="px-4 py-3 text-right font-medium">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {announcements.map((item) => {
                      const isPlaying = previewAudioId === item.id;
                      return (
                        <tr key={item.id} className="transition-colors hover:bg-surface-2/50">
                          {/* Toggle Status */}
                          <td className="px-4 py-3.5">
                            <label className="relative inline-flex cursor-pointer items-center" title={item.is_enabled ? "Jadwal Aktif (klik untuk nonaktifkan)" : "Jadwal Nonaktif (klik untuk aktifkan)"}>
                              <input
                                type="checkbox"
                                checked={item.is_enabled}
                                onChange={() => handleToggleEnabled(item)}
                                className="peer sr-only"
                              />
                              <div className="h-5 w-9 rounded-full bg-border peer-checked:bg-signal peer-focus:outline-none after:absolute after:left-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-full" />
                            </label>
                          </td>

                          {/* Label & Audio Preview */}
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-2.5">
                              <button
                                onClick={() => togglePreviewAudio(item.id, item.audio_url)}
                                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-colors ${
                                  isPlaying
                                    ? "bg-signal text-white animate-pulse"
                                    : "border border-border text-text-muted hover:border-signal hover:text-text"
                                }`}
                                title={isPlaying ? "Jeda pratinjau audio" : "Dengarkan audio"}
                              >
                                {isPlaying ? "⏸" : "▶"}
                              </button>
                              <span className="font-medium text-text">{item.label}</span>
                            </div>
                          </td>

                          {/* Jam Tayang */}
                          <td className="px-4 py-3.5">
                            <span className="font-mono text-sm font-semibold text-text">
                              {item.time.slice(0, 5)}
                            </span>
                          </td>

                          {/* Hari Aktif */}
                          <td className="px-4 py-3.5">
                            {item.days_of_week.length === 0 ? (
                              <span className="rounded bg-surface-2 px-2 py-0.5 text-xs text-text-muted">
                                Setiap hari
                              </span>
                            ) : (
                              <div className="flex flex-wrap gap-1">
                                {item.days_of_week.map((day) => {
                                  const dInfo = DAYS.find((d) => d.value === day);
                                  return (
                                    <span
                                      key={day}
                                      className="rounded bg-surface-2 px-1.5 py-0.5 text-[11px] font-medium text-text-muted"
                                    >
                                      {dInfo?.label ?? day}
                                    </span>
                                  );
                                })}
                              </div>
                            )}
                          </td>

                          {/* Target Layar */}
                          <td className="px-4 py-3.5 text-text-muted">
                            {item.target_display_ids.length === 0 ? (
                              <span className="text-xs">Semua layar</span>
                            ) : (
                              <span className="text-xs">{item.target_display_ids.length} layar</span>
                            )}
                          </td>

                          {/* Repeat Count */}
                          <td className="px-4 py-3.5 text-xs text-text-muted">
                            {item.repeat_count}x
                          </td>

                          {/* Actions */}
                          <td className="px-4 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleTriggerNow(item)}
                                className="rounded-md border border-border px-2.5 py-1 text-xs text-text-muted transition-colors hover:border-signal hover:text-text"
                                title="Bunyikan sekarang ke layar TV tanpa menunggu jam jadwal"
                              >
                                ▶ Bunyikan
                              </button>
                              <button
                                onClick={() => openEditScheduleModal(item)}
                                className="rounded-md border border-border px-2.5 py-1 text-xs text-text-muted transition-colors hover:bg-surface-2 hover:text-text"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => setConfirmDeleteSchedule(item)}
                                className="rounded-md border border-border px-2.5 py-1 text-xs text-text-muted transition-colors hover:border-danger hover:text-danger"
                              >
                                Hapus
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= TAB 2: SIARAN LANGSUNG ================= */}
      {activeTab === "broadcast" && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-surface">
            <div className="border-b border-border px-4 py-3">
              <h2 className="text-sm font-medium">
                Antrean Pemutaran di TV{queue.length > 0 && ` (${queue.length} item)`}
              </h2>
            </div>

            {loading && (
              <div className="px-4 py-8 text-center text-sm text-text-muted">Memuat antrean...</div>
            )}

            {!loading && queue.length === 0 && (
              <div className="px-4 py-10 text-center text-sm text-text-muted">
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
                      onClick={() => handleCancelQueueItem(item)}
                      className="shrink-0 text-xs text-text-muted hover:text-danger"
                      title="Batalkan siaran ini dari antrean"
                    >
                      Batal
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* ================= MODAL TAMBAH / EDIT JADWAL ================= */}
      {showScheduleModal && (
        <Modal
          title={editingSchedule ? "Edit Jadwal Pengumuman" : "Tambah Jadwal Pengumuman"}
          onClose={() => setShowScheduleModal(false)}
        >
          <form onSubmit={handleSaveSchedule} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm text-text-muted">Label pengumuman</label>
              <input
                value={schedLabel}
                onChange={(e) => setSchedLabel(e.target.value)}
                placeholder="Contoh: Bel Masuk Kerja / Pengumuman Layanan"
                className="w-full rounded-lg border border-border bg-surface-2 px-3.5 py-2.5 text-sm outline-none focus:border-signal"
              />
              <p className="mt-1 text-xs text-text-muted">Teks ini tampil pada badge 🎤 melayang di layar TV.</p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm text-text-muted">Waktu tayang</label>
                <input
                  type="time"
                  value={schedTime}
                  onChange={(e) => setSchedTime(e.target.value)}
                  className="w-full rounded-lg border border-border bg-surface-2 px-3.5 py-2.5 text-sm outline-none focus:border-signal"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm text-text-muted">Jumlah pengulangan</label>
                <div className="flex gap-1 rounded-lg bg-surface-2 p-1">
                  {([1, 2, 3] as const).map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setSchedRepeat(n)}
                      className={`flex-1 rounded-md py-1.5 text-sm ${
                        schedRepeat === n ? "bg-surface text-text font-medium" : "text-text-muted"
                      }`}
                    >
                      {n}x
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Hari Aktif */}
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="text-sm text-text-muted">Hari tayang</label>
                <button
                  type="button"
                  onClick={() => setSchedDays(schedDays.size === DAYS.length ? new Set() : new Set(DAYS.map((d) => d.value)))}
                  className="text-xs text-signal hover:underline"
                >
                  {schedDays.size === DAYS.length ? "Hapus Pilihan (Setiap Hari)" : "Pilih Semua Hari"}
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {DAYS.map((d) => (
                  <button
                    key={d.value}
                    type="button"
                    onClick={() => toggleDay(d.value)}
                    className={`rounded-md px-3 py-1.5 text-xs transition-colors ${
                      schedDays.has(d.value)
                        ? "bg-signal text-white"
                        : "border border-border text-text-muted hover:border-signal/50"
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
              {schedDays.size === 0 && (
                <p className="mt-1 text-xs text-text-muted">Berlaku setiap hari (tidak ada batasan hari).</p>
              )}
            </div>

            {/* Upload File Audio */}
            <div>
              <label className="mb-1.5 block text-sm text-text-muted">
                {editingSchedule ? "File audio (kosongkan jika tidak ingin mengganti)" : "File audio (.mp3, .wav, .ogg)"}
              </label>
              <label className="flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-border py-6 text-sm text-text-muted hover:border-signal/50">
                {schedFile ? (
                  <>
                    <span className="text-base">🎵</span>
                    <span className="font-medium text-text">{schedFile.name}</span>
                    <span className="text-xs">{(schedFile.size / 1024 / 1024).toFixed(2)} MB</span>
                  </>
                ) : editingSchedule ? (
                  <>
                    <span>Audio tersimpan saat ini</span>
                    <span className="text-xs text-text-muted">Klik untuk memilih file pengganti</span>
                  </>
                ) : (
                  <>
                    <span>Klik untuk pilih file audio</span>
                    <span className="text-xs">MP3, WAV, OGG</span>
                  </>
                )}
                <input
                  ref={schedFileInputRef}
                  type="file"
                  accept="audio/*"
                  className="hidden"
                  onChange={(e) => setSchedFile(e.target.files?.[0] ?? null)}
                  disabled={schedSaving}
                />
              </label>
            </div>

            {/* Target Layar */}
            <div>
              <label className="mb-1.5 block text-sm text-text-muted">Tayangkan ke</label>
              <div className="flex gap-1 rounded-lg bg-surface-2 p-1">
                <button
                  type="button"
                  onClick={() => setSchedTargetMode("all")}
                  className={`flex-1 rounded-md py-1.5 text-sm ${
                    schedTargetMode === "all" ? "bg-surface text-text font-medium" : "text-text-muted"
                  }`}
                >
                  Semua layar
                </button>
                <button
                  type="button"
                  onClick={() => setSchedTargetMode("specific")}
                  className={`flex-1 rounded-md py-1.5 text-sm ${
                    schedTargetMode === "specific" ? "bg-surface text-text font-medium" : "text-text-muted"
                  }`}
                >
                  Pilih layar
                </button>
              </div>

              {schedTargetMode === "specific" && (
                <div className="mt-3 max-h-40 space-y-1 overflow-y-auto rounded-lg border border-border p-2">
                  {displays.length === 0 && (
                    <p className="px-2 py-3 text-center text-xs text-text-muted">
                      Belum ada layar terdaftar.
                    </p>
                  )}
                  {displays.map((d) => (
                    <label
                      key={d.id}
                      className="flex cursor-pointer items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-sm hover:bg-surface"
                    >
                      <span className="flex items-center gap-2.5">
                        <input
                          type="checkbox"
                          checked={schedSelectedDisplays.has(d.id)}
                          onChange={() => {
                            setSchedSelectedDisplays((prev) => {
                              const next = new Set(prev);
                              if (next.has(d.id)) next.delete(d.id);
                              else next.add(d.id);
                              return next;
                            });
                          }}
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

            {/* Switch Enable */}
            <div className="flex items-center justify-between pt-2">
              <div>
                <p className="text-sm font-medium text-text">Status jadwal</p>
                <p className="text-xs text-text-muted">Aktifkan pengumuman ini untuk diputar sesuai jadwal.</p>
              </div>
              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  checked={schedEnabled}
                  onChange={(e) => setSchedEnabled(e.target.checked)}
                  className="peer sr-only"
                />
                <div className="h-5 w-9 rounded-full bg-border peer-checked:bg-signal peer-focus:outline-none after:absolute after:left-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-full" />
              </label>
            </div>

            {schedError && <p className="text-sm text-danger">{schedError}</p>}

            <button
              type="submit"
              disabled={schedSaving}
              className="w-full rounded-md btn-aurora px-4 py-2.5 text-sm font-medium hover:opacity-90 disabled:opacity-50"
            >
              {schedSaving ? "Menyimpan..." : editingSchedule ? "Simpan Perubahan" : "Buat Jadwal"}
            </button>
          </form>
        </Modal>
      )}

      {/* ================= MODAL KONFIRMASI HAPUS JADWAL ================= */}
      {confirmDeleteSchedule && (
        <Modal title="Hapus Jadwal Pengumuman" onClose={() => setConfirmDeleteSchedule(null)}>
          <div className="space-y-4">
            <p className="text-sm text-text-muted">
              Apakah Anda yakin ingin menghapus jadwal pengumuman{" "}
              <strong className="text-text">&ldquo;{confirmDeleteSchedule.label}&rdquo;</strong>?
              File audio terkait juga akan dibersihkan dari penyimpanan.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteSchedule(null)}
                className="rounded-md border border-border px-4 py-2 text-sm text-text-muted hover:text-text"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDeleteSchedule}
                className="rounded-md bg-danger px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
              >
                Hapus
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ================= MODAL TAMBAH SIARAN LANGSUNG ================= */}
      {showBroadcastModal && (
        <Modal title="Mulai Siaran Suara Langsung" onClose={() => setShowBroadcastModal(false)}>
          <form onSubmit={handleBroadcastSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm text-text-muted">Label siaran</label>
              <input
                value={broadcastLabel}
                onChange={(e) => setBroadcastLabel(e.target.value)}
                placeholder="Contoh: Pengumuman Darurat Siang"
                className="w-full rounded-lg border border-border bg-surface-2 px-3.5 py-2.5 text-sm outline-none focus:border-signal"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm text-text-muted">
                File audio (.mp3, .wav, .ogg)
              </label>
              <label className="flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-border py-6 text-sm text-text-muted hover:border-signal/50">
                {broadcastFile ? (
                  <>
                    <span className="text-base">🎵</span>
                    <span className="font-medium text-text">{broadcastFile.name}</span>
                    <span className="text-xs">{(broadcastFile.size / 1024 / 1024).toFixed(2)} MB</span>
                  </>
                ) : (
                  <>
                    <span>Klik untuk pilih file audio</span>
                    <span className="text-xs">MP3, WAV, OGG</span>
                  </>
                )}
                <input
                  ref={broadcastFileInputRef}
                  type="file"
                  accept="audio/*"
                  className="hidden"
                  onChange={(e) => setBroadcastFile(e.target.files?.[0] ?? null)}
                  disabled={broadcastUploading}
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
                    onClick={() => setBroadcastRepeat(n)}
                    className={`flex-1 rounded-md py-1.5 text-sm ${
                      broadcastRepeat === n ? "bg-surface text-text font-medium" : "text-text-muted"
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
                  onClick={() => setBroadcastTargetMode("all")}
                  className={`flex-1 rounded-md py-1.5 text-sm ${
                    broadcastTargetMode === "all" ? "bg-surface text-text font-medium" : "text-text-muted"
                  }`}
                >
                  Semua layar
                </button>
                <button
                  type="button"
                  onClick={() => setBroadcastTargetMode("specific")}
                  className={`flex-1 rounded-md py-1.5 text-sm ${
                    broadcastTargetMode === "specific" ? "bg-surface text-text font-medium" : "text-text-muted"
                  }`}
                >
                  Pilih layar
                </button>
              </div>

              {broadcastTargetMode === "specific" && (
                <div className="mt-3 max-h-40 space-y-1 overflow-y-auto rounded-lg border border-border p-2">
                  {displays.length === 0 && (
                    <p className="px-2 py-3 text-center text-xs text-text-muted">
                      Belum ada layar terdaftar.
                    </p>
                  )}
                  {displays.map((d) => (
                    <label
                      key={d.id}
                      className="flex cursor-pointer items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-sm hover:bg-surface"
                    >
                      <span className="flex items-center gap-2.5">
                        <input
                          type="checkbox"
                          checked={broadcastSelectedDisplays.has(d.id)}
                          onChange={() => {
                            setBroadcastSelectedDisplays((prev) => {
                              const next = new Set(prev);
                              if (next.has(d.id)) next.delete(d.id);
                              else next.add(d.id);
                              return next;
                            });
                          }}
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

            {broadcastError && <p className="text-sm text-danger">{broadcastError}</p>}

            <button
              type="submit"
              disabled={broadcastUploading}
              className="w-full rounded-md btn-aurora px-4 py-2.5 text-sm font-medium hover:opacity-90 disabled:opacity-50"
            >
              {broadcastUploading ? "Mengunggah..." : "🎤 Mulai Siaran Sekarang"}
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}
