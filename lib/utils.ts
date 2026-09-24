import type { DayOfWeek, Schedule } from "./types";

/** Buat slug unik untuk URL layar, misal: "lobby-utama-k3f9a1" */
export function generateSlug(name: string): string {
  const base = name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40);
  const suffix = Math.random().toString(36).slice(2, 8);
  return `${base || "tv"}-${suffix}`;
}

export interface ParsedYouTube {
  type: "youtube_video" | "youtube_playlist";
  id: string;
}

/** Ekstrak video ID / playlist ID dari berbagai format URL YouTube. */
export function parseYouTubeUrl(input: string): ParsedYouTube | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Playlist ID langsung, contoh: PL-xxxx
  if (/^[a-zA-Z0-9_-]{10,}$/.test(trimmed) && !trimmed.includes("http")) {
    if (trimmed.startsWith("PL") || trimmed.startsWith("UU") || trimmed.startsWith("OL")) {
      return { type: "youtube_playlist", id: trimmed };
    }
    return { type: "youtube_video", id: trimmed };
  }

  try {
    const url = new URL(trimmed);
    const list = url.searchParams.get("list");
    const v = url.searchParams.get("v");

    if (url.hostname.includes("youtu.be")) {
      const id = url.pathname.replace("/", "");
      if (id) return { type: "youtube_video", id };
    }

    if (url.pathname.startsWith("/playlist") && list) {
      return { type: "youtube_playlist", id: list };
    }

    if (url.pathname.startsWith("/embed/")) {
      const id = url.pathname.replace("/embed/", "");
      if (id === "videoseries" && list) return { type: "youtube_playlist", id: list };
      if (id) return { type: "youtube_video", id };
    }

    if (v) return { type: "youtube_video", id: v };
    if (list) return { type: "youtube_playlist", id: list };
  } catch {
    return null;
  }

  return null;
}

export function youtubeEmbedUrl(type: "youtube_video" | "youtube_playlist", id: string) {
  const base = "https://www.youtube.com/embed/";
  const params = "autoplay=1&mute=1&controls=0&modestbranding=1&rel=0&playsinline=1&enablejsapi=1";
  if (type === "youtube_playlist") {
    return `${base}videoseries?list=${id}&${params}`;
  }
  return `${base}${id}?${params}`;
}

const IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "gif", "webp", "svg", "avif", "bmp"];
const VIDEO_EXTENSIONS = ["mp4", "webm", "mov", "m4v", "ogg", "m3u8"];

/** Tebak apakah URL CDN eksternal (mis. Cloudinary) mengarah ke foto atau video. */
export function guessMediaTypeFromUrl(url: string): "image" | "video" | null {
  try {
    const pathname = new URL(url).pathname.toLowerCase();
    const ext = pathname.split(".").pop() ?? "";
    if (IMAGE_EXTENSIONS.includes(ext)) return "image";
    if (VIDEO_EXTENSIONS.includes(ext)) return "video";
  } catch {
    return null;
  }
  return null;
}

/** Awalan URL publik bucket Storage "media" milik project Supabase ini. */
export function mediaStorageBase(): string {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""}/storage/v1/object/public/media/`;
}

/** True kalau URL berasal dari bucket Storage kita sendiri (bukan link CDN eksternal). */
export function isMediaStorageUrl(url: string): boolean {
  return url.startsWith(mediaStorageBase());
}

const DAY_CODES: DayOfWeek[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

/** Tentukan schedule mana yang aktif sekarang, prioritas tertinggi menang. */
export function resolveActiveSchedule(schedules: Schedule[], now = new Date()): Schedule | null {
  const currentDay = DAY_CODES[now.getDay()];
  const currentTime = now.toTimeString().slice(0, 8); // HH:MM:SS

  const active = schedules.filter((s) => {
    const dayMatches = s.days_of_week.length === 0 || s.days_of_week.includes(currentDay);
    if (!dayMatches) return false;

    if (s.start_time <= s.end_time) {
      return currentTime >= s.start_time && currentTime <= s.end_time;
    }
    // Rentang melewati tengah malam, misal 22:00 - 06:00
    return currentTime >= s.start_time || currentTime <= s.end_time;
  });

  if (active.length === 0) return null;
  return active.sort((a, b) => b.priority - a.priority)[0];
}

export function isOnline(lastSeen: string | null): boolean {
  if (!lastSeen) return false;
  const diffMs = Date.now() - new Date(lastSeen).getTime();
  return diffMs < 60_000; // dianggap online jika heartbeat < 60 detik terakhir
}

export function formatDateTime(iso: string | null): string {
  if (!iso) return "Belum pernah";
  return new Date(iso).toLocaleString("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function playerUrlFor(slug: string): string {
  if (typeof window !== "undefined") {
    return `${window.location.origin}/display/${slug}`;
  }
  return `/display/${slug}`;
}

/** Kunci localStorage tempat TV menyimpan slug layarnya sendiri setelah dipasangkan. */
export const PAIRING_STORAGE_KEY = "siaran:paired-slug";

/** Berapa lama kode PIN pairing berlaku sebelum kedaluwarsa otomatis. */
export const PAIRING_CODE_TTL_MINUTES = 30;

/** Kode PIN 6 digit — dipilih angka saja supaya gampang diketik pakai remote TV. */
export function generatePairingCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export const DEFAULT_AGENDA_COLUMNS = ["No.", "Agenda", "Waktu dan Tempat", "Keterangan"];

/**
 * Ubah teks yang ditempel (dari Excel/Spreadsheet atau CSV) menjadi baris x kolom.
 * Mendeteksi otomatis: tab (umum saat salin dari spreadsheet) atau koma.
 * Catatan: pemisahan koma sederhana (tidak menangani koma di dalam tanda kutip).
 */
export function parseDelimitedText(raw: string): string[][] {
  const lines = raw
    .split(/\r\n|\r|\n/)
    .map((line) => line.replace(/\s+$/, ""))
    .filter((line) => line.trim() !== "");
  if (lines.length === 0) return [];

  const delimiter = lines[0].includes("\t") ? "\t" : ",";
  return lines.map((line) => line.split(delimiter).map((cell) => cell.trim()));
}