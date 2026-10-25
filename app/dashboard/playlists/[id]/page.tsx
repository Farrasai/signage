"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { Media, Playlist, PlaylistItem, Profile } from "@/lib/types";
import { canEditOwner } from "@/lib/auth";
import Modal from "@/components/Modal";

export default function PlaylistEditorPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const playlistId = params.id;

  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [items, setItems] = useState<PlaylistItem[]>([]);
  const [library, setLibrary] = useState<Media[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPicker, setShowPicker] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data: pl } = await supabase.from("playlists").select("*").eq("id", playlistId).single();
    if (!pl) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    setPlaylist(pl);

    const { data: it } = await supabase
      .from("playlist_items")
      .select("*, media(*)")
      .eq("playlist_id", playlistId)
      .order("sort_order", { ascending: true });
    setItems((it as unknown as PlaylistItem[]) ?? []);

    const { data: lib } = await supabase.from("media").select("*").order("name");
    setLibrary(lib ?? []);

    // Load the current user's profile so ownership checks (canEditOwner) work.
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: prof } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();
      setProfile((prof as Profile) ?? null);
    }

    setLoading(false);
  }, [playlistId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  async function renamePlaylist(name: string) {
    if (!playlist || !name.trim() || name === playlist.name) return;
    const supabase = createClient();
    await supabase.from("playlists").update({ name: name.trim() }).eq("id", playlistId);
    setPlaylist({ ...playlist, name: name.trim() });
  }

  async function addMedia(mediaId: string) {
    if (playlist && !canEditOwner(profile, playlist.owner_id)) return;
    const supabase = createClient();
    await supabase.from("playlist_items").insert({
      playlist_id: playlistId,
      media_id: mediaId,
      sort_order: items.length,
    });
    setShowPicker(false);
    load();
  }

  async function removeItem(itemId: string) {
    if (playlist && !canEditOwner(profile, playlist.owner_id)) return;
    const supabase = createClient();
    await supabase.from("playlist_items").delete().eq("id", itemId);
    load();
  }

  async function move(index: number, direction: -1 | 1) {
    if (playlist && !canEditOwner(profile, playlist.owner_id)) return;
    const target = index + direction;
    if (target < 0 || target >= items.length) return;
    const reordered = [...items];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    setItems(reordered);

    const supabase = createClient();
    await Promise.all(
      reordered.map((it, i) =>
        supabase.from("playlist_items").update({ sort_order: i }).eq("id", it.id)
      )
    );
  }

  async function setOverride(itemId: string, value: number | null) {
    const supabase = createClient();
    await supabase.from("playlist_items").update({ duration_override: value }).eq("id", itemId);
    setItems((prev) =>
      prev.map((it) => (it.id === itemId ? { ...it, duration_override: value } : it))
    );
  }

  if (loading) return <p className="text-sm text-slate-500 dark:text-slate-400">Memuat playlist...</p>;

  if (notFound) {
    return (
      <div>
        <p className="text-slate-500 dark:text-slate-400">Playlist tidak ditemukan.</p>
        <button onClick={() => router.push("/dashboard/playlists")} className="mt-3 text-emerald-600">
          ← Kembali ke daftar playlist
        </button>
      </div>
    );
  }

  const usedIds = new Set(items.map((it) => it.media_id));
  const available = library.filter((m) => !usedIds.has(m.id));

  return (
    <div>
      <Link href="/dashboard/playlists" className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white">
        ← Semua playlist
      </Link>

      <header className="mb-6 mt-2 flex items-center justify-between">
        <input
          defaultValue={playlist?.name}
          onBlur={(e) => renamePlaylist(e.target.value)}
          className="w-full max-w-md bg-transparent text-2xl font-semibold text-slate-900 dark:text-white outline-none focus:text-emerald-600"
        />
        <button
          data-testid="add-content-button"
          onClick={() => setShowPicker(true)}
          className="shrink-0 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          + Tambah konten
        </button>
      </header>

      {items.length === 0 && (
        <div data-testid="playlist-detail-empty" className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 p-10 text-center text-slate-500 dark:text-slate-400">
          Playlist masih kosong. Tambahkan foto, video, atau YouTube dari perpustakaan konten.
        </div>
      )}

      <div className="space-y-2.5">
        {items.map((item, index) => (
          <div
            key={item.id}
            data-testid={`playlist-item-${item.id}`}
            className="flex items-center gap-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3"
          >
            <span className="w-6 text-center text-sm text-slate-500 dark:text-slate-400">{index + 1}</span>
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{item.media?.name}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {item.media?.type === "youtube_video" && "YouTube video"}
                  {item.media?.type === "youtube_playlist" && "YouTube playlist"}
                  {item.media?.type === "video" && "Video"}
                  {item.media?.type === "image" && "Foto"}
                  {item.media?.type === "table" && "Tabel"}
                </p>
              </div>
            </div>
            <label className="flex shrink-0 items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
              Durasi
              <input
                type="number"
                min={1}
                placeholder={String(item.media?.duration ?? 10)}
                defaultValue={item.duration_override ?? undefined}
                onBlur={(e) => {
                  const raw = e.target.value;
                  setOverride(item.id, raw === "" ? null : parseInt(raw, 10));
                }}
                className="w-16 rounded-xl border border-slate-200 bg-slate-50 px-1.5 py-1 text-center font-mono font-bold outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-800"
              />
              detik
            </label>
            <div className="flex shrink-0 items-center gap-1">
              <button
                onClick={() => move(index, -1)}
                disabled={index === 0}
                className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
              >
                ↑
              </button>
              <button
                onClick={() => move(index, 1)}
                disabled={index === items.length - 1}
                className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
              >
                ↓
              </button>
              <button
                data-testid={`remove-playlist-item-${item.id}`}
                onClick={() => removeItem(item.id)}
                className="cursor-pointer rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-100 dark:border-rose-900/40 dark:bg-rose-950/30"
              >
                Hapus
              </button>
            </div>
          </div>
        ))}
      </div>

      {showPicker && (
        <Modal title="Pilih konten" onClose={() => setShowPicker(false)} width="max-w-lg">
          {available.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Semua konten di perpustakaan sudah ada di playlist ini. Tambah konten baru dari
              halaman Konten.
            </p>
          ) : (
            <div className="max-h-96 space-y-1.5 overflow-y-auto">
              {available.map((m) => (
                <button
                  key={m.id}
                  onClick={() => addMedia(m.id)}
                  className="flex w-full items-center justify-between rounded-md border border-slate-200 dark:border-slate-800 px-3.5 py-2.5 text-left text-sm hover:border-emerald-500/50"
                >
                  <span className="truncate">{m.name}</span>
                  <span className="shrink-0 text-xs text-slate-500 dark:text-slate-400">{m.duration}s</span>
                </button>
              ))}
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}