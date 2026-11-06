"use client";

import Modal from "@/components/Modal";
import type { Display } from "@/lib/types";
import DisplayPicker from "./DisplayPicker";
import type { TargetMode } from "./types";

export interface BroadcastFormState {
  label: string;
  repeat: 1 | 2 | 3;
  targetMode: TargetMode;
  selectedDisplays: Set<string>;
  file: File | null;
  uploading: boolean;
  error: string | null;
}

/** Modal siaran suara langsung (langsung masuk antrean TV, tanpa jadwal). */
export default function BroadcastModal({
  form,
  displays,
  fileInputRef,
  onClose,
  onSubmit,
  onChange,
  onToggleDisplay,
}: {
  form: BroadcastFormState;
  displays: Display[];
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  onChange: (patch: Partial<BroadcastFormState>) => void;
  onToggleDisplay: (id: string) => void;
}) {
  const modeBtn = (mode: TargetMode) =>
    `flex-1 rounded-lg py-1.5 text-sm ${
      form.targetMode === mode
        ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium"
        : "text-slate-500 dark:text-slate-400"
    }`;

  return (
    <Modal title="Mulai Siaran Suara Langsung" onClose={onClose}>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm text-slate-500 dark:text-slate-400">Label siaran</label>
          <input
            value={form.label}
            onChange={(e) => onChange({ label: e.target.value })}
            placeholder="Contoh: Pengumuman Darurat Siang"
            className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 px-3.5 py-2.5 text-sm outline-none focus:border-emerald-500"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm text-slate-500 dark:text-slate-400">
            File audio (.mp3, .wav, .ogg)
          </label>
          <label className="flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-slate-200 dark:border-slate-800 py-6 text-sm text-slate-500 dark:text-slate-400 hover:border-emerald-500/50">
            {form.file ? (
              <>
                <span className="text-base">🎵</span>
                <span className="font-medium text-slate-900 dark:text-white">{form.file.name}</span>
                <span className="text-xs">{(form.file.size / 1024 / 1024).toFixed(2)} MB</span>
              </>
            ) : (
              <>
                <span>Klik untuk pilih file audio</span>
                <span className="text-xs">MP3, WAV, OGG</span>
              </>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*"
              className="hidden"
              onChange={(e) => onChange({ file: e.target.files?.[0] ?? null })}
              disabled={form.uploading}
            />
          </label>
        </div>

        <div>
          <label className="mb-1.5 block text-sm text-slate-500 dark:text-slate-400">Diulang</label>
          <div className="flex gap-1 rounded-xl bg-slate-100 dark:bg-slate-800 p-1">
            {([1, 2, 3] as const).map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => onChange({ repeat: n })}
                className={`flex-1 rounded-lg py-1.5 text-sm ${
                  form.repeat === n
                    ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium"
                    : "text-slate-500 dark:text-slate-400"
                }`}
              >
                {n}x
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm text-slate-500 dark:text-slate-400">Tayangkan ke</label>
          <div className="flex gap-1 rounded-xl bg-slate-100 dark:bg-slate-800 p-1">
            <button type="button" onClick={() => onChange({ targetMode: "all" })} className={modeBtn("all")}>
              Semua layar
            </button>
            <button type="button" onClick={() => onChange({ targetMode: "specific" })} className={modeBtn("specific")}>
              Pilih layar
            </button>
          </div>

          {form.targetMode === "specific" && (
            <DisplayPicker displays={displays} selected={form.selectedDisplays} onToggle={onToggleDisplay} />
          )}
        </div>

        {form.error && <p className="text-sm text-rose-600 dark:text-rose-400">{form.error}</p>}

        <button
          type="submit"
          disabled={form.uploading}
          className="w-full rounded-lg bg-emerald-600 text-white px-4 py-2.5 text-sm font-medium hover:opacity-90 disabled:opacity-50"
        >
          {form.uploading ? "Mengunggah..." : "🎤 Mulai Siaran Sekarang"}
        </button>
      </form>
    </Modal>
  );
}