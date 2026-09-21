"use client";

import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Media } from "@/lib/types";
import {
  guessMediaTypeFromUrl,
  isMediaStorageUrl,
  mediaStorageBase,
  parseDelimitedText,
  parseYouTubeUrl,
} from "@/lib/utils";
import Modal from "./Modal";

export default function EditMediaModal({
  item,
  onClose,
  onSaved,
}: {
  item: Media;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isTable = item.type === "table";
  const isYoutube = item.type === "youtube_video" || item.type === "youtube_playlist";
  const isStorageFile = (item.type === "image" || item.type === "video") && isMediaStorageUrl(item.url);
  const isExternalLink = (item.type === "image" || item.type === "video") && !isStorageFile;

  const [name, setName] = useState(item.name);
  const [duration, setDuration] = useState(item.duration);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Foto/video yang diunggah — bisa ganti file
  const [replaceFile, setReplaceFile] = useState<File | null>(null);

  // Link CDN eksternal
  const [url, setUrl] = useState(item.url);
  const [linkType, setLinkType] = useState<"image" | "video">(item.type === "video" ? "video" : "image");

  // YouTube — rekonstruksi URL yang bisa dibaca ulang dari ID yang tersimpan
  const initialYtUrl = isYoutube
    ? item.type === "youtube_playlist"
      ? `https://www.youtube.com/playlist?list=${item.url}`
      : `https://www.youtube.com/watch?v=${item.url}`
    : "";
  const [ytUrl, setYtUrl] = useState(initialYtUrl);

  // Tabel
  const [tableTitle, setTableTitle] = useState(item.content?.title ?? item.name);
  const [tableColumns, setTableColumns] = useState<string[]>(item.content?.columns ?? []);
  const [tableRows, setTableRows] = useState<string[][]>(item.content?.rows ?? []);
  const [pasteText, setPasteText] = useState("");

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
      setError("Tidak ada data terbaca. Pastikan tiap baris dipisah tab (dari Excel) atau koma.");
      return;
    }
    setError(null);
    const normalized = parsed.map((row) => {
      const r = [...row];
      while (r.length < tableColumns.length) r.push("");
      return r.slice(0, tableColumns.length);
    });
    setTableRows((prev) => [...prev, ...normalized]);
    setPasteText("");
  }

  function handleUrlBlur() {
    const guess = guessMediaTypeFromUrl(url);
    if (guess) setLinkType(guess);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const supabase = createClient();
    setSaving(true);

    if (isTable) {
      const cleanColumns = tableColumns.map((c) => c.trim()).filter(Boolean);
      if (cleanColumns.length === 0) {
        setError("Tambahkan minimal satu kolom.");
        setSaving(false);
        return;
      }
      if (tableRows.length === 0) {
        setError("Tambahkan minimal satu baris data.");
        setSaving(false);
        return;
      }
      const title = tableTitle.trim() || "Tabel";
      await supabase
        .from("media")
        .update({ name: title, duration, content: { title, columns: cleanColumns, rows: tableRows } })
        .eq("id", item.id);
    } else if (isYoutube) {
      const parsed = parseYouTubeUrl(ytUrl);
      if (!parsed) {
        setError("URL YouTube tidak valid.");
        setSaving(false);
        return;
      }
      await supabase
        .from("media")
        .update({ name: name.trim() || item.name, type: parsed.type, url: parsed.id, duration })
        .eq("id", item.id);
    } else if (isStorageFile) {
      let finalUrl = item.url;
      if (replaceFile) {
        const path = `${crypto.randomUUID()}-${replaceFile.name.replace(/[^a-zA-Z0-9.\-_]/g, "_")}`;
        const { error: uploadError } = await supabase.storage.from("media").upload(path, replaceFile, {
          cacheControl: "31536000",
          upsert: false,
        });
        if (uploadError) {
          setError(`Gagal mengunggah file baru: ${uploadError.message}`);
          setSaving(false);
          return;
        }
        const { data: pub } = supabase.storage.from("media").getPublicUrl(path);
        finalUrl = pub.publicUrl;
        const oldPath = item.url.slice(mediaStorageBase().length);
        if (oldPath) await supabase.storage.from("media").remove([decodeURIComponent(oldPath)]);
      }
      await supabase
        .from("media")
        .update({ name: name.trim() || item.name, url: finalUrl, duration })
        .eq("id", item.id);
    } else {
      let parsedUrl: URL;
      try {
        parsedUrl = new URL(url.trim());
        if (!parsedUrl.protocol.startsWith("http")) throw new Error("invalid");
      } catch {
        setError("URL tidak valid.");
        setSaving(false);
        return;
      }
      await supabase
        .from("media")
        .update({ name: name.trim() || item.name, type: linkType, url: parsedUrl.toString(), duration })
        .eq("id", item.id);
    }

    setSaving(false);
    onSaved();
  }

  return (
    <Modal title="Edit konten" onClose={onClose} width={isTable ? "max-w-2xl" : "max-w-md"}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {isTable ? (
          <>
            <div>
              <label className="mb-1.5 block text-sm text-text-muted">Judul tabel</label>
              <input
                value={tableTitle}
                onChange={(e) => setTableTitle(e.target.value)}
                className="w-full rounded-lg border border-border bg-surface-2 px-3.5 py-2.5 text-sm outline-none focus:border-signal"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm text-text-muted">Kolom</label>
              <div className="flex flex-wrap gap-2">
                {tableColumns.map((col, i) => (
                  <div key={i} className="flex items-center gap-1">
                    <input
                      value={col}
                      onChange={(e) => updateColumn(i, e.target.value)}
                      className="w-36 rounded-lg border border-border bg-surface-2 px-2.5 py-1.5 text-sm outline-none focus:border-signal"
                    />
                    <button
                      type="button"
                      onClick={() => removeColumn(i)}
                      className="text-text-muted hover:text-danger"
                      title="Hapus kolom"
                    >
                      ✕
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addColumn}
                  className="rounded-lg border border-dashed border-border px-3 py-1.5 text-sm text-text-muted hover:border-signal/50"
                >
                  + Kolom
                </button>
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm text-text-muted">
                Tempel data tambahan (opsional, ditambahkan ke baris yang sudah ada)
              </label>
              <textarea
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                rows={3}
                placeholder="Tempel data dipisah tab (Excel) atau koma"
                className="w-full rounded-lg border border-border bg-surface-2 px-3.5 py-2.5 font-mono text-xs outline-none focus:border-signal"
              />
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleParsePaste}
                  className="rounded-lg border border-border px-3 py-1.5 text-xs hover:border-signal/50"
                >
                  Proses tempelan → tambahkan ke tabel
                </button>
                <button
                  type="button"
                  onClick={addEmptyRow}
                  className="rounded-lg border border-dashed border-border px-3 py-1.5 text-xs text-text-muted hover:border-signal/50"
                >
                  + Baris kosong
                </button>
              </div>
            </div>

            {tableRows.length > 0 && (
              <div className="max-h-64 overflow-auto rounded-lg border border-border">
                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr>
                      {tableColumns.map((col, i) => (
                        <th
                          key={i}
                          className="sticky top-0 border-b border-border bg-surface-2 px-2 py-1.5 text-left text-text-muted"
                        >
                          {col}
                        </th>
                      ))}
                      <th className="sticky top-0 border-b border-border bg-surface-2 px-2 py-1.5" />
                    </tr>
                  </thead>
                  <tbody>
                    {tableRows.map((row, ri) => (
                      <tr key={ri}>
                        {tableColumns.map((_, ci) => (
                          <td key={ci} className="border-b border-border px-1 py-1">
                            <input
                              value={row[ci] ?? ""}
                              onChange={(e) => updateCell(ri, ci, e.target.value)}
                              className="w-full rounded bg-transparent px-1.5 py-1 outline-none focus:bg-surface"
                            />
                          </td>
                        ))}
                        <td className="border-b border-border px-1 py-1 text-center">
                          <button
                            type="button"
                            onClick={() => removeRow(ri)}
                            className="text-text-muted hover:text-danger"
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
          </>
        ) : isYoutube ? (
          <>
            <div>
              <label className="mb-1.5 block text-sm text-text-muted">
                Link video atau playlist YouTube
              </label>
              <input
                value={ytUrl}
                onChange={(e) => setYtUrl(e.target.value)}
                className="w-full rounded-lg border border-border bg-surface-2 px-3.5 py-2.5 text-sm outline-none focus:border-signal"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm text-text-muted">Nama</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-border bg-surface-2 px-3.5 py-2.5 text-sm outline-none focus:border-signal"
              />
            </div>
          </>
        ) : (
          <>
            <div>
              <label className="mb-1.5 block text-sm text-text-muted">Nama</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-border bg-surface-2 px-3.5 py-2.5 text-sm outline-none focus:border-signal"
              />
            </div>

            {isExternalLink && (
              <>
                <div>
                  <label className="mb-1.5 block text-sm text-text-muted">Link CDN</label>
                  <input
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    onBlur={handleUrlBlur}
                    className="w-full rounded-lg border border-border bg-surface-2 px-3.5 py-2.5 text-sm outline-none focus:border-signal"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm text-text-muted">Jenis konten</label>
                  <div className="flex gap-1 rounded-lg bg-surface-2 p-1">
                    <button
                      type="button"
                      onClick={() => setLinkType("image")}
                      className={`flex-1 rounded-md py-1.5 text-sm ${
                        linkType === "image" ? "bg-surface text-text" : "text-text-muted"
                      }`}
                    >
                      Foto
                    </button>
                    <button
                      type="button"
                      onClick={() => setLinkType("video")}
                      className={`flex-1 rounded-md py-1.5 text-sm ${
                        linkType === "video" ? "bg-surface text-text" : "text-text-muted"
                      }`}
                    >
                      Video
                    </button>
                  </div>
                </div>
              </>
            )}

            {isStorageFile && (
              <div>
                <label className="mb-1.5 block text-sm text-text-muted">Ganti file (opsional)</label>
                <input
                  type="file"
                  accept="image/*,video/*"
                  onChange={(e) => setReplaceFile(e.target.files?.[0] ?? null)}
                  className="w-full text-xs text-text-muted file:mr-3 file:rounded-md file:border file:border-border file:bg-surface-2 file:px-3 file:py-1.5 file:text-text"
                />
                <p className="mt-1.5 text-xs text-text-muted">
                  Kosongkan kalau tidak ingin mengganti file yang sudah diunggah.
                </p>
              </div>
            )}
          </>
        )}

        <div>
          <label className="mb-1.5 block text-sm text-text-muted">Durasi ditampilkan (detik)</label>
          <input
            type="number"
            min={1}
            value={duration}
            onChange={(e) => setDuration(parseInt(e.target.value, 10) || 1)}
            className="w-full rounded-lg border border-border bg-surface-2 px-3.5 py-2.5 text-sm outline-none focus:border-signal"
          />
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-border px-4 py-2.5 text-sm text-text-muted hover:text-text"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 rounded-lg bg-signal px-4 py-2.5 text-sm font-medium text-[#160a05] hover:opacity-90 disabled:opacity-50"
          >
            {saving ? "Menyimpan..." : "Simpan perubahan"}
          </button>
        </div>
      </form>
    </Modal>
  );
}