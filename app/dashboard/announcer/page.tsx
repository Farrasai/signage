"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Announcement, AnnouncerItem, DayOfWeek, Display } from "@/lib/types";
import { DAYS } from "@/lib/types";
import { sanitizeText } from "@/lib/sanitize";
import Modal from "@/components/Modal";
import Pagination from "@/components/Pagination";
import StatusDot from "@/components/StatusDot";
import { useToast } from "@/lib/toast";

function getStoragePath(raw: string | null): string | null {
  try {
    const u = raw || "";
    const k = "/announcer/";
    const i = u.indexOf(k);
    if (i >= 0) return decodeURIComponent(u.slice(i + k.length).split("?")[0]);
    return null;
  } catch {
    return null;
  }
}

type TabMode = "schedules" | "broadcast";

export default function AnnouncerPage() {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<TabMode>("schedules");
  const [annPage, setAnnPage] = useState(1);
  const [queuePage, setQueuePage] = useState(1);
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
      storage_path: (item.storage_path as string | null) ?? getStoragePath(item.audio_url),
      source_announcement_id: item.id,
      repeat_count: item.repeat_count,
      target_display_ids: item.target_display_ids,
    });

    if (!error) {
      toast.success(`Pengumuman "${item.label}" berhasil dimasukkan ke antrean siaran TV!`);
    } else {
      toast.error(`Gagal memasukkan ke antrean: ${error.message}`);
    }
  }

  // ---------- Toggle Enable/Disable Schedule ----------
  async function handleToggleEnabled(item: Announcement) {
    const nextVal = !item.is_enabled;
    setAnnouncements((prev) =>
      prev.map((a) => (a.id === item.id ? { ...a, is_enabled: nextVal } : a))
    );

    const supabase = createClient();
    const { error } = await supabase.from("announcements").update({ is_enabled: nextVal }).eq("id", item.id);
    if (error) {
      toast.error(`Gagal mengubah status pengumuman: ${error.message}`);
      // kembalikan state optimistis
      setAnnouncements((prev) =>
        prev.map((a) => (a.id === item.id ? { ...a, is_enabled: item.is_enabled } : a))
      );
      return;
    }
    toast.success(nextVal ? "Pengumuman diaktifkan." : "Pengumuman dinonaktifkan.");
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

  // ---------- Open Broadcast Modal (siaran langsung) ----------
  // Tanpa ini, modal broadcast tidak pernah bisa dibuka dari UI.
  function openBroadcastModal() {
    setBroadcastLabel("Pengumuman Siaran Langsung");
    setBroadcastRepeat(1);
    setBroadcastTargetMode("all");
    setBroadcastSelectedDisplays(new Set());
    setBroadcastFile(null);
    setBroadcastError(null);
    if (broadcastFileInputRef.current) broadcastFileInputRef.current.value = "";
    setShowBroadcastModal(true);
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
    let newStoragePath: string | null = null;
    let oldStoragePathToDelete: string | null = null;

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

      const { data: pub } = supabase.storage.from("announcer").getPublicUrl(path);
      audioUrl = pub.publicUrl;
      newStoragePath = path;
      // jangan hapus lama dulu — tunggu DB sukses (trash-safe)
      if (editingSchedule) {
        oldStoragePathToDelete = (editingSchedule.storage_path as string | null) ?? getStoragePath(editingSchedule.audio_url);
      }
      if (!audioUrl) {
        // safety: jika getPublicUrl gagal, rollback upload
        if (newStoragePath) await supabase.storage.from("announcer").remove([newStoragePath]);
        setSchedError("Gagal mendapatkan URL publik audio.");
        setSchedSaving(false);
        return;
      }
    } else if (editingSchedule) {
      // tidak ganti file — pertahankan storage_path lama
      newStoragePath = (editingSchedule.storage_path as string | null) ?? getStoragePath(editingSchedule.audio_url);
    }

    const payload: Record<string, unknown> = {
      label: sanitizeText(schedLabel.trim()).slice(0, 100),
      audio_url: audioUrl,
      storage_path: newStoragePath,
      time: schedTime,
      days_of_week: Array.from(schedDays),
      repeat_count: schedRepeat,
      target_display_ids: schedTargetMode === "all" ? [] : Array.from(schedSelectedDisplays),
      is_enabled: schedEnabled,
    };

    if (!payload.audio_url || (payload.audio_url as string).trim() === "") {
      if (newStoragePath) await supabase.storage.from("announcer").remove([newStoragePath]);
      setSchedError("Audio URL tidak boleh kosong.");
      setSchedSaving(false);
      return;
    }

    if (editingSchedule) {
      const { error: updateError } = await supabase
        .from("announcements")
        .update(payload)
        .eq("id", editingSchedule.id);

      if (updateError) {
        // rollback: hapus file baru yang sudah ter-upload
        if (newStoragePath && newStoragePath !== (editingSchedule.storage_path as string | null)) {
          await supabase.storage.from("announcer").remove([newStoragePath]);
        }
        setSchedError(`Gagal memperbarui: ${updateError.message}`);
        toast.error(`Gagal memperbarui pengumuman: ${updateError.message}`);
        setSchedSaving(false);
        return;
      }
      // sukses: baru hapus file lama
      if (oldStoragePathToDelete && oldStoragePathToDelete !== newStoragePath) {
        await supabase.storage.from("announcer").remove([oldStoragePathToDelete]);
      }
    } else {
      const { error: insertError } = await supabase.from("announcements").insert(payload);
      if (insertError) {
        if (newStoragePath) await supabase.storage.from("announcer").remove([newStoragePath]);
        setSchedError(`Gagal menyimpan: ${insertError.message}`);
        toast.error(`Gagal menyimpan pengumuman: ${insertError.message}`);
        setSchedSaving(false);
        return;
      }
    }

    setSchedSaving(false);
    toast.success(editingSchedule ? "Perubahan pengumuman disimpan." : "Pengumuman berhasil dibuat.");
    setShowScheduleModal(false);
    load();
  }

  // ---------- Delete Schedule ----------
  async function handleDeleteSchedule() {
    if (!confirmDeleteSchedule) return;
    const supabase = createClient();
    const deletedLabel = confirmDeleteSchedule.label;

    const storagePath = (confirmDeleteSchedule.storage_path as string | null) ?? getStoragePath(confirmDeleteSchedule.audio_url);
    // hapus file dulu (best-effort) lalu row — delete row tidak tergantung storage
    if (storagePath) {
      await supabase.storage.from("announcer").remove([storagePath]);
    }

    const { error } = await supabase.from("announcements").delete().eq("id", confirmDeleteSchedule.id);
    setConfirmDeleteSchedule(null);
    if (error) {
      toast.error(`Gagal menghapus pengumuman: ${error.message}`);
      return;
    }
    toast.success(`Pengumuman "${deletedLabel}" dihapus.`);
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
    const { error: queueError } = await supabase.from("announcer_queue").insert({
      label: sanitizeText(broadcastLabel.trim() || "Pengumuman").slice(0, 100),
      audio_url: pub.publicUrl,
      storage_path: path,
      source_announcement_id: null,
      repeat_count: broadcastRepeat,
      target_display_ids: broadcastTargetMode === "all" ? [] : Array.from(broadcastSelectedDisplays),
    });

    setBroadcastUploading(false);
    if (queueError) {
      await supabase.storage.from("announcer").remove([path]);
      setBroadcastError(`Gagal menyiarkan: ${queueError.message}`);
      toast.error(`Gagal menyiarkan pengumuman: ${queueError.message}`);
      return;
    }
    toast.success("Pengumuman siaran langsung berhasil dikirim ke antrean.");
    setShowBroadcastModal(false);
    setBroadcastFile(null);
    if (broadcastFileInputRef.current) broadcastFileInputRef.current.value = "";
  }

  // ---------- Cancel Queue Item ----------
  async function handleCancelQueueItem(item: AnnouncerItem) {
    const supabase = createClient();
    // Ownership: jika dari announcements, JANGAN hapus file (masih dipakai master)
    const isOwnedByAnnouncement = Boolean((item as unknown as { source_announcement_id?: string | null }).source_announcement_id);
    if (!isOwnedByAnnouncement) {
      const storagePath = (item as unknown as { storage_path?: string | null }).storage_path ?? getStoragePath(item.audio_url);
      if (storagePath) {
        await supabase.storage.from("announcer").remove([storagePath]);
      }
    }
    const { error } = await supabase.from("announcer_queue").delete().eq("id", item.id);
    if (error) {
      toast.error(`Gagal membatalkan antrean: ${error.message}`);
      return;
    }
    toast.success("Item antrean dibatalkan.");
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
      {/* Toolbar: tab switcher + tombol tambah permanen */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
          <button
            type="button"
            data-testid="tab-schedules"
            onClick={() => setActiveTab("schedules")}
            aria-pressed={activeTab === "schedules"}
            className={`cursor-pointer rounded-lg px-3.5 py-1.5 text-sm transition-colors ${
              activeTab === "schedules"
                ? "bg-white font-medium text-slate-900 dark:bg-slate-900 dark:text-white"
                : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            }`}
          >
            Jadwal Pengumuman
          </button>
          <button
            type="button"
            data-testid="tab-broadcast"
            onClick={() => setActiveTab("broadcast")}
            aria-pressed={activeTab === "broadcast"}
            className={`cursor-pointer rounded-lg px-3.5 py-1.5 text-sm transition-colors ${
              activeTab === "broadcast"
                ? "bg-white font-medium text-slate-900 dark:bg-slate-900 dark:text-white"
                : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            }`}
          >
            Siaran Langsung
          </button>
        </div>

        <button
          type="button"
          data-testid="add-schedule-announcement-button"
          onClick={activeTab === "schedules" ? openAddScheduleModal : openBroadcastModal}
          className="cursor-pointer rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white shadow hover:bg-emerald-700"
        >
          {activeTab === "schedules" ? "+ Tambah Pengumuman" : "🎤 Mulai Siaran"}
        </button>
      </div>

      {/* ================= TAB 1: PENGUMUMAN TERJADWAL ================= */}
      {activeTab === "schedules" && (
        <div className="space-y-4">
          <div className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            {loading ? (
              <div className="px-4 py-12 text-center text-sm text-slate-500 dark:text-slate-400">Memuat data jadwal...</div>
            ) : announcements.length === 0 ? (
              <div className="px-4 py-12 text-center">
                <p className="text-base font-medium text-slate-900 dark:text-white">Belum ada jadwal pengumuman.</p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Gunakan tombol &ldquo;+ Tambah Pengumuman&rdquo; di kanan atas untuk membuat pengumuman bersuara yang otomatis diputar pada jam dan hari tertentu.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 text-xs text-slate-500 dark:text-slate-400">
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
                        <tr key={item.id} className="transition-colors hover:bg-slate-100 dark:bg-slate-800/50">
                          {/* Toggle Status */}
                          <td className="px-4 py-3.5">
                            <label className="relative inline-flex cursor-pointer items-center" title={item.is_enabled ? "Jadwal Aktif (klik untuk nonaktifkan)" : "Jadwal Nonaktif (klik untuk aktifkan)"}>
                              <input
                                type="checkbox"
                                checked={item.is_enabled}
                                onChange={() => handleToggleEnabled(item)}
                                className="peer sr-only"
                              />
                              <div className="h-5 w-9 rounded-full bg-border peer-checked:bg-emerald-600 peer-focus:outline-none after:absolute after:left-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-full" />
                            </label>
                          </td>

                          {/* Label & Audio Preview */}
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-2.5">
                              <button
                                onClick={() => togglePreviewAudio(item.id, item.audio_url)}
                                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-colors ${
                                  isPlaying
                                    ? "bg-emerald-600 text-white animate-pulse"
                                    : "border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 hover:border-emerald-500 hover:text-slate-900 dark:text-white"
                                }`}
                                title={isPlaying ? "Jeda pratinjau audio" : "Dengarkan audio"}
                              >
                                {isPlaying ? "⏸" : "▶"}
                              </button>
                              <span className="font-medium text-slate-900 dark:text-white">{item.label}</span>
                            </div>
                          </td>

                          {/* Jam Tayang */}
                          <td className="px-4 py-3.5">
                            <span className="font-mono text-sm font-semibold text-slate-900 dark:text-white">
                              {item.time.slice(0, 5)}
                            </span>
                          </td>

                          {/* Hari Aktif */}
                          <td className="px-4 py-3.5">
                            {item.days_of_week.length === 0 ? (
                              <span className="rounded bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-xs text-slate-500 dark:text-slate-400">
                                Setiap hari
                              </span>
                            ) : (
                              <div className="flex flex-wrap gap-1">
                                {item.days_of_week.map((day) => {
                                  const dInfo = DAYS.find((d) => d.value === day);
                                  return (
                                    <span
                                      key={day}
                                      className="rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 text-[11px] font-medium text-slate-500 dark:text-slate-400"
                                    >
                                      {dInfo?.label ?? day}
                                    </span>
                                  );
                                })}
                              </div>
                            )}
                          </td>

                          {/* Target Layar */}
                          <td className="px-4 py-3.5 text-slate-500 dark:text-slate-400">
                            {item.target_display_ids.length === 0 ? (
                              <span className="text-xs">Semua layar</span>
                            ) : (
                              <span className="text-xs">{item.target_display_ids.length} layar</span>
                            )}
                          </td>

                          {/* Repeat Count */}
                          <td className="px-4 py-3.5 text-xs text-slate-500 dark:text-slate-400">
                            {item.repeat_count}x
                          </td>

                          {/* Actions */}
                          <td className="px-4 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleTriggerNow(item)}
                                className="rounded-md border border-slate-200 dark:border-slate-800 px-2.5 py-1 text-xs text-slate-500 dark:text-slate-400 transition-colors hover:border-emerald-500 hover:text-slate-900 dark:text-white"
                                title="Bunyikan sekarang ke layar TV tanpa menunggu jam jadwal"
                              >
                                ▶ Bunyikan
                              </button>
                              <button
                                onClick={() => openEditScheduleModal(item)}
                                className="rounded-md border border-slate-200 dark:border-slate-800 px-2.5 py-1 text-xs text-slate-500 dark:text-slate-400 transition-colors hover:bg-slate-100 dark:bg-slate-800 hover:text-slate-900 dark:text-white"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => setConfirmDeleteSchedule(item)}
                                className="rounded-md border border-slate-200 dark:border-slate-800 px-2.5 py-1 text-xs text-slate-500 dark:text-slate-400 transition-colors hover:border-rose-400 hover:text-rose-600 dark:text-rose-400"
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
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
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
                      <span className="shrink-0 rounded-md bg-red-500/15 px-2 py-0.5 text-xs text-red-400">
                        Diputar
                      </span>
                    )}

                    <button
                      onClick={() => handleCancelQueueItem(item)}
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
              <label className="mb-1.5 block text-sm text-slate-500 dark:text-slate-400">Label pengumuman</label>
              <input
                data-testid="announcement-label-input"
                value={schedLabel}
                onChange={(e) => setSchedLabel(e.target.value)}
                placeholder="Contoh: Bel Masuk Kerja / Pengumuman Layanan"
                className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 px-3.5 py-2.5 text-sm outline-none focus:border-emerald-500"
              />
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Teks ini tampil pada badge 🎤 melayang di layar TV.</p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm text-slate-500 dark:text-slate-400">Waktu tayang</label>
                <input
                  type="time"
                  value={schedTime}
                  onChange={(e) => setSchedTime(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 px-3.5 py-2.5 text-sm outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm text-slate-500 dark:text-slate-400">Jumlah pengulangan</label>
                <div className="flex gap-1 rounded-xl bg-slate-100 dark:bg-slate-800 p-1">
                  {([1, 2, 3] as const).map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setSchedRepeat(n)}
                      className={`flex-1 rounded-lg py-1.5 text-sm ${
                        schedRepeat === n ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium" : "text-slate-500 dark:text-slate-400"
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
                <label className="text-sm text-slate-500 dark:text-slate-400">Hari tayang</label>
                <button
                  type="button"
                  onClick={() => setSchedDays(schedDays.size === DAYS.length ? new Set() : new Set(DAYS.map((d) => d.value)))}
                  className="text-xs text-emerald-600 hover:underline"
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
                        ? "bg-emerald-600 text-white"
                        : "border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400"
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
              {schedDays.size === 0 && (
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Berlaku setiap hari (tidak ada batasan hari).</p>
              )}
            </div>

            {/* Upload File Audio */}
            <div>
              <label className="mb-1.5 block text-sm text-slate-500 dark:text-slate-400">
                {editingSchedule ? "File audio (kosongkan jika tidak ingin mengganti)" : "File audio (.mp3, .wav, .ogg)"}
              </label>
              <label className="flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-slate-200 dark:border-slate-800 py-6 text-sm text-slate-500 dark:text-slate-400 hover:border-emerald-500/50">
                {schedFile ? (
                  <>
                    <span className="text-base">🎵</span>
                    <span className="font-medium text-slate-900 dark:text-white">{schedFile.name}</span>
                    <span className="text-xs">{(schedFile.size / 1024 / 1024).toFixed(2)} MB</span>
                  </>
                ) : editingSchedule ? (
                  <>
                    <span>Audio tersimpan saat ini</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">Klik untuk memilih file pengganti</span>
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
              <label className="mb-1.5 block text-sm text-slate-500 dark:text-slate-400">Tayangkan ke</label>
              <div className="flex gap-1 rounded-xl bg-slate-100 dark:bg-slate-800 p-1">
                <button
                  type="button"
                  onClick={() => setSchedTargetMode("all")}
                  className={`flex-1 rounded-lg py-1.5 text-sm ${
                    schedTargetMode === "all" ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium" : "text-slate-500 dark:text-slate-400"
                  }`}
                >
                  Semua layar
                </button>
                <button
                  type="button"
                  onClick={() => setSchedTargetMode("specific")}
                  className={`flex-1 rounded-lg py-1.5 text-sm ${
                    schedTargetMode === "specific" ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium" : "text-slate-500 dark:text-slate-400"
                  }`}
                >
                  Pilih layar
                </button>
              </div>

              {schedTargetMode === "specific" && (
                <div className="mt-3 max-h-40 space-y-1 overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-800 p-2">
                  {displays.length === 0 && (
                    <p className="px-2 py-3 text-center text-xs text-slate-500 dark:text-slate-400">
                      Belum ada layar terdaftar.
                    </p>
                  )}
                  {displays.map((d) => (
                    <label
                      key={d.id}
                      className="flex cursor-pointer items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-sm hover:bg-white dark:bg-slate-900"
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

            {/* Switch Enable */}
            <div className="flex items-center justify-between pt-2">
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-white">Status jadwal</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Aktifkan pengumuman ini untuk diputar sesuai jadwal.</p>
              </div>
              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  checked={schedEnabled}
                  onChange={(e) => setSchedEnabled(e.target.checked)}
                  className="peer sr-only"
                />
                <div className="h-5 w-9 rounded-full bg-border peer-checked:bg-emerald-600 peer-focus:outline-none after:absolute after:left-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-full" />
              </label>
            </div>

            {schedError && <p data-testid="announcement-error" className="text-sm text-rose-600 dark:text-rose-400">{schedError}</p>}

            <button
              data-testid="announcement-submit"
              type="submit"
              disabled={schedSaving}
              className="w-full rounded-lg bg-emerald-600 text-white px-4 py-2.5 text-sm font-medium hover:opacity-90 disabled:opacity-50"
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
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Apakah Anda yakin ingin menghapus jadwal pengumuman{" "}
              <strong className="text-slate-900 dark:text-white">&ldquo;{confirmDeleteSchedule.label}&rdquo;</strong>?
              File audio terkait juga akan dibersihkan dari penyimpanan.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteSchedule(null)}
                className="rounded-md border border-slate-200 dark:border-slate-800 px-4 py-2 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDeleteSchedule}
                className="rounded-md bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
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
              <label className="mb-1.5 block text-sm text-slate-500 dark:text-slate-400">Label siaran</label>
              <input
                value={broadcastLabel}
                onChange={(e) => setBroadcastLabel(e.target.value)}
                placeholder="Contoh: Pengumuman Darurat Siang"
                className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 px-3.5 py-2.5 text-sm outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm text-slate-500 dark:text-slate-400">
                File audio (.mp3, .wav, .ogg)
              </label>
              <label className="flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-slate-200 dark:border-slate-800 py-6 text-sm text-slate-500 dark:text-slate-400 hover:border-emerald-500/50">
                {broadcastFile ? (
                  <>
                    <span className="text-base">🎵</span>
                    <span className="font-medium text-slate-900 dark:text-white">{broadcastFile.name}</span>
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
              <label className="mb-1.5 block text-sm text-slate-500 dark:text-slate-400">Diulang</label>
              <div className="flex gap-1 rounded-xl bg-slate-100 dark:bg-slate-800 p-1">
                {([1, 2, 3] as const).map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setBroadcastRepeat(n)}
                    className={`flex-1 rounded-lg py-1.5 text-sm ${
                      broadcastRepeat === n ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium" : "text-slate-500 dark:text-slate-400"
                    }`}
                  >
                    {n}x
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm text-slate-500 dark:text-slate-400">Tayangkan ke</label>
              <div className="flex gap-1 rounded-xl bg-slate-100 dark:bg-slate-800 p-1">
                <button
                  type="button"
                  onClick={() => setBroadcastTargetMode("all")}
                  className={`flex-1 rounded-lg py-1.5 text-sm ${
                    broadcastTargetMode === "all" ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium" : "text-slate-500 dark:text-slate-400"
                  }`}
                >
                  Semua layar
                </button>
                <button
                  type="button"
                  onClick={() => setBroadcastTargetMode("specific")}
                  className={`flex-1 rounded-lg py-1.5 text-sm ${
                    broadcastTargetMode === "specific" ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium" : "text-slate-500 dark:text-slate-400"
                  }`}
                >
                  Pilih layar
                </button>
              </div>

              {broadcastTargetMode === "specific" && (
                <div className="mt-3 max-h-40 space-y-1 overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-800 p-2">
                  {displays.length === 0 && (
                    <p className="px-2 py-3 text-center text-xs text-slate-500 dark:text-slate-400">
                      Belum ada layar terdaftar.
                    </p>
                  )}
                  {displays.map((d) => (
                    <label
                      key={d.id}
                      className="flex cursor-pointer items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-sm hover:bg-white dark:bg-slate-900"
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

            {broadcastError && <p className="text-sm text-rose-600 dark:text-rose-400">{broadcastError}</p>}

            <button
              type="submit"
              disabled={broadcastUploading}
              className="w-full rounded-lg bg-emerald-600 text-white px-4 py-2.5 text-sm font-medium hover:opacity-90 disabled:opacity-50"
            >
              {broadcastUploading ? "Mengunggah..." : "🎤 Mulai Siaran Sekarang"}
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}
