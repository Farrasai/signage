# Progress — Siaran Digital Signage CMS

Catatan ringkasan semua task yang sudah dikerjakan pada project ini.
Diperbarui otomatis setiap ada penambahan atau perubahan kode.

---

## 📋 Riwayat Task

### [2026-10-05] Master Jadwal Pengumuman Suara (Scheduled Announcements & Management)

- **Status:** ✅ Selesai
- **File diubah / dibuat:**
  - `supabase/migrations/20261005_announcements.sql`: DDL tabel `announcements` (CRUD, jam tayang `time`, hari aktif `days_of_week`, pengulangan `repeat_count`, target layar `target_display_ids`, switch `is_enabled`), Realtime publication, dan kebijakan RLS (public read, auth manage).
  - `supabase/schema.sql`: Sinkronisasi skema instalasi baru untuk tabel `announcements`.
  - `lib/types.ts`: Menambahkan interface `Announcement`.
  - `app/display/[slug]/page.tsx`: Integrasi evaluasi jadwal pengumuman di TV player. TV mengecek jadwal aktif tiap 10 detik, memvalidasi kecocokan jam (`HH:mm`), hari, dan target layar dengan deduping guard per-menit, lalu memasukkannya ke antrean lokal audio engine tanpa mengganggu pemutaran video/slide.
  - `app/dashboard/announcer/page.tsx`: Redesign antarmuka dengan 2 Tab terpadu:
    1. **Jadwal Pengumuman**: Tabel master pengumuman, toggle on/off instan, mini audio preview player (▶/⏸), tombol "▶ Bunyikan Sekarang", tombol Edit modal, tombol Hapus (beserta pembersihan file audio di storage), dan modal form Tambah/Edit jadwal.
    2. **Siaran Langsung & Antrean**: Form siaran dadakan langsung dan monitoring antrean live TV.
- **Catatan teknis:**
  - Evaluasi waktu berjalan mandiri di sisi browser TV (client-side scheduler) tanpa membutuhkan server cron tambahan.
  - Perbaikan audio looping & scheduling: Menambahkan `playedIdsRef` untuk mencegah re-queue audio yang sudah selesai, isolasi dependency `display?.id` agar heartbeat tidak memicu query ulang tabel `announcer_queue`, normalisasi format jam `HH:mm` dan null-safe arrays, serta fallback 3 detik jika browser memblokir autoplay agar antrean tidak macet.
  - Build ✅ (`npm run build`)
  - Lint ✅ (`npx eslint . --max-warnings=999`)

---

### [2026-10-04] Fitur Announcer / Pengumuman Bersuara (Audio Broadcast FIFO)

- **Status:** ✅ Selesai
- **File diubah / dibuat:**
  - `supabase/migrations/20261004_announcer.sql`: Storage bucket `announcer`, tabel `announcer_queue` (FIFO, repeat 1–3x, target display), RLS policies, index, dan Realtime publication.
  - `supabase/schema.sql`: Sinkronisasi skema instalasi baru untuk tabel `announcer_queue` dan bucket `announcer`.
  - `lib/types.ts`: Menambahkan interface `AnnouncerItem`.
  - `components/AnnouncerBadge.tsx`: Floating badge 🎤 dengan indikator pulse merah di pojok kiri atas player TV.
  - `app/dashboard/announcer/page.tsx`: Halaman kelola antrean pengumuman bersuara (monitoring live antrean, form upload audio mp3/wav/ogg, pengaturan repeat count 1–3x, pemilihan target layar, dan pembatalan item beserta pembersihan storage).
  - `app/display/[slug]/page.tsx`: Integrasi audio engine antrean FIFO pada player TV. Memutar audio sekuensial sesuai pengulangan tanpa mengganggu jadwal/playlist (`SlideStage`), serta menampilkan floating badge saat audio aktif.
  - `components/Sidebar.tsx`: Menambahkan menu navigasi "Pengumuman Suara" (🎤) dengan indikator aktif amber.
- **Catatan teknis:**
  - Non-interruptif: Konten visual tetap berputar normal di layar TV saat pengumuman suara berlangsung.
  - Player TV mengelola antrean lokal murni berbasis Realtime INSERT/DELETE tanpa perlu izin tulis ke DB.
  - Build ✅ (`npm run build`)
  - Lint ✅ (`npx eslint . --max-warnings=999`)

---

### [2026-09-28] Dukungan Light Mode & Dark Mode (Auros Theme System)

- **Status:** ✅ Selesai
- **File diubah:**
  - `app/globals.css`: Konfigurasi token Auros Light (`--bg: #f8fffe`, `--surface: #edf5f4`, `--text: #0d1f1e`, dll.) di `:root`, serta token Auros Dark di kelas `.dark`.
  - `app/layout.tsx`: Skrip inline pencegah flash tema (anti-flash script) sebelum hidrasi React yang membaca preferensi dari `localStorage`.
  - `components/Sidebar.tsx`: Hook `useTheme` dan tombol toggle mode terang/gelap (☾ / ☀) di bagian bawah sidebar.
