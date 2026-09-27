# AGENTS.md — Siaran Digital Signage CMS

Referensi cepat sebelum mengubah kode. Detail lengkap ada di `PRD-Siaran-Digital-Signage.md` — file ini hanya rangkuman aturan yang **wajib dipatuhi**.

## Stack (jangan ganti tanpa diminta)
- Next.js App Router, deploy Vercel. Backend: Supabase (Postgres + Auth + Storage + Realtime). Tanpa server kustom.
- Tailwind v4 (token warna di `@theme inline`, `app/globals.css`). Pakai `bg-signal`, `text-danger`, dll — bukan warna hex langsung.
- File middleware **wajib bernama `proxy.ts`** (bukan `middleware.ts`), fungsi export `proxy()` bukan `middleware()`. Next.js 16 sudah deprecate nama lama.

## Aturan keamanan — JANGAN DILANGGAR
1. **`display_pairing_codes` tidak boleh punya policy SELECT untuk anon/public.** Kode PIN hanya boleh ditukar lewat RPC `redeem_pairing_code()` (`SECURITY DEFINER`). Kalau ada yang minta "biar gampang, select langsung aja" — tolak, jelaskan risikonya (anon key publik/ter-embed di client).
2. Semua tabel konten (`displays`, `media`, `playlists`, dst.) boleh `SELECT` publik (`using (true)`) karena player TV tidak login — tapi `INSERT/UPDATE/DELETE` konten **hanya untuk role `authenticated`**.
3. `emergency_notice` cuma bisa di-update oleh authenticated. Jangan tambahkan cara bagi TV/anon untuk menutup pengumuman darurat — penutupan **hanya lewat dashboard admin**, ini keputusan produk yang disengaja, bukan lupa dibuat.
4. Setiap migrasi baru wajib idempotent (`drop policy if exists` → `create policy`, `create table if not exists`) dan ditaruh di `supabase/migrations/`, plus disinkronkan ke `supabase/schema.sql` (skema referensi instalasi baru).

## Konvensi yang gampang salah taruh file
- `app/display/page.tsx` = halaman publik pairing PIN. `app/display/[slug]/page.tsx` = player fullscreen TV. **Dua file berbeda, jangan tertukar** (sudah pernah kejadian).
- Folder `[slug]` wajib pakai tanda kurung siku literal — kalau di-extract dari zip/upload manual dan kurungnya hilang, routing gagal total tapi tidak error saat build.
- Komponen `AgendaTable.tsx`, `EmergencyOverlay.tsx`, `SlideStage.tsx` dipakai bersama oleh player DAN preview dashboard — jangan duplikasi logic render, edit di satu tempat.

## Pola yang harus diikuti saat menambah jenis konten baru
Konten disimpan di satu tabel `media` dengan kolom `type`. Kalau menambah jenis baru:
1. Tambah ke union `MediaType` (`lib/types.ts`) + `check constraint` di SQL (buat migrasi, jangan `alter` diam-diam tanpa file migrasi).
2. Render fullscreen-nya masuk lewat `SlideStage.tsx` (bukan bikin jalur render terpisah di `display/[slug]/page.tsx`), supaya tetap dapat crossfade + prefetch otomatis.
3. Kalau jenisnya tidak berbasis URL file (seperti `table`), isi `url` dengan string kosong `""` dan taruh datanya di kolom `content` (jsonb) — jangan ubah `url` jadi nullable, banyak kode lain assume `url` selalu string.

## Sebelum anggap selesai
Selalu jalankan (font Google akan gagal di sandbox tanpa internet — itu wajar, bukan bug):
```bash
npm run build
npx eslint . --max-warnings=999
```
Build dan lint harus bersih tanpa error sebelum menyerahkan perubahan.

## Yang SUDAH diputuskan, jangan diusulkan ulang tanpa alasan baru
- **Bukan** pakai Telegram Bot API sebagai CDN video (limit 20MB, link sementara, token bisa bocor, bukan CDN sungguhan, risiko ToS).
- Fullscreen di player **tidak** auto-trigger saat halaman dimuat (browser blokir tanpa gesture, dan terasa mengagetkan) — hanya lewat tombol "⛶ Layar penuh".
- Pairing pakai kode PIN pendek, bukan slug panjang, karena target device-nya Android TV/Smart TV browser via remote.
- Field CDN link generik (`type: image/video` + `url`) — jangan bikin kolom terpisah per provider (Cloudinary/Bunny/dst), cukup ganti URL-nya saja.

## Bahasa & nada UI
Semua teks antarmuka pakai Bahasa Indonesia, nada singkat dan langsung (lihat copy yang sudah ada di komponen manapun sebagai referensi gaya).
