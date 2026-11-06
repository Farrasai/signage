"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { MediaType } from "@/lib/types";
import {
  DEFAULT_AGENDA_COLUMNS,
  guessMediaTypeFromUrl,
  parseDelimitedText,
  parseYouTubeUrl,
} from "@/lib/utils";
import { sanitizeText } from "@/lib/sanitize";
import { useToast } from "@/lib/toast";
import { readVideoDuration } from "./constants";

export type AddTab = "upload" | "youtube" | "cdn" | "table";

/** API form yang dipakai komponen tab presentasional. */
export type MediaFormApi = ReturnType<typeof useMediaForm>;

/**
 * Semua state + handler form "Tambah konten".
 * Dipisah dari modal agar komponen presentasional (UploadTab, YoutubeTab, dst.)
 * tetap tipis.
 */
export function useMediaForm({ onSaved }: { onSaved: () => void }) {
  const toast = useToast();
  const [tab, setTab] = useState<AddTab>("upload");
  const [uploading, setUploading] = useState(false);
  const [progressLabel, setProgressLabel] = useState("");

  // YouTube
  const [ytUrl, setYtUrl] = useState("");
  const [ytName, setYtName] = useState("");
  const [ytDuration, setYtDuration] = useState(30);
  const [ytError, setYtError] = useState<string | null>(null);

  // CDN
  const [cdnUrl, setCdnUrl] = useState("");
  const [cdnName, setCdnName] = useState("");
  const [cdnType, setCdnType] = useState<"image" | "video">("image");
  const [cdnDuration, setCdnDuration] = useState(10);
  const [cdnError, setCdnError] = useState<string | null>(null);

  // Tabel
  const [tableTitle, setTableTitle] = useState("Agenda Kegiatan");
  const [tableColumns, setTableColumns] = useState<string[]>(DEFAULT_AGENDA_COLUMNS);
  const [tableRows, setTableRows] = useState<string[][]>([]);
  const [pasteText, setPasteText] = useState("");
  const [tableDuration, setTableDuration] = useState(25);
  const [tableError, setTableError] = useState<string | null>(null);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    const supabase = createClient();
    let succeeded = 0;
    let failedCount = 0;

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
        toast.error(`Gagal mengunggah ${file.name}: ${uploadError.message}`);
        failedCount++;
        continue;
      }

      const { data: pub } = supabase.storage.from("media").getPublicUrl(path);
      const duration = isVideo ? await readVideoDuration(file) : 10;

      const { error: insertError } = await supabase.from("media").insert({
        name: file.name.replace(/\.[^.]+$/, ""),
        type,
        url: pub.publicUrl,
        duration,
      });
      if (insertError) {
        toast.error(`Gagal menyimpan ${file.name}: ${insertError.message}`);
        failedCount++;
        continue;
      }
      succeeded++;
    }

    setUploading(false);
    setProgressLabel("");
    if (succeeded > 0) {
      toast.success(`${succeeded} konten berhasil diunggah${failedCount ? ` (${failedCount} gagal)` : ""}.`);
    }
    onSaved();
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
    const mediaName = ytName.trim() || (parsed.type === "youtube_playlist" ? "Playlist YouTube" : "Video YouTube");
    const { error } = await supabase.from("media").insert({
      name: mediaName,
      type: parsed.type,
      url: parsed.id,
      duration: ytDuration,
    });
    setUploading(false);
    if (error) {
      toast.error(`Gagal menambah konten YouTube: ${error.message}`);
      return;
    }
    toast.success(`"${mediaName}" berhasil ditambahkan.`);
    setYtUrl("");
    setYtName("");
    setYtDuration(30);
    onSaved();
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
    const mediaName = cdnName.trim() || fallbackName;
    const { error } = await supabase.from("media").insert({
      name: mediaName,
      type: cdnType,
      url: parsedUrl.toString(),
      duration: cdnDuration,
    });
    setUploading(false);
    if (error) {
      toast.error(`Gagal menambah konten dari link: ${error.message}`);
      return;
    }
    toast.success(`"${mediaName}" berhasil ditambahkan.`);
    setCdnUrl("");
    setCdnName("");
    setCdnDuration(10);
    setCdnType("image");
    onSaved();
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
    const { error } = await supabase.from("media").insert({
      name: safeTitle,
      type: "table",
      url: "",
      duration: tableDuration,
      content: { title: safeTitle, columns: cleanColumns, rows: safeRows },
    });
    setUploading(false);
    if (error) {
      toast.error(`Gagal menyimpan tabel: ${error.message}`);
      return;
    }
    toast.success(`Tabel "${safeTitle}" berhasil ditambahkan.`);
    setTableTitle("Agenda Kegiatan");
    setTableColumns(DEFAULT_AGENDA_COLUMNS);
    setTableRows([]);
    setPasteText("");
    setTableDuration(25);
    onSaved();
  }
return {
    tab,
    setTab,
    uploading,
    progressLabel,
    handleFileUpload,
    ytUrl,
    setYtUrl,
    ytName,
    setYtName,
    ytDuration,
    setYtDuration,
    ytError,
    handleAddYoutube,
    cdnUrl,
    setCdnUrl,
    cdnName,
    setCdnName,
    cdnType,
    setCdnType,
    cdnDuration,
    setCdnDuration,
    cdnError,
    handleCdnUrlBlur,
    handleAddCdnLink,
    tableTitle,
    setTableTitle,
    tableColumns,
    updateColumn,
    removeColumn,
    addColumn,
    tableRows,
    updateCell,
    removeRow,
    addEmptyRow,
    pasteText,
    setPasteText,
    handleParsePaste,
    tableDuration,
    setTableDuration,
    tableError,
    handleAddTable,
  };
}