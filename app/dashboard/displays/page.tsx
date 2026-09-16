"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Display, Playlist } from "@/lib/types";
import { generateSlug, playerUrlFor, formatDateTime } from "@/lib/utils";
import Modal from "@/components/Modal";
import StatusDot from "@/components/StatusDot";
import RemoteControls from "@/components/RemoteControls";

export default function DisplaysPage() {
  const [displays, setDisplays] = useState<Display[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Display | null>(null);

  const load = useCallback(async () => {
    const supabase = createClient();
    const [{ data: d }, { data: p }] = await Promise.all([
      supabase.from("displays").select("*").order("created_at", { ascending: false }),
      supabase.from("playlists").select("*").order("name"),
    ]);
    setDisplays(d ?? []);
    setPlaylists(p ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  async function createDisplay(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setSaving(true);
    const supabase = createClient();
    await supabase.from("displays").insert({
      name: newName.trim(),
      slug: generateSlug(newName),
    });
    setSaving(false);
    setNewName("");
    setShowAdd(false);
    load();
  }

  async function updateDisplay(id: string, patch: Partial<Display>) {
    const supabase = createClient();
    await supabase.from("displays").update(patch).eq("id", id);
    setDisplays((prev) => prev.map((d) => (d.id === id ? { ...d, ...patch } : d)));
  }

  async function deleteDisplay(id: string) {
    const supabase = createClient();
    await supabase.from("displays").delete().eq("id", id);
    setConfirmDelete(null);
    load();
  }

  async function copyUrl(slug: string, id: string) {
    await navigator.clipboard.writeText(playerUrlFor(slug));
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  }

  return (
    <div>
      <header className="mb-7 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold">Layar & TV</h1>
          <p className="mt-1 text-sm text-text-muted">
            Setiap layar punya URL sendiri untuk dibuka di browser TV.
          </p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="rounded-lg bg-signal px-4 py-2 text-sm font-medium text-[#160a05] hover:opacity-90"
        >
          + Tambah layar
        </button>
      </header>

      {!loading && displays.length === 0 && (
        <div className="rounded-xl border border-dashed border-border p-10 text-center text-text-muted">
          Belum ada layar. Klik &ldquo;Tambah layar&rdquo; untuk mulai.
        </div>
      )}

      <div className="space-y-3">
        {displays.map((d) => (
          <div key={d.id} className="rounded-xl border border-border bg-surface p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <input
                  defaultValue={d.name}
                  onBlur={(e) => {
                    if (e.target.value.trim() && e.target.value !== d.name) {
                      updateDisplay(d.id, { name: e.target.value.trim() });
                    }
                  }}
                  className="w-full max-w-xs bg-transparent font-medium outline-none focus:text-signal"
                />
                <p className="mt-0.5 font-mono text-xs text-text-muted">{d.slug}</p>
              </div>
              <StatusDot lastSeen={d.last_seen} />
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 border-t border-border pt-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs text-text-muted">Playlist default</label>
                <select
                  value={d.default_playlist_id ?? ""}
                  onChange={(e) =>
                    updateDisplay(d.id, { default_playlist_id: e.target.value || null })
                  }
                  className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-signal"
                >
                  <option value="">— Belum diatur —</option>
                  {playlists.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 flex items-center justify-between text-xs text-text-muted">
                  <span>Teks berjalan (marquee)</span>
                  <button
                    type="button"
                    onClick={() => updateDisplay(d.id, { marquee_enabled: !d.marquee_enabled })}
                    className={`rounded px-1.5 py-0.5 text-[10px] ${
                      d.marquee_enabled
                        ? "bg-online/10 text-online"
                        : "bg-surface-2 text-text-muted"
                    }`}
                  >
                    {d.marquee_enabled ? "Aktif" : "Nonaktif"}
                  </button>
                </label>
                <input
                  defaultValue={d.marquee_text}
                  placeholder="Contoh: Selamat datang di kantor kami"
                  onBlur={(e) => {
                    if (e.target.value !== d.marquee_text) {
                      updateDisplay(d.id, { marquee_text: e.target.value });
                    }
                  }}
                  className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-signal"
                />
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
              <RemoteControls displayId={d.id} isPaused={d.is_paused} />
              <div className="flex items-center gap-2 text-xs">
                <span className="text-text-muted">{formatDateTime(d.last_seen)}</span>
                <button
                  onClick={() => copyUrl(d.slug, d.id)}
                  className="rounded-md border border-border px-2.5 py-1.5 text-text-muted hover:border-signal/50 hover:text-text"
                >
                  {copiedId === d.id ? "Tersalin!" : "Salin URL"}
                </button>
                <a
                  href={`/display/${d.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-md border border-border px-2.5 py-1.5 hover:border-signal/50"
                >
                  Buka ↗
                </a>
                <button
                  onClick={() => setConfirmDelete(d)}
                  className="rounded-md border border-border px-2.5 py-1.5 text-text-muted hover:border-danger/50 hover:text-danger"
                >
                  Hapus
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showAdd && (
        <Modal title="Tambah layar baru" onClose={() => setShowAdd(false)}>
          <form onSubmit={createDisplay} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm text-text-muted">Nama layar</label>
              <input
                autoFocus
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Contoh: TV Lobby Utama"
                className="w-full rounded-lg border border-border bg-surface-2 px-3.5 py-2.5 text-sm outline-none focus:border-signal"
              />
            </div>
            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-lg bg-signal px-4 py-2.5 text-sm font-medium text-[#160a05] hover:opacity-90 disabled:opacity-50"
            >
              {saving ? "Menyimpan..." : "Buat layar"}
            </button>
          </form>
        </Modal>
      )}

      {confirmDelete && (
        <Modal title="Hapus layar?" onClose={() => setConfirmDelete(null)}>
          <p className="text-sm text-text-muted">
            <span className="text-text">{confirmDelete.name}</span> akan dihapus permanen.
            Jadwal yang terhubung ke layar ini juga akan terhapus.
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <button
              onClick={() => setConfirmDelete(null)}
              className="rounded-lg border border-border px-4 py-2 text-sm text-text-muted hover:text-text"
            >
              Batal
            </button>
            <button
              onClick={() => deleteDisplay(confirmDelete.id)}
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
