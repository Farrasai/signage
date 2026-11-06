"use client";

import Modal from "@/components/Modal";
import UploadTab from "./UploadTab";
import YoutubeTab from "./YoutubeTab";
import CdnTab from "./CdnTab";
import TableTab from "./TableTab";
import type { AddTab, MediaFormApi } from "./useMediaForm";

const TABS: { key: AddTab; label: string; testId: string }[] = [
  { key: "upload", label: "Unggah file", testId: "tab-upload" },
  { key: "youtube", label: "YouTube", testId: "tab-youtube" },
  { key: "cdn", label: "Link CDN", testId: "tab-cdn" },
  { key: "table", label: "Tabel", testId: "tab-table" },
];

/** Modal "Tambah konten" dengan 4 sumber: unggah, YouTube, link CDN, tabel. */
export default function AddMediaModal({
  tab,
  onTabChange,
  onClose,
  form,
}: {
  tab: AddTab;
  onTabChange: (tab: AddTab) => void;
  onClose: () => void;
  form: MediaFormApi;
}) {
  return (
    <Modal title="Tambah konten" onClose={onClose} width={tab === "table" ? "max-w-2xl" : "max-w-md"}>
      <div className="mb-4 flex flex-wrap gap-1 rounded-lg bg-slate-100 dark:bg-slate-800 p-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            data-testid={t.testId}
            onClick={() => onTabChange(t.key)}
            aria-pressed={tab === t.key}
            className={`flex-1 rounded-md py-1.5 text-sm ${
              tab === t.key
                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                : "text-slate-500 dark:text-slate-400"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "upload" && <UploadTab form={form} />}
      {tab === "youtube" && <YoutubeTab form={form} />}
      {tab === "cdn" && <CdnTab form={form} />}
      {tab === "table" && <TableTab form={form} />}
    </Modal>
  );
}