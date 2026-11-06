"use client";

import Modal from "@/components/Modal";
import type { Announcement } from "@/lib/types";

/** Modal konfirmasi hapus jadwal pengumuman beserta file audionya. */
export default function DeleteScheduleModal({
  item,
  onCancel,
  onConfirm,
}: {
  item: Announcement;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal title="Hapus Jadwal Pengumuman" onClose={onCancel}>
      <div className="space-y-4">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Apakah Anda yakin ingin menghapus jadwal pengumuman{" "}
          <strong className="text-slate-900 dark:text-white">&ldquo;{item.label}&rdquo;</strong>?
          File audio terkait juga akan dibersihkan dari penyimpanan.
        </p>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-slate-200 dark:border-slate-800 px-4 py-2 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-md bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
          >
            Hapus
          </button>
        </div>
      </div>
    </Modal>
  );
}