- **Catatan teknis:**
  - Strategi CSS class pada elemen `<html>` tanpa dependency eksternal tambahan.
  - Build ✅ Lint ✅

---

### [2026-09-28] Redesign Halaman Konten Media (Toolbar, Filter, & List View)

- **Status:** ✅ Selesai
- **File diubah:** `app/dashboard/media/page.tsx`
- **Deskripsi:**
  - Toolbar terpadu: Pencarian real-time, filter pills per tipe konten (`Semua`, `Foto`, `Video`, `YouTube`, `Tabel`) dengan counter badge otomatis, dan view switcher Grid ⊞ / List ☰.
  - Tampilan List / Tabel: Menampilkan thumbnail 44px, nama konten, badge tipe berwarna, durasi inline (blur-to-save), tanggal dibuat, dan tombol aksi Edit/Hapus.
  - Visual hierarchy: Badge tipe berwarna di pojok thumbnail (teal foto, ungu video, merah YouTube, amber tabel).
  - UI Resilience: Loading skeleton 3 card dan empty state adaptif (perpustakaan kosong vs filter tidak ditemukan + tombol reset).
- **Catatan teknis:**
  - Mengikuti prinsip antislop (fungsional penuh, keyboard-accessible, semua tombol memiliki aksi nyata).
  - Build ✅ Lint ✅

---

### [2026-09-28] Redesign Tampilan UI Sistem (Auros Design System)

- **Status:** ✅ Selesai
- **File diubah:**
  - `app/globals.css`: Konfigurasi token Auros (`--bg: #012624`, `--surface: #003734`, `--surface-2: #011d1c`, `--border: rgba(255,255,255,0.08)`, `--text: #ffffff`, `--text-muted: #bbc7c6`, `--signal: #00827c`, `--lavender: #fde9ff`, `--liquid-mist: #edfffe`, `.btn-aurora`).
  - `app/dashboard/page.tsx`: Card border radius 16px (`rounded-2xl`), angka statistik dengan aksen lavender (`text-lavender`), CTA empty state `btn-aurora`.
  - `app/dashboard/displays/page.tsx`: Card `rounded-2xl`, tombol CTA `btn-aurora`, modal buttons `rounded-md`.
  - `app/dashboard/media/page.tsx`: Card `rounded-2xl`, tombol CTA dan submit tab `btn-aurora`, action buttons `rounded-md`.
  - `app/dashboard/playlists/page.tsx`: Card & empty state `rounded-2xl`, tombol CTA `btn-aurora`.
  - `app/dashboard/playlists/[id]/page.tsx`: Card item `rounded-2xl`, tombol CTA `btn-aurora`, item picker `rounded-md`.
  - `app/dashboard/schedules/page.tsx`: Card & empty state `rounded-2xl`, tombol CTA `btn-aurora`, toggle hari `bg-signal text-white`.
  - `app/dashboard/emergency/page.tsx`: Alert active banner & preview container `rounded-2xl`, tombol aksi `rounded-md`.
  - `app/display/page.tsx`: Background diganti token `bg-bg`, tombol submit `btn-aurora`.
  - `app/login/page.tsx`: Tombol masuk `btn-aurora`.
  - `components/Modal.tsx`: Container `rounded-2xl`, menghapus `shadow-2xl` sesuai spec (depth via surface color).
  - `components/Sidebar.tsx`: Nav items `rounded-md`, active state `bg-signal-soft text-text font-medium`.
  - `components/SignOutButton.tsx`: Tombol `rounded-md`.
  - `components/EditMediaModal.tsx`: Tombol submit `btn-aurora` dengan `rounded-md`.
- **Catatan teknis:**
  - Player TV (`/display/[slug]`) tetap dipertahankan sesuai kesepakatan agar tampilan TV tetap bersih.
  - Build ✅ (`npm run build`)
  - Lint ✅ (`npx eslint . --max-warnings=999`)

---

### [2026-09-28] Stat Cards & Activity Log di Halaman Ringkasan

- **Status:** ✅ Selesai
- **File diubah:** `app/dashboard/page.tsx`
- **Deskripsi:** Menambahkan dua fitur baru ke halaman `/dashboard` (Ringkasan):
  1. **4 Stat Cards** (di atas daftar layar):
     - 🖥 Total Layar → link ke `/dashboard/displays`
     - 🎞 Total Konten → link ke `/dashboard/media`
     - 📋 Total Playlist → link ke `/dashboard/playlists`
     - ● Layar Online sekarang (aksen `text-online`)
  2. **Activity Log** (di bawah daftar layar, maks 10 entri):
     - Layar baru ditambahkan (dari `displays.created_at`)
     - Konten baru ditambahkan (dari `media.created_at`)
     - Layar terakhir online (dari `displays.last_seen`)
- **Catatan teknis:**
  - Data diambil dengan 6 query paralel (`Promise.all`) di dalam `load()` yang sudah ada
  - Tidak ada tabel baru — semua dari data existing
  - Media count pakai `count: exact, head: true` (efisien, tanpa fetch semua baris)
  - Activity entries di-merge, sort by timestamp desc, slice 10 teratas
  - Build ✅ Lint ✅

