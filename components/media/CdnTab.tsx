"use client";

import type { MediaFormApi } from "./useMediaForm";

const FIELD_CLASS =
  "w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 px-3.5 py-2.5 text-sm outline-none focus:border-emerald-500";
const LABEL_CLASS = "mb-1.5 block text-sm text-slate-500 dark:text-slate-400";

/** Tab link CDN: tempel URL langsung ke file (Cloudinary, Bunny, S3, server sendiri). */
export default function CdnTab({ form }: { form: MediaFormApi }) {
  const typeBtn = (t: "image" | "video") =>
    `flex-1 rounded-md py-1.5 text-sm ${
      form.cdnType === t
        ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
        : "text-slate-500 dark:text-slate-400"
    }`;

  return (
    <form onSubmit={form.handleAddCdnLink} className="space-y-4">
      <div>
        <label className={LABEL_CLASS}>Link langsung ke file (Cloudinary, Bunny, S3, dll.)</label>
        <input
          data-testid="cdn-url-input"
          value={form.cdnUrl}
          onChange={(e) => form.setCdnUrl(e.target.value)}
          onBlur={form.handleCdnUrlBlur}
          placeholder="https://res.cloudinary.com/.../video/upload/promo.mp4"
          className={FIELD_CLASS}
        />
        <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
          Tempel URL yang langsung mengarah ke file foto/video (bukan halaman embed/player). Di
          Cloudinary, gunakan tombol &ldquo;Copy URL&rdquo; pada asset-nya.
        </p>
      </div>

      <div>
        <label className={LABEL_CLASS}>Jenis konten</label>
        <div className="flex gap-1 rounded-lg bg-slate-100 dark:bg-slate-800 p-1">
          <button type="button" onClick={() => form.setCdnType("image")} className={typeBtn("image")}>
            Foto
          </button>
          <button type="button" onClick={() => form.setCdnType("video")} className={typeBtn("video")}>
            Video
          </button>
        </div>
      </div>

      <div>
        <label className={LABEL_CLASS}>Nama (opsional)</label>
        <input
          data-testid="cdn-name-input"
          value={form.cdnName}
          onChange={(e) => form.setCdnName(e.target.value)}
          placeholder="Contoh: Banner Promo September"
          className={FIELD_CLASS}
        />
      </div>

      <div>
        <label className={LABEL_CLASS}>
          Durasi ditampilkan (detik)
          {form.cdnType === "video" && " — video akan lanjut otomatis setelah selesai diputar"}
        </label>
        <input
          type="number"
          min={1}
          value={form.cdnDuration}
          onChange={(e) => form.setCdnDuration(parseInt(e.target.value, 10) || 10)}
          className={FIELD_CLASS}
        />
      </div>

      {form.cdnError && (
        <p data-testid="cdn-error" className="text-sm text-rose-600 dark:text-rose-400">
          {form.cdnError}
        </p>
      )}
      <button
        data-testid="cdn-submit"
        type="submit"
        disabled={form.uploading}
        className="w-full rounded-md bg-emerald-600 text-white px-4 py-2.5 text-sm font-medium hover:opacity-90 disabled:opacity-50"
      >
        {form.uploading ? "Menyimpan..." : "Tambahkan"}
      </button>
    </form>
  );
}