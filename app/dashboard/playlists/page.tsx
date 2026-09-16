"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { Playlist } from "@/lib/types";
import Modal from "@/components/Modal";

export default function PlaylistsPage() {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Playlist | null>(null);

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data: p } = await supabase
      .from("playlists")
      .select("*")
      .order("created_at", { ascending: false });
    setPlaylists(p ?? []);

    if (p && p.length > 0) {
      const { data: items } = await supabase
        .from("playlist_items")
        .select("playlist_id");
      const map: Record<string, number> = {};
      (items ?? []).forEach((it) => {
        map[it.playlist_id] = (map[it.playlist_id] ?? 0) + 1;
      });
      setCounts(map);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  async function createPlaylist(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setSaving(true);
    const supabase = createClient();
    await supabase.from("playlists").insert({ name: newName.trim() });
    setSaving(false);
    setNewName("");
    setShowAdd(false);
    load();
  }

  async function deletePlaylist(id: string) {
    const supabase = createClient();
    await supabase.from("playlists").delete().eq("id", id);
    setConfirmDelete(null);
    load();
  }

  return (
    <div>
      <header className="mb-7 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold">Playlist</h1>
          <p className="mt-1 text-sm text-text-muted">
            Susun urutan konten yang akan diputar bergantian di layar.
          </p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="rounded-lg bg-signal px-4 py-2 text-sm font-medium text-[#160a05] hover:opacity-90"
        >
          + Buat playlist
        </button>
      </header>

      {!loading && playlists.length === 0 && (
        <div className="rounded-xl border border-dashed border-border p-10 text-center text-text-muted">
          Belum ada playlist. Buat satu untuk mulai menyusun konten.
        </div>
      )}

      <div className="space-y-2.5">
        {playlists.map((p) => (
          <Link
            key={p.id}
            href={`/dashboard/playlists/${p.id}`}
            className="flex items-center justify-between rounded-xl border border-border bg-surface p-4 transition-colors hover:border-signal/40"
          >
            <div>
              <p className="font-medium">{p.name}</p>
              <p className="mt-0.5 text-xs text-text-muted">
                {counts[p.id] ?? 0} konten
              </p>
            </div>
            <button
              onClick={(e) => {
                e.preventDefault();
                setConfirmDelete(p);
              }}
              className="rounded-md border border-border px-2.5 py-1.5 text-xs text-text-muted hover:border-danger/50 hover:text-danger"
            >
              Hapus
            </button>
          </Link>
        ))}
      </div>

      {showAdd && (
        <Modal title="Buat playlist baru" onClose={() => setShowAdd(false)}>
          <form onSubmit={createPlaylist} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm text-text-muted">Nama playlist</label>
              <input
                autoFocus
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Contoh: Promo Bulan Ini"
                className="w-full rounded-lg border border-border bg-surface-2 px-3.5 py-2.5 text-sm outline-none focus:border-signal"
              />
            </div>
            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-lg bg-signal px-4 py-2.5 text-sm font-medium text-[#160a05] hover:opacity-90 disabled:opacity-50"
            >
              {saving ? "Menyimpan..." : "Buat playlist"}
            </button>
          </form>
        </Modal>
      )}

      {confirmDelete && (
        <Modal title="Hapus playlist?" onClose={() => setConfirmDelete(null)}>
          <p className="text-sm text-text-muted">
            <span className="text-text">{confirmDelete.name}</span> akan dihapus. Layar yang
            memakai playlist ini akan kehilangan konten sampai diatur ulang.
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <button
              onClick={() => setConfirmDelete(null)}
              className="rounded-lg border border-border px-4 py-2 text-sm text-text-muted hover:text-text"
            >
              Batal
            </button>
            <button
              onClick={() => deletePlaylist(confirmDelete.id)}
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
