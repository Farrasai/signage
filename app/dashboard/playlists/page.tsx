"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { Playlist, Profile } from "@/lib/types";
import { canEditOwner } from "@/lib/auth";
import Modal from "@/components/Modal";
import Pagination from "@/components/Pagination";

export default function PlaylistsPage() {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Playlist | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userId, setUserId] = useState<string|null>(null);
  const [page, setPage] = useState(1);

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
  useEffect(()=>{ const tp=Math.max(1, Math.ceil(playlists.length/10)); if(page>tp) setPage(tp); }, [playlists.length, page]);

  async function createPlaylist(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setSaving(true);
    const supabase = createClient();
    await supabase.from("playlists").insert({ name: newName.trim(), owner_id: userId });
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
      <div className="mb-5 flex justify-end"><button onClick={() => setShowAdd(true)} className="bg-emerald-600 hover:bg-emerald-700 cursor-pointer rounded-xl px-4 py-2.5 text-sm font-bold text-white shadow hover:opacity-95">+ Buat playlist</button></div>

      {!loading && playlists.length === 0 && (
        <div data-testid="playlists-empty" className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 p-10 text-center text-slate-500 dark:text-slate-400">
          Belum ada playlist. Buat satu untuk mulai menyusun konten.
        </div>
      )}

      {(() => { const _ps=10; const _tp=Math.max(1,Math.ceil(playlists.length/_ps)); const paginated=playlists.slice((Math.min(page,_tp)-1)*_ps, Math.min(page,_tp)*_ps); return (<><div className="space-y-2.5">
        {paginated.map((p) => (
          <Link
            key={p.id}
            href={`/dashboard/playlists/${p.id}`}
            className="flex items-center justify-between rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 transition-colors hover:border-emerald-500/40"
          >
            <div>
              <p className="font-medium">{p.name}</p>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                {counts[p.id] ?? 0} konten
              </p>
            </div>
            <button
              onClick={(e) => {
                e.preventDefault();
                setConfirmDelete(p);
              }}
              className="rounded-md border border-slate-200 dark:border-slate-800 px-2.5 py-1.5 text-xs text-slate-500 dark:text-slate-400 hover:border-rose-400/50 hover:text-rose-600 dark:text-rose-400"
            >
              Hapus
            </button>
          </Link>
        ))}
      </div>
      <Pagination page={page} totalPages={Math.max(1, Math.ceil(playlists.length/10))} onPageChange={setPage} />
      </>);})()}

      {showAdd && (
        <Modal title="Buat playlist baru" onClose={() => setShowAdd(false)}>
          <form onSubmit={createPlaylist} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm text-slate-500 dark:text-slate-400">Nama playlist</label>
              <input
                autoFocus
                data-testid="playlist-name-input"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Contoh: Promo Bulan Ini"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800 px-3.5 py-2.5 text-sm outline-none focus:border-emerald-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
            <button
              type="submit"
              data-testid="playlist-submit"
              disabled={saving}
              className="bg-emerald-600 hover:bg-emerald-700 w-full cursor-pointer rounded-xl px-4 py-2.5 text-sm font-bold text-white shadow hover:opacity-95 disabled:opacity-50"
            >
              {saving ? "Menyimpan..." : "Buat playlist"}
            </button>
          </form>
        </Modal>
      )}

      {confirmDelete && (
        <Modal title="Hapus playlist?" onClose={() => setConfirmDelete(null)}>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            <span className="text-slate-900 dark:text-white">{confirmDelete.name}</span> akan dihapus. Layar yang
            memakai playlist ini akan kehilangan konten sampai diatur ulang.
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <button
              onClick={() => setConfirmDelete(null)}
              className="rounded-md border border-slate-200 dark:border-slate-800 px-4 py-2 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white"
            >
              Batal
            </button>
            <button
              onClick={() => deletePlaylist(confirmDelete.id)}
              className="rounded-md bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:opacity-90"
            >
              Hapus
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
