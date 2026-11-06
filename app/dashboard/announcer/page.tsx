"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Announcement, AnnouncerItem, DayOfWeek, Display } from "@/lib/types";
import { sanitizeText } from "@/lib/sanitize";
import { useToast } from "@/lib/toast";
import AnnouncerToolbar from "@/components/announcer/AnnouncerToolbar";
import ScheduleTable from "@/components/announcer/ScheduleTable";
import ScheduleFormModal, { type ScheduleFormState } from "@/components/announcer/ScheduleFormModal";
import DeleteScheduleModal from "@/components/announcer/DeleteScheduleModal";
import QueueList from "@/components/announcer/QueueList";
import BroadcastModal, { type BroadcastFormState } from "@/components/announcer/BroadcastModal";
import { getStoragePath } from "@/components/announcer/utils";
import type { TabMode } from "@/components/announcer/types";

const EMPTY_SCHEDULE_FORM: ScheduleFormState = {
  label: "Pengumuman",
  time: "08:00",
  days: new Set(),
  repeat: 1,
  targetMode: "all",
  selectedDisplays: new Set(),
  file: null,
  enabled: true,
  saving: false,
  error: null,
};

const EMPTY_BROADCAST_FORM: BroadcastFormState = {
  label: "Pengumuman Siaran Langsung",
  repeat: 1,
  targetMode: "all",
  selectedDisplays: new Set(),
  file: null,
  uploading: false,
  error: null,
};

