"use client";

import { DAYS } from "@/lib/types";
import type { Announcement, DayOfWeek, Display } from "@/lib/types";
import DisplayPicker from "./DisplayPicker";
import type { ScheduleFormState } from "./ScheduleFormModal";

/** Isi form jadwal pengumuman. */
export default function ScheduleFormFields({
  editing,
  form,
  displays,
  fileInputRef,
  onChange,
  onToggleDay,
  onToggleDisplay,
}: {
  editing: Announcement | null;
  form: ScheduleFormState;
  displays: Display[];
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onChange: (patch: Partial<ScheduleFormState>) => void;
  onToggleDay: (day: DayOfWeek) => void;
  onToggleDisplay: (id: string) => void;
}) {
  const allDaysSelected = form.days.size === DAYS.length;
  const modeBtn = (mode: "all" | "specific") =>
    `flex-1 rounded-lg py-1.5 text-sm ${
      form.targetMode === mode
        ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium"
        : "text-slate-500 dark:text-slate-400"
    }`;

  return (
    <>
      <div>
        <label className="mb-1.5 block text-sm text-slate-500 dark:text-slate-400">Label pengumuman</label>
        <input
          data-testid="announcement-label-input"
          value={form.label}
          onChange={(e) => onChange({ label: e.target.value })}
          placeholder="Contoh: Bel Masuk Kerja / Pengumuman Layanan"
          className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 px-3.5 py-2.5 text-sm outline-none focus:border-emerald-500"
        />
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Teks ini tampil pada badge 🎤 melayang di layar TV.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm text-slate-500 dark:text-slate-400">Waktu tayang</label>
          <input
            type="time"
            value={form.time}
            onChange={(e) => onChange({ time: e.target.value })}
            className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 px-3.5 py-2.5 text-sm outline-none focus:border-emerald-500"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm text-slate-500 dark:text-slate-400">Jumlah pengulangan</label>
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
      </div>

      <ScheduleDaysBlock
        form={form}
        onChange={onChange}
        onToggleDay={onToggleDay}
        allDaysSelected={allDaysSelected}
      />

      <ScheduleAudioBlock editing={editing} form={form} fileInputRef={fileInputRef} onChange={onChange} />

      <ScheduleTargetBlock
        form={form}
        displays={displays}
        onChange={onChange}
        onToggleDisplay={onToggleDisplay}
        modeBtn={modeBtn}
      />

      <ScheduleSubmitBlock editing={editing} form={form} onChange={onChange} />
    </>
  );
}
/** Pemilih hari tayang. Kosong = berlaku setiap hari. */
function ScheduleDaysBlock({
  form,
  onChange,
  onToggleDay,
  allDaysSelected,
}: {
  form: ScheduleFormState;
  onChange: (patch: Partial<ScheduleFormState>) => void;
  onToggleDay: (day: DayOfWeek) => void;
  allDaysSelected: boolean;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <label className="text-sm text-slate-500 dark:text-slate-400">Hari tayang</label>
        <button
          type="button"
          onClick={() => onChange({ days: allDaysSelected ? new Set() : new Set(DAYS.map((d) => d.value)) })}
          className="text-xs text-emerald-600 hover:underline"
        >
          {allDaysSelected ? "Hapus Pilihan (Setiap Hari)" : "Pilih Semua Hari"}
        </button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {DAYS.map((d) => (
          <button
            key={d.value}
            type="button"
            onClick={() => onToggleDay(d.value)}
            className={`rounded-md px-3 py-1.5 text-xs transition-colors ${
              form.days.has(d.value)
                ? "bg-emerald-600 text-white"
                : "border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400"
            }`}
          >
            {d.label}
          </button>
        ))}
      </div>
      {form.days.size === 0 && (
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Berlaku setiap hari (tidak ada batasan hari).
        </p>
      )}
    </div>
  );
}
/** Unggah file audio. Saat edit, file boleh dikosongkan (audio lama dipertahankan). */
function ScheduleAudioBlock({
  editing,
  form,
  fileInputRef,
  onChange,
}: {
  editing: Announcement | null;
  form: ScheduleFormState;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onChange: (patch: Partial<ScheduleFormState>) => void;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm text-slate-500 dark:text-slate-400">
        {editing ? "File audio (kosongkan jika tidak ingin mengganti)" : "File audio (.mp3, .wav, .ogg)"}
      </label>
      <label className="flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-slate-200 dark:border-slate-800 py-6 text-sm text-slate-500 dark:text-slate-400 hover:border-emerald-500/50">
        {form.file ? (
          <>
            <span className="text-base">🎵</span>
            <span className="font-medium text-slate-900 dark:text-white">{form.file.name}</span>
            <span className="text-xs">{(form.file.size / 1024 / 1024).toFixed(2)} MB</span>
          </>
        ) : editing ? (
          <>
            <span>Audio tersimpan saat ini</span>
            <span className="text-xs text-slate-500 dark:text-slate-400">Klik untuk memilih file pengganti</span>
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
          disabled={form.saving}
        />
      </label>
    </div>
  );
}
/** Target siaran: semua layar atau pilih sebagian. */
function ScheduleTargetBlock({
  form,
  displays,
  onChange,
  onToggleDisplay,
  modeBtn,
}: {
  form: ScheduleFormState;
  displays: Display[];
  onChange: (patch: Partial<ScheduleFormState>) => void;
  onToggleDisplay: (id: string) => void;
  modeBtn: (mode: "all" | "specific") => string;
}) {
  return (
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
  );
}

/** Switch aktif/nonaktif, pesan error, dan tombol submit. */
function ScheduleSubmitBlock({
  editing,
  form,
  onChange,
}: {
  editing: Announcement | null;
  form: ScheduleFormState;
  onChange: (patch: Partial<ScheduleFormState>) => void;
}) {
  return (
    <>
      <div className="flex items-center justify-between pt-2">
        <div>
          <p className="text-sm font-medium text-slate-900 dark:text-white">Status jadwal</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Aktifkan pengumuman ini untuk diputar sesuai jadwal.
          </p>
        </div>
        <label className="relative inline-flex cursor-pointer items-center">
          <input
            type="checkbox"
            checked={form.enabled}
            onChange={(e) => onChange({ enabled: e.target.checked })}
            className="peer sr-only"
          />
          <div className="h-5 w-9 rounded-full bg-border peer-checked:bg-emerald-600 peer-focus:outline-none after:absolute after:left-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-full" />
        </label>
      </div>

      {form.error && (
        <p data-testid="announcement-error" className="text-sm text-rose-600 dark:text-rose-400">
          {form.error}
        </p>
      )}

      <button
        data-testid="announcement-submit"
        type="submit"
        disabled={form.saving}
        className="w-full rounded-lg bg-emerald-600 text-white px-4 py-2.5 text-sm font-medium hover:opacity-90 disabled:opacity-50"
      >
        {form.saving ? "Menyimpan..." : editing ? "Simpan Perubahan" : "Buat Jadwal"}
      </button>
    </>
  );
}