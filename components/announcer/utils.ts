/**
 * Ambil path objek Storage dari URL publik bucket `announcer`.
 * Dipakai untuk membersihkan file saat jadwal dihapus, dan sebagai fallback
 * bila kolom `storage_path` belum terisi (data lama hasil migrasi backfill).
 */
export function getStoragePath(raw: string | null): string | null {
  try {
    const u = raw || "";
    const k = "/announcer/";
    const i = u.indexOf(k);
    if (i >= 0) return decodeURIComponent(u.slice(i + k.length).split("?")[0]);
    return null;
  } catch {
    return null;
  }
}