"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Media } from "@/lib/types";
import { isMediaStorageUrl, mediaStorageBase } from "@/lib/utils";
import Modal from "@/components/Modal";
import EditMediaModal from "@/components/EditMediaModal";
import { useToast } from "@/lib/toast";
import { PAGE_SIZE, type FilterType, type ViewMode } from "@/components/media/constants";
import MediaToolbar from "@/components/media/MediaToolbar";
import MediaGrid from "@/components/media/MediaGrid";
import MediaList from "@/components/media/MediaList";
import AddMediaModal from "@/components/media/AddMediaModal";
import MediaEmptyStates from "@/components/media/MediaEmptyStates";
import { useMediaForm } from "@/components/media/useMediaForm";

export default function MediaPage() {
  const toast = useToast();
  const [items, setItems] = useState<Media[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Media | null>(null);
  const [editingItem, setEditingItem] = useState<Media | null>(null);

  // toolbar state
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterType>("semua");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [page, setPage] = useState(1);

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

  // derived: filtered items
  const filtered = items.filter((m) => {
    const matchFilter =
      filter === "semua" ||
      (filter === "youtube_video" && (m.type === "youtube_video" || m.type === "youtube_playlist")) ||
      m.type === filter;
    const matchSearch = m.name.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  // Clamp saat render: halaman bisa melebihi total setelah filter berubah,
  // tanpa perlu efek (menghindari setState sinkron di dalam effect).
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  // counts per type for pill badges
  const counts = {
    semua: items.length,
    image: items.filter((m) => m.type === "image").length,
    video: items.filter((m) => m.type === "video").length,
    youtube_video: items.filter((m) => m.type === "youtube_video" || m.type === "youtube_playlist").length,
    table: items.filter((m) => m.type === "table").length,
  };

  async function updateDuration(id: string, duration: number) {
    const supabase = createClient();
    const { error } = await supabase.from("media").update({ duration }).eq("id", id);
    if (error) {
      toast.error(`Gagal menyimpan durasi: ${error.message}`);
      return;
    }
    toast.success(`Durasi diubah menjadi ${duration} detik.`);
    setItems((prev) => prev.map((m) => (m.id === id ? { ...m, duration } : m)));
  }

  async function deleteMedia(item: Media) {
    const supabase = createClient();
    if ((item.type === "image" || item.type === "video") && isMediaStorageUrl(item.url)) {
      const path = item.url.slice(mediaStorageBase().length);
      if (path) await supabase.storage.from("media").remove([decodeURIComponent(path)]);
    }
    const { error } = await supabase.from("media").delete().eq("id", item.id);
    setConfirmDelete(null);
    if (error) {
      toast.error(`Gagal menghapus konten: ${error.message}`);
      return;
    }
    toast.success(`"${item.name}" dihapus.`);
    load();
  }

  const PILLS: { key: FilterType; label: string; count: number }[] = [
    { key: "semua", label: "Semua", count: counts.semua },
    { key: "image", label: "Foto", count: counts.image },
    { key: "video", label: "Video", count: counts.video },
    { key: "youtube_video", label: "YouTube", count: counts.youtube_video },
    { key: "table", label: "Tabel", count: counts.table },
  ];
return (
    <div>
      <div className="mb-5 flex justify-end">
        <button
          data-testid="add-media-button"
          onClick={() => setShowAdd(true)}
          className="bg-emerald-600 hover:bg-emerald-700 shrink-0 cursor-pointer rounded-xl px-4 py-2.5 text-sm font-bold text-white shadow hover:opacity-95"
        >
          + Tambah konten
        </button>
      </div>

      <MediaToolbar
        search={search}
        filter={filter}
        viewMode={viewMode}
        pills={PILLS}
        onSearchChange={(v) => {
          setSearch(v);
          setPage(1);
        }}
        onFilterChange={(f) => {
          setFilter(f);
          setPage(1);
        }}
        onViewModeChange={setViewMode}
      />

      {/* Loading state */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
            />
          ))}
        </div>
      )}

      <MediaEmptyStates
        loading={loading}
        itemsCount={items.length}
        filteredCount={filtered.length}
        onAdd={() => setShowAdd(true)}
        onReset={() => {
          setSearch("");
          setFilter("semua");
          setPage(1);
        }}
      />

      {!loading && filtered.length > 0 && viewMode === "grid" && (
        <MediaGrid
          items={paginated}
          onEdit={setEditingItem}
          onDelete={setConfirmDelete}
          onSaveDuration={updateDuration}
        />
      )}

      {!loading && filtered.length > 0 && viewMode === "list" && (
        <MediaList
          items={paginated}
          onEdit={setEditingItem}
          onDelete={setConfirmDelete}
          onSaveDuration={updateDuration}
        />
      )}

      {showAdd && (
        <AddMediaHost
          onClose={() => setShowAdd(false)}
          onSaved={() => {
            setShowAdd(false);
            load();
          }}
        />
      )}

      {editingItem && (
        <EditMediaModal
          item={editingItem}
          onClose={() => setEditingItem(null)}
          onSaved={() => {
            setEditingItem(null);
            toast.success("Perubahan konten disimpan.");
            load();
          }}
        />
      )}

      {confirmDelete && (
        <Modal title="Hapus konten?" onClose={() => setConfirmDelete(null)}>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            <span className="text-slate-900 dark:text-white">{confirmDelete.name}</span> akan dihapus dari
            semua playlist yang memakainya.
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <button
              onClick={() => setConfirmDelete(null)}
              className="rounded-xl border border-slate-200 dark:border-slate-800 px-4 py-2 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white"
            >
              Batal
            </button>
            <button
              onClick={() => deleteMedia(confirmDelete)}
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

/**
 * Host modal tambah konten. Dipisah karena hook `useMediaForm` harus hidup di
 * dalam komponen yang ter-mount hanya saat modal terbuka — supaya state form
 * kembali bersih setiap kali modal ditutup lalu dibuka lagi.
 */
function AddMediaHost({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const form = useMediaForm({ onSaved });
  return <AddMediaModal tab={form.tab} onTabChange={form.setTab} onClose={onClose} form={form} />;
}