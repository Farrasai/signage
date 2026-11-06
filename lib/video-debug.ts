/**
 * Diagnostik kegagalan video untuk player TV.
 *
 * Kenapa ada modul terpisah: kegagalan `MEDIA_ERR_DECODE` / network sebelumnya
 * GAGAL SENYAP (onError memang sengaja tidak dipasang agar video tidak di-skip
 * prematur — lihat AGENTS.md). Akibatnya layar blank tanpa jejak apa pun.
 * Modul ini menyimpan kejadian terakhir di memori supaya bisa dibaca langsung
 * dari TV lewat overlay `?debug=1`, tanpa perlu chrome://inspect.
 */

export type VideoErrorLabel = "ABORTED" | "NETWORK" | "DECODE" | "SRC_NOT_SUPPORTED" | "UNKNOWN";

export type VideoDebugEntry = {
  label: VideoErrorLabel;
  code: number;
  readyState: number;
  networkState: number;
  url: string;
  at: number;
};

let lastError: VideoDebugEntry | null = null;

const LABELS: Record<number, VideoErrorLabel> = {
  1: "ABORTED",
  2: "NETWORK",
  3: "DECODE",
  4: "SRC_NOT_SUPPORTED",
};

export function labelForErrorCode(code: number): VideoErrorLabel {
  return LABELS[code] ?? "UNKNOWN";
}

/** Dicatat oleh VideoLayer saat elemen <video> memicu event "error". */
export function reportVideoError(entry: Omit<VideoDebugEntry, "at">) {
  lastError = { ...entry, at: Date.now() };
}

export function getLastVideoError(): VideoDebugEntry | null {
  return lastError;
}