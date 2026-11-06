"use client";

import type { Announcement } from "@/lib/types";
import ScheduleRow from "./ScheduleRow";

/**
 * Tabel master jadwal pengumuman: status aktif, pratinjau audio, jam tayang,
 * hari aktif, target layar, jumlah ulang, dan aksi per baris.
 *
 * Catatan: tombol CREATE sengaja TIDAK ada di sini — letaknya di toolbar
 * permanen (AnnouncerToolbar), supaya tidak hilang saat daftar sudah terisi.
 */
export default function ScheduleTable({
  announcements,
  loading,
  previewAudioId,
  onToggleEnabled,
  onTogglePreview,
  onTriggerNow,
  onEdit,
  onRequestDelete,
}: {
  announcements: Announcement[];
  loading: boolean;
  previewAudioId: string | null;
  onToggleEnabled: (item: Announcement) => void;
  onTogglePreview: (id: string, url: string) => void;
  onTriggerNow: (item: Announcement) => void;
  onEdit: (item: Announcement) => void;
  onRequestDelete: (item: Announcement) => void;
}) {
  if (loading) {
    return (
      <div className="px-4 py-12 text-center text-sm text-slate-500 dark:text-slate-400">
        Memuat data jadwal...
      </div>
    );
  }

  if (announcements.length === 0) {
    return (
      <div className="px-4 py-12 text-center">
        <p className="text-base font-medium text-slate-900 dark:text-white">Belum ada jadwal pengumuman.</p>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Gunakan tombol &ldquo;+ Tambah Pengumuman&rdquo; di kanan atas untuk membuat pengumuman
          bersuara yang otomatis diputar pada jam dan hari tertentu.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 text-xs text-slate-500 dark:text-slate-400">
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium">Label &amp; Pratinjau</th>
            <th className="px-4 py-3 font-medium">Jam Tayang</th>
            <th className="px-4 py-3 font-medium">Hari Aktif</th>
            <th className="px-4 py-3 font-medium">Target Layar</th>
            <th className="px-4 py-3 font-medium">Ulang</th>
            <th className="px-4 py-3 text-right font-medium">Aksi</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {announcements.map((item) => (
            <ScheduleRow
              key={item.id}
              item={item}
              isPlaying={previewAudioId === item.id}
              onToggleEnabled={onToggleEnabled}
              onTogglePreview={onTogglePreview}
              onTriggerNow={onTriggerNow}
              onEdit={onEdit}
              onRequestDelete={onRequestDelete}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}