---

### [2026-09-27] Analisis & Orientasi Proyek

- **Status:** ✅ Selesai
- **Deskripsi:** Membaca dan menganalisis seluruh struktur kode yang sudah ada (production).
- **Yang dipelajari:**
  - Stack: Next.js 16.3.5 App Router + React 19 + Tailwind v4 + Supabase + Vercel
  - Middleware: `proxy.ts` (export `proxy()`) — sudah sesuai konvensi Next.js 16
  - Rute halaman: `/login`, `/display`, `/display/[slug]`, `/dashboard/*`
  - Tipe konten: `image | video | youtube_video | youtube_playlist | table`
  - RLS Supabase: `display_pairing_codes` aman (tidak ada SELECT untuk anon), PIN hanya lewat RPC `redeem_pairing_code()`
  - Komponen shared: `SlideStage.tsx`, `AgendaTable.tsx`, `EmergencyOverlay.tsx`
  - Alur realtime TV player: heartbeat 25 detik, subscribe Realtime, schedule dievaluasi tiap 30 detik
  - Token warna Tailwind v4 di `globals.css` via `@theme inline`
- **File yang dibaca:**
  - `AGENTS.md`, `PRD-Siaran-Digital-Signage.md` (referensi)
  - `lib/types.ts`, `lib/utils.ts`
  - `app/globals.css`, `package.json`
  - `supabase/schema.sql`
  - `proxy.ts`
  - `components/SlideStage.tsx`
  - `app/display/[slug]/page.tsx`
  - `app/dashboard/page.tsx`

---

## 🗂️ Struktur Proyek (Snapshot Awal)

```
signage/
├── app/
│   ├── dashboard/
│   │   ├── announcer/page.tsx     # Antrean & siaran pengumuman suara (audio broadcast)
│   │   ├── displays/page.tsx      # Kelola layar & PIN pairing
│   │   ├── emergency/page.tsx     # Siaran darurat
│   │   ├── media/page.tsx         # Kelola konten media
│   │   ├── playlists/[id]/        # Detail & urutan playlist
│   │   ├── playlists/page.tsx     # Daftar playlist
│   │   ├── schedules/page.tsx     # Jadwal per layar & hari
│   │   ├── layout.tsx             # Layout dashboard + Sidebar
│   │   └── page.tsx               # Ringkasan + remote control
│   ├── display/
│   │   ├── [slug]/page.tsx        # Player fullscreen TV (anon)
│   │   └── page.tsx               # Halaman pairing PIN
│   ├── login/page.tsx             # Login admin
│   ├── globals.css                # Token warna Tailwind v4 (Light/Dark)
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── AgendaTable.tsx            # Tabel agenda (shared)
│   ├── AnnouncerBadge.tsx         # Floating badge 🎤 pengumuman bersuara (player TV)
│   ├── EditMediaModal.tsx         # Modal edit konten media
│   ├── EmergencyOverlay.tsx       # Overlay darurat (shared)
│   ├── Modal.tsx                  # Komponen modal generik
│   ├── RemoteControls.tsx         # Kontrol remote dari dashboard
│   ├── Sidebar.tsx                # Navigasi dashboard + toggle tema
│   ├── SignOutButton.tsx          # Tombol logout
│   ├── SlideStage.tsx             # Mesin crossfade + prefetch (shared)
│   └── StatusDot.tsx              # Indikator online/offline layar
├── lib/
│   ├── supabase/
│   │   ├── client.ts              # Supabase client (browser)
│   │   └── server.ts              # Supabase client (server)
│   ├── types.ts                   # Type definitions
│   └── utils.ts                   # Utility functions
├── supabase/
│   ├── migrations/
│   │   ├── 20261004_announcer.sql     # Migrasi antrean pengumuman bersuara
│   │   └── 20261005_announcements.sql # Migrasi master jadwal pengumuman
│   └── schema.sql                     # Skema DB lengkap (referensi instalasi baru)
├── proxy.ts                           # Middleware auth (Next.js 16)
├── AGENTS.md                          # Aturan wajib untuk coding agent
└── progress.md                        # File ini
```

---

## 📌 Keputusan Desain yang Sudah Final (Jangan Diusulkan Ulang)

| Keputusan                                               | Alasan                                           |
| ------------------------------------------------------- | ------------------------------------------------ |
| Bukan pakai Telegram Bot API sebagai CDN                | Limit 20MB, link sementara, risiko ToS           |
| Fullscreen tidak auto-trigger saat load                 | Browser blokir tanpa gesture, terasa mengagetkan |
| Pairing pakai PIN pendek (6 digit angka)                | Target device Android TV/Smart TV via remote     |
| CDN link generik (type + url), bukan kolom per-provider | Cukup ganti URL saja                             |
| `display_pairing_codes` tanpa SELECT untuk anon         | Keamanan — anon key ter-embed di client          |
| Penutupan `emergency_notice` hanya dari dashboard       | Keputusan produk yang disengaja                  |

---

_Terakhir diperbarui: 2026-10-05_
