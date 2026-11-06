"use client";

import type { MediaFormApi } from "./useMediaForm";

const FIELD_CLASS =
  "w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 px-3.5 py-2.5 text-sm outline-none focus:border-emerald-500";
const LABEL_CLASS = "mb-1.5 block text-sm text-slate-500 dark:text-slate-400";

/** Tab tabel agenda: susun kolom, tempel dari Excel, edit sel. */
export default function TableTab({ form }: { form: MediaFormApi }) {
  return (
    <form onSubmit={form.handleAddTable} className="space-y-4">
      <div>
        <label className={LABEL_CLASS}>Judul tabel</label>
        <input
          value={form.tableTitle}
          onChange={(e) => form.setTableTitle(e.target.value)}
          placeholder="Contoh: Agenda Kegiatan"
          className={FIELD_CLASS}
        />
      </div>

      <div>
        <label className={LABEL_CLASS}>Kolom</label>
        <div className="flex flex-wrap gap-2">
          {form.tableColumns.map((col, i) => (
            <div key={i} className="flex items-center gap-1">
              <input
                value={col}
                onChange={(e) => form.updateColumn(i, e.target.value)}
                className="w-36 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 px-2.5 py-1.5 text-sm outline-none focus:border-emerald-500"
              />
              <button
                type="button"
                onClick={() => form.removeColumn(i)}
                className="text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:text-rose-400"
                title="Hapus kolom"
              >
                ✕
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={form.addColumn}
            className="rounded-md border border-dashed border-slate-200 dark:border-slate-800 px-3 py-1.5 text-sm text-slate-500 dark:text-slate-400 hover:border-emerald-500/50"
          >
            + Kolom
          </button>
        </div>
      </div>

      <div>
        <label className={LABEL_CLASS}>
          Tempel data (pisahkan kolom dengan tab dari Excel, atau koma — satu baris per data)
        </label>
        <textarea
          value={form.pasteText}
          onChange={(e) => form.setPasteText(e.target.value)}
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
            onClick={form.handleParsePaste}
            className="rounded-xl border border-slate-200 dark:border-slate-800 px-3 py-1.5 text-xs hover:border-emerald-500/50"
          >
            Proses tempelan &rarr; tambahkan ke tabel
          </button>
          <button
            type="button"
            onClick={form.addEmptyRow}
            className="rounded-md border border-dashed border-slate-200 dark:border-slate-800 px-3 py-1.5 text-xs text-slate-500 dark:text-slate-400 hover:border-emerald-500/50"
          >
            + Baris kosong
          </button>
        </div>
      </div>

      <TableRowsEditor form={form} />

      <div>
        <label className={LABEL_CLASS}>Durasi ditampilkan (detik)</label>
        <input
          type="number"
          min={5}
          value={form.tableDuration}
          onChange={(e) => form.setTableDuration(parseInt(e.target.value, 10) || 25)}
          className={FIELD_CLASS}
        />
      </div>

      {form.tableError && <p className="text-sm text-rose-600 dark:text-rose-400">{form.tableError}</p>}
      <button
        type="submit"
        disabled={form.uploading}
        className="w-full rounded-md bg-emerald-600 text-white px-4 py-2.5 text-sm font-medium hover:opacity-90 disabled:opacity-50"
      >
        {form.uploading ? "Menyimpan..." : "Simpan tabel"}
      </button>
    </form>
  );
}
/** Editor sel tabel (hanya muncul kalau sudah ada baris). */
function TableRowsEditor({ form }: { form: MediaFormApi }) {
  if (form.tableRows.length === 0) return null;

  return (
    <div className="max-h-64 overflow-auto rounded-lg border border-slate-200 dark:border-slate-800">
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr>
            {form.tableColumns.map((col, i) => (
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
          {form.tableRows.map((row, ri) => (
            <tr key={ri}>
              {form.tableColumns.map((_, ci) => (
                <td key={ci} className="border-b border-slate-200 dark:border-slate-800 px-1 py-1">
                  <input
                    value={row[ci] ?? ""}
                    onChange={(e) => form.updateCell(ri, ci, e.target.value)}
                    className="w-full rounded bg-transparent px-1.5 py-1 outline-none focus:bg-white dark:bg-slate-900"
                  />
                </td>
              ))}
              <td className="border-b border-slate-200 dark:border-slate-800 px-1 py-1 text-center">
                <button
                  type="button"
                  onClick={() => form.removeRow(ri)}
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
  );
}