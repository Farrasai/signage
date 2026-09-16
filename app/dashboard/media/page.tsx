"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Media, MediaType } from "@/lib/types";
import { parseYouTubeUrl } from "@/lib/utils";
import Modal from "@/components/Modal";

function readVideoDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(video.src);
      resolve(Math.round(video.duration) || 15);
    };
    video.onerror = () => resolve(15);
    video.src = URL.createObjectURL(file);
  });
}

const TYPE_LABEL: Record<MediaType, string> = {
  image: "Foto",
  video: "Video",
  youtube_video: "YouTube (video)",
  youtube_playlist: "YouTube (playlist)",
};

export default function MediaPage() {
  const [items, setItems] = useState<Media[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [tab, setTab] = useState<"upload" | "youtube">("upload");
  const [uploading, setUploading] = useState(false);
  const [progressLabel, setProgressLabel] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<Media | null>(null);

  const [ytUrl, setYtUrl] = useState("");
  const [ytName, setYtName] = useState("");
  const [ytDuration, setYtDuration] = useState(30);
  const [ytError, setYtError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase.from("media").select("*").order("created_at", { ascending: false });
    setItems(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    const supabase = createClient();

    for (const file of Array.from(files)) {
      setProgressLabel(`Mengunggah ${file.name}...`);
      const isVideo = file.type.startsWith("video/");
      const type: MediaType = isVideo ? "video" : "image";
      const path = `${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_")}`;

      const { error: uploadError } = await supabase.storage.from("media").upload(path, file, {
        cacheControl: "31536000",
        upsert: false,
      });
      if (uploadError) {
        alert(`Gagal mengunggah ${file.name}: ${uploadError.message}`);
        continue;
      }

      const { data: pub } = supabase.storage.from("media").getPublicUrl(path);
      const duration = isVideo ? await readVideoDuration(file) : 10;

      await supabase.from("media").insert({
        name: file.name.replace(/\.[^.]+$/, ""),
        type,
        url: pub.publicUrl,
        duration,
      });
    }

    setUploading(false);
    setProgressLabel("");
    setShowAdd(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
    load();
  }

  async function handleAddYoutube(e: React.FormEvent) {
    e.preventDefault();
    setYtError(null);
    const parsed = parseYouTubeUrl(ytUrl);
    if (!parsed) {
      setYtError("URL YouTube tidak valid. Tempel link video atau playlist.");
      return;
    }
    setUploading(true);
    const supabase = createClient();
    await supabase.from("media").insert({
      name: ytName.trim() || (parsed.type === "youtube_playlist" ? "Playlist YouTube" : "Video YouTube"),
      type: parsed.type,
      url: parsed.id,
      duration: ytDuration,
    });
    setUploading(false);
    setYtUrl("");
    setYtName("");
    setYtDuration(30);
    setShowAdd(false);
    load();
  }

  async function updateDuration(id: string, duration: number) {
    const supabase = createClient();
    await supabase.from("media").update({ duration }).eq("id", id);
    setItems((prev) => prev.map((m) => (m.id === id ? { ...m, duration } : m)));
  }

  async function deleteMedia(item: Media) {
    const supabase = createClient();
    if (item.type === "image" || item.type === "video") {
      const path = item.url.split("/media/")[1];
      if (path) await supabase.storage.from("media").remove([decodeURIComponent(path)]);
    }
    await supabase.from("media").delete().eq("id", item.id);
    setConfirmDelete(null);
    load();
  }

  return (
    <div>
      <header className="mb-7 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold">Konten</h1>
          <p className="mt-1 text-sm text-text-muted">
            Foto dan video disimpan di CDN Supabase Storage. Atau tautkan video/playlist YouTube.
          </p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="rounded-lg bg-signal px-4 py-2 text-sm font-medium text-[#160a05] hover:opacity-90"
        >
          + Tambah konten
        </button>
      </header>

      {!loading && items.length === 0 && (
        <div className="rounded-xl border border-dashed border-border p-10 text-center text-text-muted">
          Belum ada konten. Unggah foto/video atau tambahkan link YouTube.
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((m) => (
          <div key={m.id} className="overflow-hidden rounded-xl border border-border bg-surface">
            <div className="flex h-32 items-center justify-center bg-surface-2">
              {m.type === "image" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={m.url} alt={m.name} className="h-full w-full object-cover" />
              ) : m.type === "video" ? (
                <video src={m.url} className="h-full w-full object-cover" muted />
              ) : (
                <div className="flex flex-col items-center gap-1 text-red-400">
                  <span className="text-2xl">▶</span>
                  <span className="text-[10px] text-text-muted">{TYPE_LABEL[m.type]}</span>
                </div>
              )}
            </div>
            <div className="p-3">
              <p className="truncate text-sm font-medium">{m.name}</p>
              <p className="mt-0.5 text-xs text-text-muted">{TYPE_LABEL[m.type]}</p>
              <div className="mt-2.5 flex items-center justify-between gap-2">
                <label className="flex items-center gap-1.5 text-xs text-text-muted">
                  Durasi
                  <input
                    type="number"
                    min={1}
                    defaultValue={m.duration}
                    onBlur={(e) => {
                      const val = parseInt(e.target.value, 10);
                      if (val > 0 && val !== m.duration) updateDuration(m.id, val);
                    }}
                    className="w-14 rounded-md border border-border bg-surface-2 px-1.5 py-1 text-center outline-none focus:border-signal"
                  />
                  detik
                </label>
                <button
                  onClick={() => setConfirmDelete(m)}
                  className="text-xs text-text-muted hover:text-danger"
                >
                  Hapus
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showAdd && (
        <Modal title="Tambah konten" onClose={() => setShowAdd(false)}>
          <div className="mb-4 flex gap-1 rounded-lg bg-surface-2 p-1">
            <button
              onClick={() => setTab("upload")}
              className={`flex-1 rounded-md py-1.5 text-sm ${
                tab === "upload" ? "bg-surface text-text" : "text-text-muted"
              }`}
            >
              Unggah file
            </button>
            <button
              onClick={() => setTab("youtube")}
              className={`flex-1 rounded-md py-1.5 text-sm ${
                tab === "youtube" ? "bg-surface text-text" : "text-text-muted"
              }`}
            >
              YouTube
            </button>
          </div>

          {tab === "upload" ? (
            <div>
              <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border py-10 text-sm text-text-muted hover:border-signal/50">
                <span>Klik untuk pilih foto atau video</span>
                <span className="text-xs">JPG, PNG, MP4 — bisa pilih banyak file</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  className="hidden"
                  onChange={handleFileUpload}
                  disabled={uploading}
                />
              </label>
              {uploading && (
                <p className="mt-3 text-center text-xs text-text-muted">{progressLabel}</p>
              )}
            </div>
          ) : (
            <form onSubmit={handleAddYoutube} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm text-text-muted">
                  Link video atau playlist YouTube
                </label>
                <input
                  value={ytUrl}
                  onChange={(e) => setYtUrl(e.target.value)}
                  placeholder="https://youtube.com/watch?v=... atau /playlist?list=..."
                  className="w-full rounded-lg border border-border bg-surface-2 px-3.5 py-2.5 text-sm outline-none focus:border-signal"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm text-text-muted">Nama (opsional)</label>
                <input
                  value={ytName}
                  onChange={(e) => setYtName(e.target.value)}
                  placeholder="Contoh: Playlist musik kantor"
                  className="w-full rounded-lg border border-border bg-surface-2 px-3.5 py-2.5 text-sm outline-none focus:border-signal"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm text-text-muted">
                  Durasi ditampilkan sebelum lanjut ke konten berikutnya (detik)
                </label>
                <input
                  type="number"
                  min={5}
                  value={ytDuration}
                  onChange={(e) => setYtDuration(parseInt(e.target.value, 10) || 30)}
                  className="w-full rounded-lg border border-border bg-surface-2 px-3.5 py-2.5 text-sm outline-none focus:border-signal"
                />
              </div>
              {ytError && <p className="text-sm text-danger">{ytError}</p>}
              <button
                type="submit"
                disabled={uploading}
                className="w-full rounded-lg bg-signal px-4 py-2.5 text-sm font-medium text-[#160a05] hover:opacity-90 disabled:opacity-50"
              >
                {uploading ? "Menyimpan..." : "Tambahkan"}
              </button>
            </form>
          )}
        </Modal>
      )}

      {confirmDelete && (
        <Modal title="Hapus konten?" onClose={() => setConfirmDelete(null)}>
          <p className="text-sm text-text-muted">
            <span className="text-text">{confirmDelete.name}</span> akan dihapus dari semua
            playlist yang memakainya.
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <button
              onClick={() => setConfirmDelete(null)}
              className="rounded-lg border border-border px-4 py-2 text-sm text-text-muted hover:text-text"
            >
              Batal
            </button>
            <button
              onClick={() => deleteMedia(confirmDelete)}
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
