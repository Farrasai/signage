import type { MediaType } from "@/lib/types";

export const TYPE_LABEL: Record<MediaType, string> = {
  image: "Foto",
  video: "Video",
  youtube_video: "YouTube",
  youtube_playlist: "YouTube",
  table: "Tabel",
};

export const TYPE_BADGE: Record<MediaType, string> = {
  image: "bg-emerald-600/90 text-white",
  video: "bg-purple-500/90 text-white",
  youtube_video: "bg-rose-500/90 text-white",
  youtube_playlist: "bg-rose-500/90 text-white",
  table: "bg-amber-500/90 text-white",
};

export type FilterType = "semua" | MediaType;
export type ViewMode = "grid" | "list";

/** Jumlah kartu per halaman pada tampilan grid. */
export const PAGE_SIZE = 24;

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** Baca durasi video dari file lokal untuk mengisi default durasi konten. */
export function readVideoDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(video.src);
      resolve(Math.round(video.duration) || 15);
    };
    video.onerror = () => resolve(15);
    video.src = URL.createObjectURL(file);
  });
}