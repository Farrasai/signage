"use client";

import type { MediaFormApi } from "./useMediaForm";

const FIELD_CLASS =
  "w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 px-3.5 py-2.5 text-sm outline-none focus:border-emerald-500";
const LABEL_CLASS = "mb-1.5 block text-sm text-slate-500 dark:text-slate-400";

/** Tab YouTube: tempel link video/playlist, durasi diatur manual. */
export default function YoutubeTab({ form }: { form: MediaFormApi }) {
  return (
    <form onSubmit={form.handleAddYoutube} className="space-y-4">
      <div>
        <label className={LABEL_CLASS}>Link video atau playlist YouTube</label>
        <input
          data-testid="youtube-url-input"
          value={form.ytUrl}
          onChange={(e) => form.setYtUrl(e.target.value)}
          placeholder="https://youtube.com/watch?v=... atau /playlist?list=..."
          className={FIELD_CLASS}
        />
      </div>
      <div>
        <label className={LABEL_CLASS}>Nama (opsional)</label>
        <input
          data-testid="youtube-name-input"
          value={form.ytName}
          onChange={(e) => form.setYtName(e.target.value)}
          placeholder="Contoh: Playlist musik kantor"
          className={FIELD_CLASS}
        />
      </div>
      <div>
        <label className={LABEL_CLASS}>
          Durasi ditampilkan sebelum lanjut ke konten berikutnya (detik)
        </label>
        <input
          data-testid="youtube-duration-input"
          type="number"
          min={5}
          value={form.ytDuration}
          onChange={(e) => form.setYtDuration(parseInt(e.target.value, 10) || 30)}
          className={FIELD_CLASS}
        />
      </div>
      {form.ytError && (
        <p data-testid="youtube-error" className="text-sm text-rose-600 dark:text-rose-400">
          {form.ytError}
        </p>
      )}
      <button
        data-testid="youtube-submit"
        type="submit"
        disabled={form.uploading}
        className="w-full rounded-md bg-emerald-600 text-white px-4 py-2.5 text-sm font-medium hover:opacity-90 disabled:opacity-50"
      >
        {form.uploading ? "Menyimpan..." : "Tambahkan"}
      </button>
    </form>
  );
}