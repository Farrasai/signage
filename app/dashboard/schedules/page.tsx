"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Display, DayOfWeek, Playlist, Schedule } from "@/lib/types";
import { DAYS } from "@/lib/types";
import Modal from "@/components/Modal";

export default function SchedulesPage() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [displays, setDisplays] = useState<Display[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Schedule | null>(null);

  const [form, setForm] = useState({
    display_id: "",
    playlist_id: "",
    days: new Set<DayOfWeek>(),
    start_time: "09:00",
    end_time: "17:00",
    priority: 0,
  });

  const load = useCallback(async () => {
    const supabase = createClient();
    const [{ data: s }, { data: d }, { data: p }] = await Promise.all([
      supabase.from("schedules").select("*").order("priority", { ascending: false }),
      supabase.from("displays").select("*").order("name"),
      supabase.from("playlists").select("*").order("name"),
    ]);
    setSchedules(s ?? []);
    setDisplays(d ?? []);
    setPlaylists(p ?? []);
    if (d && d.length > 0 && !form.display_id) {
      setForm((f) => ({ ...f, display_id: d[0].id }));
    }
    if (p && p.length > 0 && !form.playlist_id) {
      setForm((f) => ({ ...f, playlist_id: p[0].id }));
    }
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  function toggleDay(day: DayOfWeek) {
    setForm((f) => {
      const days = new Set(f.days);
      if (days.has(day)) days.delete(day);
      else days.add(day);
      return { ...f, days };
    });
  }

  async function createSchedule(e: React.FormEvent) {
    e.preventDefault();
    if (!form.display_id || !form.playlist_id) return;
    setSaving(true);
    const supabase = createClient();
    await supabase.from("schedules").insert({
      display_id: form.display_id,
      playlist_id: form.playlist_id,
      days_of_week: Array.from(form.days),
      start_time: form.start_time,
      end_time: form.end_time,
      priority: form.priority,
    });
    setSaving(false);
    setShowAdd(false);
    load();
  }

  async function deleteSchedule(id: string) {
    const supabase = createClient();
    await supabase.from("schedules").delete().eq("id", id);
    setConfirmDelete(null);
    load();
  }

  function displayName(id: string) {
    return displays.find((d) => d.id === id)?.name ?? "Layar terhapus";
  }
  function playlistName(id: string) {
    return playlists.find((p) => p.id === id)?.name ?? "Playlist terhapus";
  }
  function dayLabels(days: DayOfWeek[]) {
    if (days.length === 0) return "Setiap hari";
    return days.map((d) => DAYS.find((x) => x.value === d)?.label).join(", ");
  }

  const canCreate = displays.length > 0 && playlists.length > 0;

  return (
    <div>
      <header className="mb-7 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold">Jadwal</h1>
          <p className="mt-1 text-sm text-text-muted">
            Ganti playlist otomatis berdasarkan hari dan jam. Jika tidak ada jadwal aktif,
            layar memakai playlist default-nya.
          </p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          disabled={!canCreate}
          className="rounded-lg bg-signal px-4 py-2 text-sm font-medium text-[#160a05] hover:opacity-90 disabled:opacity-40"
        >
          + Buat jadwal
        </button>
      </header>

      {!canCreate && !loading && (
        <p className="mb-4 text-sm text-text-muted">
          Tambahkan setidaknya satu layar dan satu playlist sebelum membuat jadwal.
        </p>
      )}

      {!loading && schedules.length === 0 && canCreate && (
        <div className="rounded-xl border border-dashed border-border p-10 text-center text-text-muted">
          Belum ada jadwal. Semua layar memakai playlist default-nya.
        </div>
      )}

      <div className="space-y-2.5">
        {schedules.map((s) => (
          <div
            key={s.id}
            className="flex items-center justify-between rounded-xl border border-border bg-surface p-4"
          >
            <div>
              <p className="font-medium">
                {displayName(s.display_id)} → {playlistName(s.playlist_id)}
              </p>
              <p className="mt-0.5 text-xs text-text-muted">
                {dayLabels(s.days_of_week)} · {s.start_time.slice(0, 5)}–{s.end_time.slice(0, 5)}
                {s.priority > 0 && ` · Prioritas ${s.priority}`}
              </p>
            </div>
            <button
              onClick={() => setConfirmDelete(s)}
              className="rounded-md border border-border px-2.5 py-1.5 text-xs text-text-muted hover:border-danger/50 hover:text-danger"
            >
              Hapus
            </button>
          </div>
        ))}
      </div>

      {showAdd && (
        <Modal title="Buat jadwal baru" onClose={() => setShowAdd(false)}>
          <form onSubmit={createSchedule} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm text-text-muted">Layar</label>
              <select
                value={form.display_id}
                onChange={(e) => setForm((f) => ({ ...f, display_id: e.target.value }))}
                className="w-full rounded-lg border border-border bg-surface-2 px-3.5 py-2.5 text-sm outline-none focus:border-signal"
              >
                {displays.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm text-text-muted">Playlist</label>
              <select
                value={form.playlist_id}
                onChange={(e) => setForm((f) => ({ ...f, playlist_id: e.target.value }))}
                className="w-full rounded-lg border border-border bg-surface-2 px-3.5 py-2.5 text-sm outline-none focus:border-signal"
              >
                {playlists.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm text-text-muted">
                Hari (kosongkan untuk setiap hari)
              </label>
              <div className="flex flex-wrap gap-1.5">
                {DAYS.map((d) => (
                  <button
                    type="button"
                    key={d.value}
                    onClick={() => toggleDay(d.value)}
                    className={`rounded-md px-2.5 py-1.5 text-xs ${
                      form.days.has(d.value)
                        ? "bg-signal text-[#160a05]"
                        : "border border-border text-text-muted"
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-sm text-text-muted">Mulai</label>
                <input
                  type="time"
                  value={form.start_time}
                  onChange={(e) => setForm((f) => ({ ...f, start_time: e.target.value }))}
                  className="w-full rounded-lg border border-border bg-surface-2 px-3.5 py-2.5 text-sm outline-none focus:border-signal"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm text-text-muted">Selesai</label>
                <input
                  type="time"
                  value={form.end_time}
                  onChange={(e) => setForm((f) => ({ ...f, end_time: e.target.value }))}
                  className="w-full rounded-lg border border-border bg-surface-2 px-3.5 py-2.5 text-sm outline-none focus:border-signal"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm text-text-muted">
                Prioritas (untuk jadwal yang tumpang tindih, angka lebih besar menang)
              </label>
              <input
                type="number"
                value={form.priority}
                onChange={(e) =>
                  setForm((f) => ({ ...f, priority: parseInt(e.target.value, 10) || 0 }))
                }
                className="w-full rounded-lg border border-border bg-surface-2 px-3.5 py-2.5 text-sm outline-none focus:border-signal"
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-lg bg-signal px-4 py-2.5 text-sm font-medium text-[#160a05] hover:opacity-90 disabled:opacity-50"
            >
              {saving ? "Menyimpan..." : "Buat jadwal"}
            </button>
          </form>
        </Modal>
      )}

      {confirmDelete && (
        <Modal title="Hapus jadwal?" onClose={() => setConfirmDelete(null)}>
          <p className="text-sm text-text-muted">Jadwal ini akan dihapus permanen.</p>
          <div className="mt-5 flex justify-end gap-2">
            <button
              onClick={() => setConfirmDelete(null)}
              className="rounded-lg border border-border px-4 py-2 text-sm text-text-muted hover:text-text"
            >
              Batal
            </button>
            <button
              onClick={() => deleteSchedule(confirmDelete.id)}
              className="rounded-lg bg-danger px-4 py-2 text-sm font-medium text-white hover:opacity-90"
            >
              Hapus
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
