"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Media, MediaType, Profile } from "@/lib/types";
import { canEditOwner } from "@/lib/auth";
import {
  DEFAULT_AGENDA_COLUMNS,
  guessMediaTypeFromUrl,
  isMediaStorageUrl,
  mediaStorageBase,
  parseDelimitedText,
  parseYouTubeUrl,
} from "@/lib/utils";
import { sanitizeText } from "@/lib/sanitize";
import Modal from "@/components/Modal";
import Pagination from "@/components/Pagination";
import { useMemo } from "react";
import EditMediaModal from "@/components/EditMediaModal";

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
  youtube_video: "YouTube",
  youtube_playlist: "YouTube",
  table: "Tabel",
};

const TYPE_BADGE: Record<MediaType, string> = {
  image: "bg-emerald-600/90 text-white",
  video: "bg-purple-500/90 text-white",
  youtube_video: "bg-rose-500/90 text-white",
  youtube_playlist: "bg-rose-500/90 text-white",
  table: "bg-amber-500/90 text-white",
};

type FilterType = "semua" | MediaType;
type ViewMode = "grid" | "list";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function MediaPage() {
  const [items, setItems] = useState<Media[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [tab, setTab] = useState<"upload" | "youtube" | "cdn" | "table">("upload");
  const [uploading, setUploading] = useState(false);
  const [progressLabel, setProgressLabel] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<Media | null>(null);
  const [editingItem, setEditingItem] = useState<Media | null>(null);

  // toolbar state
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterType>("semua");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [page, setPage] = useState(1);

  const [ytUrl, setYtUrl] = useState("");
  const [ytName, setYtName] = useState("");
  const [ytDuration, setYtDuration] = useState(30);
  const [ytError, setYtError] = useState<string | null>(null);

  const [cdnUrl, setCdnUrl] = useState("");
  const [cdnName, setCdnName] = useState("");
  const [cdnType, setCdnType] = useState<"image" | "video">("image");
  const [cdnDuration, setCdnDuration] = useState(10);
  const [cdnError, setCdnError] = useState<string | null>(null);

  const [tableTitle, setTableTitle] = useState("Agenda Kegiatan");
  const [tableColumns, setTableColumns] = useState<string[]>(DEFAULT_AGENDA_COLUMNS);
  const [tableRows, setTableRows] = useState<string[][]>([]);
  const [pasteText, setPasteText] = useState("");
  const [tableDuration, setTableDuration] = useState(25);
  const [tableError, setTableError] = useState<string | null>(null);

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

  // derived: filtered items
  const filtered = items.filter((m) => {
    const matchFilter =
      filter === "semua" ||
      (filter === "youtube_video" && (m.type === "youtube_video" || m.type === "youtube_playlist")) ||
      m.type === filter;
    const matchSearch = m.name.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });
  const PAGE_SIZE = 24;
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((Math.min(page, totalPages) - 1) * PAGE_SIZE, Math.min(page, totalPages) * PAGE_SIZE);
  useEffect(() => { setPage(1); }, [search, filter]);
  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [page, totalPages]);

  // counts per type for pill badges
  const counts = {
    semua: items.length,
    image: items.filter((m) => m.type === "image").length,
    video: items.filter((m) => m.type === "video").length,
    youtube_video: items.filter((m) => m.type === "youtube_video" || m.type === "youtube_playlist").length,
    table: items.filter((m) => m.type === "table").length,
  };

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

  function handleCdnUrlBlur() {
    const guess = guessMediaTypeFromUrl(cdnUrl);
    if (guess) setCdnType(guess);
  }

  async function handleAddCdnLink(e: React.FormEvent) {
    e.preventDefault();
    setCdnError(null);

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(cdnUrl.trim());
      if (!parsedUrl.protocol.startsWith("http")) throw new Error("invalid");
    } catch {
      setCdnError("URL tidak valid. Tempel link langsung ke file foto/video (https://...).");
      return;
    }

    setUploading(true);
    const supabase = createClient();
    const fallbackName = decodeURIComponent(parsedUrl.pathname.split("/").pop() || "Konten CDN");
    await supabase.from("media").insert({
      name: cdnName.trim() || fallbackName,
      type: cdnType,
      url: parsedUrl.toString(),
      duration: cdnDuration,
    });
    setUploading(false);
    setCdnUrl("");
    setCdnName("");
    setCdnDuration(10);
    setCdnType("image");
    setShowAdd(false);
    load();
  }

  function addColumn() {
    setTableColumns((cols) => [...cols, `Kolom ${cols.length + 1}`]);
  }

  function updateColumn(index: number, value: string) {
    setTableColumns((cols) => cols.map((c, i) => (i === index ? value : c)));
  }

  function removeColumn(index: number) {
    setTableColumns((cols) => cols.filter((_, i) => i !== index));
    setTableRows((rows) => rows.map((row) => row.filter((_, i) => i !== index)));
  }

  function addEmptyRow() {
    setTableRows((rows) => [...rows, tableColumns.map(() => "")]);
  }

  function updateCell(rowIndex: number, colIndex: number, value: string) {
    setTableRows((rows) =>
      rows.map((row, ri) => (ri === rowIndex ? row.map((c, ci) => (ci === colIndex ? value : c)) : row))
    );
  }

  function removeRow(index: number) {
    setTableRows((rows) => rows.filter((_, i) => i !== index));
  }

  function handleParsePaste() {
    const parsed = parseDelimitedText(pasteText);
    if (parsed.length === 0) {
      setTableError("Tidak ada data terbaca. Pastikan tiap baris dipisah tab (dari Excel) atau koma.");
      return;
    }
    setTableError(null);
    const normalized = parsed.map((row) => {
      const r = [...row];
      while (r.length < tableColumns.length) r.push("");
      return r.slice(0, tableColumns.length);
    });
    setTableRows((prev) => [...prev, ...normalized]);
    setPasteText("");
  }

  async function handleAddTable(e: React.FormEvent) {
    e.preventDefault();
    setTableError(null);

    const cleanColumns = tableColumns.map((c) => sanitizeText(c.trim())).filter(Boolean);
    if (cleanColumns.length === 0) {
      setTableError("Tambahkan minimal satu kolom.");
      return;
    }
    if (tableRows.length === 0) {
      setTableError("Tambahkan minimal satu baris data — tempel data atau tambah baris manual.");
      return;
    }

    setUploading(true);
    const supabase = createClient();
    const safeTitle = sanitizeText(tableTitle.trim() || "Tabel").slice(0, 100);
    const safeRows = tableRows.map((row) => row.map((cell) => sanitizeText(cell)));
    await supabase.from("media").insert({
      name: safeTitle,
      type: "table",
      url: "",
      duration: tableDuration,
      content: { title: safeTitle, columns: cleanColumns, rows: safeRows },
    });
    setUploading(false);
    setTableTitle("Agenda Kegiatan");
    setTableColumns(DEFAULT_AGENDA_COLUMNS);
    setTableRows([]);
    setPasteText("");
    setTableDuration(25);
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
    if ((item.type === "image" || item.type === "video") && isMediaStorageUrl(item.url)) {
      const path = item.url.slice(mediaStorageBase().length);
      if (path) await supabase.storage.from("media").remove([decodeURIComponent(path)]);
    }
    await supabase.from("media").delete().eq("id", item.id);
    setConfirmDelete(null);
    load();
  }

  // pill filters config
  const PILLS: { key: FilterType; label: string; count: number }[] = [
    { key: "semua", label: "Semua", count: counts.semua },
    { key: "image", label: "Foto", count: counts.image },
    { key: "video", label: "Video", count: counts.video },
    { key: "youtube_video", label: "YouTube", count: counts.youtube_video },
    { key: "table", label: "Tabel", count: counts.table },
  ];

  // duration input inline (shared by grid and list)
  function DurationInput({ m }: { m: Media }) {
    return (
      <label className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
        <input
          type="number"
          min={1}
          defaultValue={m.duration}
          onBlur={(e) => {
            const val = parseInt(e.target.value, 10);
            if (val > 0 && val !== m.duration) updateDuration(m.id, val);
          }}
          className="w-16 rounded-xl border border-slate-200 bg-slate-50 px-1.5 py-1 text-center font-mono font-extrabold outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-800"
          aria-label={`Durasi ${m.name}`}
        />
        <span>dtk</span>
      </label>
    );
  }

  // thumbnail for grid and list view
  function Thumb({ m, className }: { m: Media; className?: string }) {
    if (m.type === "image") {
      // eslint-disable-next-line @next/next/no-img-element
      return <img src={m.url} alt={m.name} className={`object-cover ${className ?? ""}`} />;
    }
    if (m.type === "video") {
      return <video src={m.url} className={`object-cover ${className ?? ""}`} muted />;
    }
    if (m.type === "table") {
      return (
        <div className={`flex flex-col items-center justify-center gap-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 ${className ?? ""}`}>
          <span className="text-xl">▦</span>
          <span className="text-[9px]">{m.content?.columns.length ?? 0}k · {m.content?.rows.length ?? 0}b</span>
        </div>
      );
    }
    return (
      <div className={`flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-red-400 ${className ?? ""}`}>
        <span className="text-xl">▶</span>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-5 flex justify-end"><button onClick={() => setShowAdd(true)} className="bg-emerald-600 hover:bg-emerald-700 shrink-0 cursor-pointer rounded-xl px-4 py-2.5 text-sm font-bold text-white shadow hover:opacity-95">+ Tambah konten</button></div>

      {/* Toolbar: Search + Filter Pills + View Toggle */}
      <div className="mb-5 flex flex-wrap items-center gap-2">
        {/* Search */}
        <div className="relative min-w-0 flex-1">
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-500 dark:text-slate-400 text-sm">
            ⌕
          </span>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama konten..."
            className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 py-2.5 pl-8 pr-3 text-sm outline-none focus:border-emerald-500"
            aria-label="Cari konten"
          />
        </div>

        {/* Filter pills */}
        <div className="flex flex-wrap gap-1">
          {PILLS.map((pill) => (
            <button
              key={pill.key}
              onClick={() => setFilter(pill.key)}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                filter === pill.key
                  ? "bg-emerald-600 text-white"
                  : "border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 hover:border-emerald-500/40 hover:text-slate-900 dark:text-white"
              }`}
            >
              {pill.label}
              <span
                className={`rounded px-1 py-0.5 text-[10px] tabular-nums ${
                  filter === pill.key ? "bg-white/20" : "bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400"
                }`}
              >
                {pill.count}
              </span>
            </button>
          ))}
        </div>

        {/* View toggle */}
        <div className="flex rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 p-0.5">
          <button
            onClick={() => setViewMode("grid")}
            aria-label="Tampilan grid"
            title="Tampilan Grid"
            className={`rounded-lg px-2.5 py-1.5 text-sm transition-colors ${
              viewMode === "grid" ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white" : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white"
            }`}
          >
            ⊞
          </button>
          <button
            onClick={() => setViewMode("list")}
            aria-label="Tampilan list"
            title="Tampilan List"
            className={`rounded-lg px-2.5 py-1.5 text-sm transition-colors ${
              viewMode === "list" ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white" : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white"
            }`}
          >
            ☰
          </button>
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900" />
          ))}
        </div>
      )}

      {/* Empty state: no media in DB at all */}
      {!loading && items.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 p-12 text-center">
          <p className="text-sm font-medium text-slate-900 dark:text-white">Perpustakaan konten kosong</p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Unggah foto/video, tambahkan link YouTube, atau buat tabel agenda.
          </p>
          <button
            onClick={() => setShowAdd(true)}
            className="mt-4 rounded-md bg-emerald-600 text-white px-4 py-2 text-sm font-medium hover:opacity-90"
          >
            + Tambah konten pertama
          </button>
        </div>
      )}

      {/* Empty state: filter/search no results */}
      {!loading && items.length > 0 && filtered.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 p-10 text-center">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Tidak ada konten yang sesuai dengan filter atau kata kunci.
          </p>
          <button
            onClick={() => { setSearch(""); setFilter("semua"); }}
            className="mt-3 text-xs text-emerald-600 hover:underline"
          >
            Reset filter
          </button>
        </div>
      )}

      {/* Grid view */}
      {!loading && filtered.length > 0 && viewMode === "grid" && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {paginated.map((m) => (
            <div key={m.id} className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="relative flex h-44 items-center justify-center overflow-hidden bg-slate-100 dark:bg-slate-800">
                <Thumb m={m} className="h-full w-full" />
                <span className={`absolute left-2 top-2 rounded-md px-1.5 py-0.5 text-[10px] font-medium ${TYPE_BADGE[m.type]}`}>
                  {TYPE_LABEL[m.type]}
                </span>
              </div>
              <div className="p-3">
                <p className="truncate text-sm font-medium">{m.name}</p>
                <div className="mt-2.5 flex items-center justify-between gap-2">
                  <DurationInput m={m} />
                  <div className="flex items-center gap-2.5">
                    <button
                      onClick={() => setEditingItem(m)}
                      className="cursor-pointer rounded-xl border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setConfirmDelete(m)}
                      className="cursor-pointer rounded-xl border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-100 dark:border-rose-900/40 dark:bg-rose-950/30"
                    >
                      Hapus
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* List view */}
      {!loading && filtered.length > 0 && viewMode === "list" && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800">
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Konten
                </th>
                <th className="hidden px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400 sm:table-cell">
                  Tipe
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Durasi
                </th>
                <th className="hidden px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400 md:table-cell">
                  Ditambahkan
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((m, idx) => (
                <tr
                  key={m.id}
                  className={`border-b border-slate-200 dark:border-slate-800 last:border-0 hover:bg-slate-100 dark:bg-slate-800 transition-colors ${
                    idx % 2 === 1 ? "bg-slate-100 dark:bg-slate-800/30" : ""
                  }`}
                >
                  {/* Nama + thumbnail */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-11 w-11 shrink-0 overflow-hidden rounded-md">
                        <Thumb m={m} className="h-full w-full" />
                      </div>
                      <span className="truncate font-medium">{m.name}</span>
                    </div>
                  </td>
                  {/* Tipe badge */}
                  <td className="hidden px-4 py-3 sm:table-cell">
                    <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${TYPE_BADGE[m.type]}`}>
                      {TYPE_LABEL[m.type]}
                    </span>
                  </td>
                  {/* Durasi inline */}
                  <td className="px-4 py-3">
                    <DurationInput m={m} />
                  </td>
                  {/* Tanggal */}
                  <td className="hidden px-4 py-3 text-xs text-slate-500 dark:text-slate-400 md:table-cell">
                    {m.created_at ? formatDate(m.created_at) : "-"}
                  </td>
                  {/* Aksi */}
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <button
                        onClick={() => setEditingItem(m)}
                        className="cursor-pointer rounded-xl border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => setConfirmDelete(m)}
                        className="cursor-pointer rounded-xl border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-100 dark:border-rose-900/40 dark:bg-rose-950/30"
                      >
                        Hapus
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal: tambah konten */}
      {showAdd && (
        <Modal
          title="Tambah konten"
          onClose={() => setShowAdd(false)}
          width={tab === "table" ? "max-w-2xl" : "max-w-md"}
        >
          <div className="mb-4 flex flex-wrap gap-1 rounded-lg bg-slate-100 dark:bg-slate-800 p-1">
            <button
              onClick={() => setTab("upload")}
              className={`flex-1 rounded-md py-1.5 text-sm ${
                tab === "upload" ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white" : "text-slate-500 dark:text-slate-400"
              }`}
            >
              Unggah file
            </button>
            <button
              onClick={() => setTab("youtube")}
              className={`flex-1 rounded-md py-1.5 text-sm ${
                tab === "youtube" ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white" : "text-slate-500 dark:text-slate-400"
              }`}
            >
              YouTube
            </button>
            <button
              onClick={() => setTab("cdn")}
              className={`flex-1 rounded-md py-1.5 text-sm ${
                tab === "cdn" ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white" : "text-slate-500 dark:text-slate-400"
              }`}
            >
              Link CDN
            </button>
            <button
              onClick={() => setTab("table")}
              className={`flex-1 rounded-md py-1.5 text-sm ${
                tab === "table" ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white" : "text-slate-500 dark:text-slate-400"
              }`}
            >
              Tabel
            </button>
          </div>

          {tab === "upload" ? (
            <div>
              <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-slate-200 dark:border-slate-800 py-10 text-sm text-slate-500 dark:text-slate-400 hover:border-emerald-500/50">
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
                <p className="mt-3 text-center text-xs text-slate-500 dark:text-slate-400">{progressLabel}</p>
              )}
            </div>
          ) : tab === "youtube" ? (
            <form onSubmit={handleAddYoutube} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm text-slate-500 dark:text-slate-400">
                  Link video atau playlist YouTube
                </label>
                <input
                  value={ytUrl}
                  onChange={(e) => setYtUrl(e.target.value)}
                  placeholder="https://youtube.com/watch?v=... atau /playlist?list=..."
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 px-3.5 py-2.5 text-sm outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm text-slate-500 dark:text-slate-400">Nama (opsional)</label>
                <input
                  value={ytName}
                  onChange={(e) => setYtName(e.target.value)}
                  placeholder="Contoh: Playlist musik kantor"
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 px-3.5 py-2.5 text-sm outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm text-slate-500 dark:text-slate-400">
                  Durasi ditampilkan sebelum lanjut ke konten berikutnya (detik)
                </label>
                <input
                  type="number"
                  min={5}
                  value={ytDuration}
                  onChange={(e) => setYtDuration(parseInt(e.target.value, 10) || 30)}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 px-3.5 py-2.5 text-sm outline-none focus:border-emerald-500"
                />
              </div>
              {ytError && <p className="text-sm text-rose-600 dark:text-rose-400">{ytError}</p>}
              <button
                type="submit"
                disabled={uploading}
                className="w-full rounded-md bg-emerald-600 text-white px-4 py-2.5 text-sm font-medium hover:opacity-90 disabled:opacity-50"
              >
                {uploading ? "Menyimpan..." : "Tambahkan"}
              </button>
            </form>
          ) : tab === "cdn" ? (
            <form onSubmit={handleAddCdnLink} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm text-slate-500 dark:text-slate-400">
                  Link langsung ke file (Cloudinary, Bunny, S3, dll.)
                </label>
                <input
                  value={cdnUrl}
                  onChange={(e) => setCdnUrl(e.target.value)}
                  onBlur={handleCdnUrlBlur}
                  placeholder="https://res.cloudinary.com/.../video/upload/promo.mp4"
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 px-3.5 py-2.5 text-sm outline-none focus:border-emerald-500"
                />
                <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                  Tempel URL yang langsung mengarah ke file foto/video (bukan halaman
                  embed/player). Di Cloudinary, gunakan tombol &ldquo;Copy URL&rdquo; pada
                  asset-nya.
                </p>
              </div>
              <div>
                <label className="mb-1.5 block text-sm text-slate-500 dark:text-slate-400">Jenis konten</label>
                <div className="flex gap-1 rounded-lg bg-slate-100 dark:bg-slate-800 p-1">
                  <button
                    type="button"
                    onClick={() => setCdnType("image")}
                    className={`flex-1 rounded-md py-1.5 text-sm ${
                      cdnType === "image" ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white" : "text-slate-500 dark:text-slate-400"
                    }`}
                  >
                    Foto
                  </button>
                  <button
                    type="button"
                    onClick={() => setCdnType("video")}
                    className={`flex-1 rounded-md py-1.5 text-sm ${
                      cdnType === "video" ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white" : "text-slate-500 dark:text-slate-400"
                    }`}
                  >
                    Video
                  </button>
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm text-slate-500 dark:text-slate-400">Nama (opsional)</label>
                <input
                  value={cdnName}
                  onChange={(e) => setCdnName(e.target.value)}
                  placeholder="Contoh: Banner Promo September"
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 px-3.5 py-2.5 text-sm outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm text-slate-500 dark:text-slate-400">
                  Durasi ditampilkan (detik)
                  {cdnType === "video" && " — video akan lanjut otomatis setelah selesai diputar"}
                </label>
                <input
                  type="number"
                  min={1}
                  value={cdnDuration}
                  onChange={(e) => setCdnDuration(parseInt(e.target.value, 10) || 10)}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 px-3.5 py-2.5 text-sm outline-none focus:border-emerald-500"
                />
              </div>
              {cdnError && <p className="text-sm text-rose-600 dark:text-rose-400">{cdnError}</p>}
              <button
                type="submit"
                disabled={uploading}
                className="w-full rounded-md bg-emerald-600 text-white px-4 py-2.5 text-sm font-medium hover:opacity-90 disabled:opacity-50"
              >
                {uploading ? "Menyimpan..." : "Tambahkan"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleAddTable} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm text-slate-500 dark:text-slate-400">Judul tabel</label>
                <input
                  value={tableTitle}
                  onChange={(e) => setTableTitle(e.target.value)}
                  placeholder="Contoh: Agenda Kegiatan"
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 px-3.5 py-2.5 text-sm outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm text-slate-500 dark:text-slate-400">Kolom</label>
                <div className="flex flex-wrap gap-2">
                  {tableColumns.map((col, i) => (
                    <div key={i} className="flex items-center gap-1">
                      <input
                        value={col}
                        onChange={(e) => updateColumn(i, e.target.value)}
                        className="w-36 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 px-2.5 py-1.5 text-sm outline-none focus:border-emerald-500"
                      />
                      <button
                        type="button"
                        onClick={() => removeColumn(i)}
                        className="text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:text-rose-400"
                        title="Hapus kolom"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addColumn}
                    className="rounded-md border border-dashed border-slate-200 dark:border-slate-800 px-3 py-1.5 text-sm text-slate-500 dark:text-slate-400 hover:border-emerald-500/50"
                  >
                    + Kolom
                  </button>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm text-slate-500 dark:text-slate-400">
                  Tempel data (pisahkan kolom dengan tab dari Excel, atau koma — satu baris per data)
                </label>
                <textarea
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  rows={4}
                  placeholder={
                    "1\tRapat Koordinasi\tSenin, 10:00 - Ruang A\tWajib hadir\n" +
                    "2\tPelatihan Staf\tSelasa, 13:00 - Aula\t-"
                  }
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 px-3.5 py-2.5 font-mono text-xs outline-none focus:border-emerald-500"
                />
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleParsePaste}
                    className="rounded-xl border border-slate-200 dark:border-slate-800 px-3 py-1.5 text-xs hover:border-emerald-500/50"
                  >
                    Proses tempelan &rarr; tambahkan ke tabel
                  </button>
                  <button
                    type="button"
                    onClick={addEmptyRow}
                    className="rounded-md border border-dashed border-slate-200 dark:border-slate-800 px-3 py-1.5 text-xs text-slate-500 dark:text-slate-400 hover:border-emerald-500/50"
                  >
                    + Baris kosong
                  </button>
                </div>
              </div>

              {tableRows.length > 0 && (
                <div className="max-h-64 overflow-auto rounded-lg border border-slate-200 dark:border-slate-800">
                  <table className="w-full border-collapse text-xs">
                    <thead>
                      <tr>
                        {tableColumns.map((col, i) => (
                          <th
                            key={i}
                            className="sticky top-0 border-b border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 px-2 py-1.5 text-left text-slate-500 dark:text-slate-400"
                          >
                            {col}
                          </th>
                        ))}
                        <th className="sticky top-0 border-b border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 px-2 py-1.5" />
                      </tr>
                    </thead>
                    <tbody>
                      {tableRows.map((row, ri) => (
                        <tr key={ri}>
                          {tableColumns.map((_, ci) => (
                            <td key={ci} className="border-b border-slate-200 dark:border-slate-800 px-1 py-1">
                              <input
                                value={row[ci] ?? ""}
                                onChange={(e) => updateCell(ri, ci, e.target.value)}
                                className="w-full rounded bg-transparent px-1.5 py-1 outline-none focus:bg-white dark:bg-slate-900"
                              />
                            </td>
                          ))}
                          <td className="border-b border-slate-200 dark:border-slate-800 px-1 py-1 text-center">
                            <button
                              type="button"
                              onClick={() => removeRow(ri)}
                              className="text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:text-rose-400"
                            >
                              ✕
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div>
                <label className="mb-1.5 block text-sm text-slate-500 dark:text-slate-400">
                  Durasi ditampilkan (detik)
                </label>
                <input
                  type="number"
                  min={5}
                  value={tableDuration}
                  onChange={(e) => setTableDuration(parseInt(e.target.value, 10) || 25)}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 px-3.5 py-2.5 text-sm outline-none focus:border-emerald-500"
                />
              </div>

              {tableError && <p className="text-sm text-rose-600 dark:text-rose-400">{tableError}</p>}
              <button
                type="submit"
                disabled={uploading}
                className="w-full rounded-md bg-emerald-600 text-white px-4 py-2.5 text-sm font-medium hover:opacity-90 disabled:opacity-50"
              >
                {uploading ? "Menyimpan..." : "Simpan tabel"}
              </button>
            </form>
          )}
        </Modal>
      )}

      {editingItem && (
        <EditMediaModal
          item={editingItem}
          onClose={() => setEditingItem(null)}
          onSaved={() => {
            setEditingItem(null);
            load();
          }}
        />
      )}

      {confirmDelete && (
        <Modal title="Hapus konten?" onClose={() => setConfirmDelete(null)}>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            <span className="text-slate-900 dark:text-white">{confirmDelete.name}</span> akan dihapus dari semua
            playlist yang memakainya.
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
