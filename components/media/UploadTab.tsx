"use client";

import { useRef } from "react";
import type { MediaFormApi } from "./useMediaForm";

/** Tab unggah: unggah langsung jalan saat file dipilih (tanpa tombol submit). */
export default function UploadTab({ form }: { form: MediaFormApi }) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
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
          onChange={form.handleFileUpload}
          disabled={form.uploading}
        />
      </label>
      {form.uploading && (
        <p className="mt-3 text-center text-xs text-slate-500 dark:text-slate-400">{form.progressLabel}</p>
      )}
    </div>
  );
}