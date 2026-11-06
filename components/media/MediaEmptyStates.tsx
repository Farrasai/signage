"use client";

/** Dua keadaan kosong perpustakaan konten: belum ada data, atau filter tanpa hasil. */
export default function MediaEmptyStates({
  loading,
  itemsCount,
  filteredCount,
  onAdd,
  onReset,
}: {
  loading: boolean;
  itemsCount: number;
  filteredCount: number;
  onAdd: () => void;
  onReset: () => void;
}) {
  if (loading) return null;

  if (itemsCount === 0) {
    return (
      <div
        data-testid="media-empty"
        className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 p-12 text-center"
      >
        <p className="text-sm font-medium text-slate-900 dark:text-white">Perpustakaan konten kosong</p>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Unggah foto/video, tambahkan link YouTube, atau buat tabel agenda.
        </p>
        <button
          onClick={onAdd}
          className="mt-4 rounded-md bg-emerald-600 text-white px-4 py-2 text-sm font-medium hover:opacity-90"
        >
          + Tambah konten pertama
        </button>
      </div>
    );
  }

  if (filteredCount === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 p-10 text-center">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Tidak ada konten yang sesuai dengan filter atau kata kunci.
        </p>
        <button onClick={onReset} className="mt-3 text-xs text-emerald-600 hover:underline">
          Reset filter
        </button>
      </div>
    );
  }

  return null;
}