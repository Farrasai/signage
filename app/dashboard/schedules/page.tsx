"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Display, DayOfWeek, Playlist, Schedule, Profile } from "@/lib/types";
import { canEditOwner, isAdmin } from "@/lib/auth";
import { DAYS } from "@/lib/types";
import Modal from "@/components/Modal";
import Pagination from "@/components/Pagination";
import { useToast } from "@/lib/toast";

export default function SchedulesPage() {
  const toast = useToast();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [displays, setDisplays] = useState<Display[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Schedule | null>(null);
  const [page, setPage] = useState(1);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userId, setUserId] = useState<string|null>(null);

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
  useEffect(()=>{ const tp=Math.max(1, Math.ceil(schedules.length/10)); if(page>tp) setPage(tp); }, [schedules.length, page]);

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
    const { error } = await supabase.from("schedules").insert({
      display_id: form.display_id,
      playlist_id: form.playlist_id,
      days_of_week: Array.from(form.days),
      start_time: form.start_time,
      end_time: form.end_time,
      priority: form.priority,
    });
    setSaving(false);
    if (error) {
      toast.error(`Gagal membuat jadwal: ${error.message}`);
      return;
    }
    toast.success("Jadwal tayang berhasil dibuat.");
    setShowAdd(false);
    load();
  }

  async function deleteSchedule(id: string) {
    // guard checked in UI disabled prop, but also early return
    const supabase = createClient();
    const { error } = await supabase.from("schedules").delete().eq("id", id);
    setConfirmDelete(null);
    if (error) {
      toast.error(`Gagal menghapus jadwal: ${error.message}`);
      return;
    }
    toast.success("Jadwal tayang dihapus.");
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
      <div className="mb-5 flex justify-end"><button data-testid="add-schedule-button" onClick={() => setShowAdd(true)} disabled={!canCreate} className="bg-emerald-600 hover:bg-emerald-700 cursor-pointer rounded-xl px-4 py-2.5 text-sm font-bold text-white shadow hover:opacity-95 disabled:opacity-40">+ Buat jadwal</button></div>

      {!canCreate && !loading && (
        <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
          Tambahkan setidaknya satu layar dan satu playlist sebelum membuat jadwal.
        </p>
      )}

      {!loading && schedules.length === 0 && canCreate && (
        <div data-testid="schedules-empty" className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 p-10 text-center text-slate-500 dark:text-slate-400">
          Belum ada jadwal. Semua layar memakai playlist default-nya.
        </div>
      )}

      {(() => { const _ps=10; const _tp=Math.max(1,Math.ceil(schedules.length/_ps)); const paginated=schedules.slice((Math.min(page,_tp)-1)*_ps, Math.min(page,_tp)*_ps); return (<><div className="space-y-2.5 min-w-0">
        {paginated.map((s) => (
          <div
            key={s.id}
            data-testid={`schedule-row-${s.id}`}
            className="flex items-center justify-between rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4"
          >
            <div>
              <p className="font-bold text-slate-900 dark:text-white">
                {displayName(s.display_id)} <span className="mx-1 text-slate-400">→</span> <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">{playlistName(s.playlist_id)}</span>
              </p>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                {dayLabels(s.days_of_week)} · {s.start_time.slice(0, 5)}–{s.end_time.slice(0, 5)}
                {s.priority > 0 && ` · Prioritas ${s.priority}`}
              </p>
            </div>
            <button
              data-testid={`delete-schedule-${s.id}`}
              onClick={() => setConfirmDelete(s)}
              className="rounded-md border border-slate-200 dark:border-slate-800 px-2.5 py-1.5 text-xs text-slate-500 dark:text-slate-400 hover:border-rose-400/50 hover:text-rose-600 dark:text-rose-400"
            >
              Hapus
            </button>
          </div>
        ))}
      </div>
      <Pagination page={page} totalPages={Math.max(1, Math.ceil(schedules.length/10))} onPageChange={setPage} />
      </>);})()}

      {showAdd && (
        <Modal title="Buat jadwal baru" onClose={() => setShowAdd(false)}>
          <form onSubmit={createSchedule} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm text-slate-500 dark:text-slate-400">Layar</label>
              <select
                data-testid="schedule-display-select"
                value={form.display_id}
                onChange={(e) => setForm((f) => ({ ...f, display_id: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800 px-3.5 py-2.5 text-sm outline-none focus:border-emerald-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                {displays.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm text-slate-500 dark:text-slate-400">Playlist</label>
              <select
                data-testid="schedule-playlist-select"
                value={form.playlist_id}
                onChange={(e) => setForm((f) => ({ ...f, playlist_id: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800 px-3.5 py-2.5 text-sm outline-none focus:border-emerald-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                {playlists.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm text-slate-500 dark:text-slate-400">
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
                        ? "bg-emerald-600 text-white"
                        : "border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400"
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-sm text-slate-500 dark:text-slate-400">Mulai</label>
                <input
                  type="time"
                  value={form.start_time}
                  onChange={(e) => setForm((f) => ({ ...f, start_time: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800 px-3.5 py-2.5 text-sm outline-none focus:border-emerald-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm text-slate-500 dark:text-slate-400">Selesai</label>
                <input
                  type="time"
                  value={form.end_time}
                  onChange={(e) => setForm((f) => ({ ...f, end_time: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800 px-3.5 py-2.5 text-sm outline-none focus:border-emerald-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm text-slate-500 dark:text-slate-400">
                Prioritas (untuk jadwal yang tumpang tindih, angka lebih besar menang)
              </label>
              <input
                type="number"
                value={form.priority}
                onChange={(e) =>
                  setForm((f) => ({ ...f, priority: parseInt(e.target.value, 10) || 0 }))
                }
                className="w-full rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800 px-3.5 py-2.5 text-sm outline-none focus:border-emerald-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>

            <button
              data-testid="schedule-submit"
              type="submit"
              disabled={saving}
              className="bg-emerald-600 hover:bg-emerald-700 w-full cursor-pointer rounded-xl px-4 py-3.5 text-sm font-bold text-white shadow hover:opacity-95 disabled:opacity-50"
            >
              {saving ? "Menyimpan..." : "Buat jadwal"}
            </button>
          </form>
        </Modal>
      )}

      {confirmDelete && (
        <Modal title="Hapus jadwal?" onClose={() => setConfirmDelete(null)}>
          <p className="text-sm text-slate-500 dark:text-slate-400">Jadwal ini akan dihapus permanen.</p>
          <div className="mt-5 flex justify-end gap-2">
            <button
              onClick={() => setConfirmDelete(null)}
              className="rounded-lg border border-slate-200 dark:border-slate-800 px-4 py-2 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white"
            >
              Batal
            </button>
            <button
              onClick={() => deleteSchedule(confirmDelete.id)}
              className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:opacity-90"
            >
              Hapus
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
