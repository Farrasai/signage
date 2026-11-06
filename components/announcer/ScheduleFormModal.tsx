"use client";

import Modal from "@/components/Modal";
import type { Announcement, DayOfWeek, Display } from "@/lib/types";
import ScheduleFormFields from "./ScheduleFormFields";

export interface ScheduleFormState {
  label: string;
  time: string;
  days: Set<DayOfWeek>;
  repeat: 1 | 2 | 3;
  targetMode: "all" | "specific";
  selectedDisplays: Set<string>;
  file: File | null;
  enabled: boolean;
  saving: boolean;
  error: string | null;
}

/** Modal tambah/edit jadwal pengumuman. Logika form ada di parent (page). */
export default function ScheduleFormModal({
  editing,
  form,
  displays,
  fileInputRef,
  onClose,
  onSubmit,
  onChange,
  onToggleDay,
  onToggleDisplay,
}: {
  editing: Announcement | null;
  form: ScheduleFormState;
  displays: Display[];
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  onChange: (patch: Partial<ScheduleFormState>) => void;
  onToggleDay: (day: DayOfWeek) => void;
  onToggleDisplay: (id: string) => void;
}) {
  return (
    <Modal title={editing ? "Edit Jadwal Pengumuman" : "Tambah Jadwal Pengumuman"} onClose={onClose}>
      <form onSubmit={onSubmit} className="space-y-4">
        <ScheduleFormFields
          editing={editing}
          form={form}
          displays={displays}
          fileInputRef={fileInputRef}
          onChange={onChange}
          onToggleDay={onToggleDay}
          onToggleDisplay={onToggleDisplay}
        />
      </form>
    </Modal>
  );
}