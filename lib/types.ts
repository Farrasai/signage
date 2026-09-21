export type MediaType = "image" | "video" | "youtube_video" | "youtube_playlist" | "table";

/** Struktur data untuk konten bertipe "table" (mis. tabel agenda/pengumuman). */
export interface TableContent {
  title: string;
  columns: string[];
  rows: string[][];
}

export interface Media {
  id: string;
  name: string;
  type: MediaType;
  url: string;
  duration: number;
  thumbnail_url: string | null;
  content: TableContent | null;
  created_at: string;
}

export interface Playlist {
  id: string;
  name: string;
  created_at: string;
}

export interface PlaylistItem {
  id: string;
  playlist_id: string;
  media_id: string;
  sort_order: number;
  duration_override: number | null;
  media?: Media;
}

export interface Display {
  id: string;
  name: string;
  slug: string;
  default_playlist_id: string | null;
  marquee_text: string;
  marquee_enabled: boolean;
  is_paused: boolean;
  last_seen: string | null;
  created_at: string;
}

export type DayOfWeek = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

export const DAYS: { value: DayOfWeek; label: string }[] = [
  { value: "mon", label: "Sen" },
  { value: "tue", label: "Sel" },
  { value: "wed", label: "Rab" },
  { value: "thu", label: "Kam" },
  { value: "fri", label: "Jum" },
  { value: "sat", label: "Sab" },
  { value: "sun", label: "Min" },
];

export interface Schedule {
  id: string;
  display_id: string;
  playlist_id: string;
  days_of_week: DayOfWeek[];
  start_time: string;
  end_time: string;
  priority: number;
  created_at: string;
}

export type RemoteCommandType = "refresh" | "next" | "prev" | "play" | "pause";

export interface RemoteCommand {
  id: string;
  display_id: string;
  command: RemoteCommandType;
  executed: boolean;
  created_at: string;
}