export default function AnnouncerPage() {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<TabMode>("schedules");
  const [displays, setDisplays] = useState<Display[]>([]);
  const [loading, setLoading] = useState(true);

  // ---------- Master Schedules State ----------
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Announcement | null>(null);
  const [confirmDeleteSchedule, setConfirmDeleteSchedule] = useState<Announcement | null>(null);
  const [schedForm, setSchedForm] = useState<ScheduleFormState>(EMPTY_SCHEDULE_FORM);
  const schedFileInputRef = useRef<HTMLInputElement>(null);

  // Audio Preview State
  const [previewAudioId, setPreviewAudioId] = useState<string | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  // ---------- Broadcast & Queue State ----------
  const [queue, setQueue] = useState<AnnouncerItem[]>([]);
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [broadcastForm, setBroadcastForm] = useState<BroadcastFormState>(EMPTY_BROADCAST_FORM);
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

  // ---------- Form helpers ----------
  function patchSchedForm(patch: Partial<ScheduleFormState>) {
    setSchedForm((prev) => ({ ...prev, ...patch }));
  }

  function patchBroadcastForm(patch: Partial<BroadcastFormState>) {
    setBroadcastForm((prev) => ({ ...prev, ...patch }));
  }

  function toggleSchedDay(day: DayOfWeek) {
    setSchedForm((prev) => {
      const next = new Set(prev.days);
      if (next.has(day)) next.delete(day);
      else next.add(day);
      return { ...prev, days: next };
    });
  }

  function toggleSetValue(key: "selectedDisplays", id: string, scope: "sched" | "broadcast") {
    const apply = (prev: Set<string>) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    };
    if (scope === "sched") {
      setSchedForm((prev) => ({ ...prev, [key]: apply(prev[key]) }));
    } else {
      setBroadcastForm((prev) => ({ ...prev, [key]: apply(prev[key]) }));
    }
  }

  // ---------- Open Create / Edit Schedule Modal ----------
  function openAddScheduleModal() {
    setEditingSchedule(null);
    setSchedForm({ ...EMPTY_SCHEDULE_FORM, days: new Set(), selectedDisplays: new Set() });
    if (schedFileInputRef.current) schedFileInputRef.current.value = "";
    setShowScheduleModal(true);
  }

  function openEditScheduleModal(item: Announcement) {
    setEditingSchedule(item);
    setSchedForm({
      label: item.label,
      time: item.time.slice(0, 5),
      days: new Set(item.days_of_week),
      repeat: item.repeat_count as 1 | 2 | 3,
      targetMode: item.target_display_ids.length === 0 ? "all" : "specific",
      selectedDisplays: new Set(item.target_display_ids),
      file: null,
      enabled: item.is_enabled,
      saving: false,
      error: null,
    });
    if (schedFileInputRef.current) schedFileInputRef.current.value = "";
    setShowScheduleModal(true);
  }

  // ---------- Open Broadcast Modal (siaran langsung) ----------
  // Tanpa ini, modal broadcast tidak pernah bisa dibuka dari UI.
  function openBroadcastModal() {
    setBroadcastForm({ ...EMPTY_BROADCAST_FORM, selectedDisplays: new Set() });
    if (broadcastFileInputRef.current) broadcastFileInputRef.current.value = "";
    setShowBroadcastModal(true);
  }

  // ---------- Save Schedule (Create or Update) ----------
  async function handleSaveSchedule(e: React.FormEvent) {
    e.preventDefault();
    patchSchedForm({ error: null });

    if (!schedForm.label.trim()) {
      patchSchedForm({ error: "Label pengumuman wajib diisi." });
      return;
    }
    if (!schedForm.time) {
      patchSchedForm({ error: "Waktu tayang wajib diisi." });
      return;
    }
    if (!editingSchedule && !schedForm.file) {
      patchSchedForm({ error: "Pilih file audio terlebih dahulu." });
      return;
    }
    if (schedForm.targetMode === "specific" && schedForm.selectedDisplays.size === 0) {
      patchSchedForm({ error: "Pilih minimal satu layar atau gunakan opsi 'Semua layar'." });
      return;
    }

    patchSchedForm({ saving: true });
    const supabase = createClient();
    let audioUrl = editingSchedule ? editingSchedule.audio_url : "";
    let newStoragePath: string | null = null;
    let oldStoragePathToDelete: string | null = null;

    // Upload audio jika ada file baru
    if (schedForm.file) {
      const path = `${crypto.randomUUID()}-${schedForm.file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_")}`;
      const { error: uploadError } = await supabase.storage
        .from("announcer")
        .upload(path, schedForm.file, { cacheControl: "31536000", upsert: false });

      if (uploadError) {
        patchSchedForm({ error: `Gagal mengunggah file audio: ${uploadError.message}`, saving: false });
        return;
      }

      const { data: pub } = supabase.storage.from("announcer").getPublicUrl(path);
      audioUrl = pub.publicUrl;
      newStoragePath = path;
      // jangan hapus lama dulu â€” tunggu DB sukses (trash-safe)
      if (editingSchedule) {
        oldStoragePathToDelete = (editingSchedule.storage_path as string | null) ?? getStoragePath(editingSchedule.audio_url);
      }
      if (!audioUrl) {
        // safety: jika getPublicUrl gagal, rollback upload
        if (newStoragePath) await supabase.storage.from("announcer").remove([newStoragePath]);
        patchSchedForm({ error: "Gagal mendapatkan URL publik audio.", saving: false });
        return;
      }
    } else if (editingSchedule) {
      // tidak ganti file â€” pertahankan storage_path lama
      newStoragePath = (editingSchedule.storage_path as string | null) ?? getStoragePath(editingSchedule.audio_url);
    }

    const payload: Record<string, unknown> = {
      label: sanitizeText(schedForm.label.trim()).slice(0, 100),
      audio_url: audioUrl,
      storage_path: newStoragePath,
      time: schedForm.time,
      days_of_week: Array.from(schedForm.days),
      repeat_count: schedForm.repeat,
      target_display_ids: schedForm.targetMode === "all" ? [] : Array.from(schedForm.selectedDisplays),
      is_enabled: schedForm.enabled,
    };

    if (!payload.audio_url || (payload.audio_url as string).trim() === "") {
      if (newStoragePath) await supabase.storage.from("announcer").remove([newStoragePath]);
      patchSchedForm({ error: "Audio URL tidak boleh kosong.", saving: false });
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
        patchSchedForm({ error: `Gagal memperbarui: ${updateError.message}`, saving: false });
        toast.error(`Gagal memperbarui pengumuman: ${updateError.message}`);
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
        patchSchedForm({ error: `Gagal menyimpan: ${insertError.message}`, saving: false });
        toast.error(`Gagal menyimpan pengumuman: ${insertError.message}`);
        return;
      }
    }

    patchSchedForm({ saving: false });
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
    // hapus file dulu (best-effort) lalu row â€” delete row tidak tergantung storage
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
    patchBroadcastForm({ error: null });

    if (!broadcastForm.file) {
      patchBroadcastForm({ error: "Pilih file audio siaran terlebih dahulu." });
      return;
    }
    if (broadcastForm.targetMode === "specific" && broadcastForm.selectedDisplays.size === 0) {
      patchBroadcastForm({ error: "Pilih minimal satu layar atau gunakan opsi 'Semua layar'." });
      return;
    }

    patchBroadcastForm({ uploading: true });
    const supabase = createClient();

    const path = `${crypto.randomUUID()}-${broadcastForm.file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_")}`;
    const { error: uploadError } = await supabase.storage
      .from("announcer")
      .upload(path, broadcastForm.file, { cacheControl: "31536000", upsert: false });

    if (uploadError) {
      patchBroadcastForm({ error: `Gagal mengunggah file audio: ${uploadError.message}`, uploading: false });
      return;
    }

    const { data: pub } = supabase.storage.from("announcer").getPublicUrl(path);
    const { error: queueError } = await supabase.from("announcer_queue").insert({
      label: sanitizeText(broadcastForm.label.trim() || "Pengumuman").slice(0, 100),
      audio_url: pub.publicUrl,
      storage_path: path,
      source_announcement_id: null,
      repeat_count: broadcastForm.repeat,
      target_display_ids:
        broadcastForm.targetMode === "all" ? [] : Array.from(broadcastForm.selectedDisplays),
    });

    patchBroadcastForm({ uploading: false });
    if (queueError) {
      await supabase.storage.from("announcer").remove([path]);
      patchBroadcastForm({ error: `Gagal menyiarkan: ${queueError.message}` });
      toast.error(`Gagal menyiarkan pengumuman: ${queueError.message}`);
      return;
    }
    toast.success("Pengumuman siaran langsung berhasil dikirim ke antrean.");
    setShowBroadcastModal(false);
    setBroadcastForm({ ...EMPTY_BROADCAST_FORM, selectedDisplays: new Set() });
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
return (
    <div>
      <AnnouncerToolbar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onCreate={activeTab === "schedules" ? openAddScheduleModal : openBroadcastModal}
      />

      {/* ================= TAB 1: PENGUMUMAN TERJADWAL ================= */}
      {activeTab === "schedules" && (
        <div className="space-y-4">
          <div className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <ScheduleTable
              announcements={announcements}
              loading={loading}
              previewAudioId={previewAudioId}
              onToggleEnabled={handleToggleEnabled}
              onTogglePreview={togglePreviewAudio}
              onTriggerNow={handleTriggerNow}
              onEdit={openEditScheduleModal}
              onRequestDelete={setConfirmDeleteSchedule}
            />
          </div>
        </div>
      )}

      {/* ================= TAB 2: SIARAN LANGSUNG ================= */}
      {activeTab === "broadcast" && (
        <div className="space-y-6">
          <QueueList queue={queue} loading={loading} onCancel={handleCancelQueueItem} />
        </div>
      )}

      {/* ================= MODAL TAMBAH / EDIT JADWAL ================= */}
      {showScheduleModal && (
        <ScheduleFormModal
          editing={editingSchedule}
          form={schedForm}
          displays={displays}
          fileInputRef={schedFileInputRef}
          onClose={() => setShowScheduleModal(false)}
          onSubmit={handleSaveSchedule}
          onChange={patchSchedForm}
          onToggleDay={toggleSchedDay}
          onToggleDisplay={(id) => toggleSetValue("selectedDisplays", id, "sched")}
        />
      )}

      {/* ================= MODAL KONFIRMASI HAPUS JADWAL ================= */}
      {confirmDeleteSchedule && (
        <DeleteScheduleModal
          item={confirmDeleteSchedule}
          onCancel={() => setConfirmDeleteSchedule(null)}
          onConfirm={handleDeleteSchedule}
        />
      )}

      {/* ================= MODAL TAMBAH SIARAN LANGSUNG ================= */}
      {showBroadcastModal && (
        <BroadcastModal
          form={broadcastForm}
          displays={displays}
          fileInputRef={broadcastFileInputRef}
          onClose={() => setShowBroadcastModal(false)}
          onSubmit={handleBroadcastSubmit}
          onChange={patchBroadcastForm}
          onToggleDisplay={(id) => toggleSetValue("selectedDisplays", id, "broadcast")}
        />
      )}
    </div>
  );
}

