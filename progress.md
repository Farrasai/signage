# Progress — Siaran Digital Signage CMS

Catatan ringkasan semua task yang sudah dikerjakan pada project ini.
Diperbarui otomatis setiap ada penambahan atau perubahan kode.

---

## 📋 Riwayat Task

### [2026-10-16] Redesign UI — Migrasi ke Sistem Desain ABPEDNAS (antislop: during)

- **Status:** ✅ Selesai
- **Arah desain:** Pindah dari Auros palette (dark teal) ke sistem desain ABPEDNAS dari `DESIGN.md`. Light mode default, dark mode toggle tersedia. Inter sebagai font tunggal. Scope: semua halaman dashboard + login.
- **File diubah / dibuat:**
  - `app/globals.css`: Token warna dimigrasi seluruhnya ke dua skema (`:root` untuk light, `.dark` untuk dark). Kelas `.btn-aurora` diganti dengan `.btn-primary` (solid blue) dan `.btn-ghost`. Marquee animation dipertahankan.
  - `app/layout.tsx`: Space_Grotesk dihapus (Inter saja sesuai DESIGN.md). Ditambahkan anti-flash script inline di `<head>` untuk mencegah kedip saat halaman dimuat.
  - `app/login/page.tsx`: Redesign layout dua kolom desktop (panel branding biru kiri + form kanan). Single column di mobile. Button ganti ke solid blue. Focus ring pada input dan button. Error state dengan `role=alert`.
  - `app/dashboard/layout.tsx`: Sidebar lebar 64, ditambahkan `ThemeToggle` di footer sidebar.
  - `app/dashboard/page.tsx`: Token warna diperbarui, `rounded-2xl` diseragamkan ke `rounded-xl`, `text-lavender` dan `font-display` dihapus.
  - `app/dashboard/displays/page.tsx`: `btn-aurora` diganti, `font-display` dihapus.
  - `app/dashboard/media/page.tsx`: Semua `btn-aurora` diganti dengan solid blue.
  - `app/dashboard/playlists/page.tsx`, `playlists/[id]/page.tsx`: Idem.
  - `app/dashboard/schedules/page.tsx`: Idem.
  - `app/dashboard/announcer/page.tsx`: Idem.
  - `app/dashboard/emergency/page.tsx`: `font-display` dihapus.
  - `app/display/page.tsx`: `btn-aurora` diganti ke `bg-white text-gray-900` (halaman pairing memiliki bg gelap sendiri).
  - `components/Sidebar.tsx`: Warna active link menggunakan `text-signal` (biru), `focus-visible` ditambahkan di semua link.
  - `components/SignOutButton.tsx`: Full-width, layout selaras dengan ThemeToggle, `focus-visible` ditambahkan.
  - `components/Modal.tsx`: Hapus `backdrop-blur-sm` glassmorphism, ganti ke solid surface. Tambah Escape key listener dan `role=dialog`.
  - `components/ThemeToggle.tsx`: Komponen baru. Toggle light/dark, simpan ke `localStorage`, terapkan class `.dark` ke `<html>`.
  - `components/EditMediaModal.tsx`, `AgendaTable.tsx`, `EmergencyOverlay.tsx`: `btn-aurora` dan `font-display` dihapus.
- **Antislop compliance:**
  - R-01: Gradient aurora pada button dihapus, diganti solid blue. Glow pada status dot satu elemen dipertahankan (purpose: live status indicator).
  - R-10: Glassmorphism `backdrop-blur-sm` di Modal dihapus.
  - R-21: Dark mode toggle diimplementasikan penuh, kedua tema berfungsi.
  - R-25: Semua teks menggunakan token kontras yang sesuai WCAG AA.
  - R-26: Modal sekarang dapat ditutup dengan Escape.
  - R-32: `focus-visible` ditambahkan ke semua interactive element baru.
- **Build ✅ Lint ✅**

---

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

### [2026-10-06] Penambahan Fitur Waktu Server di Sidebar (System Clock)

- **Status:** ✅ Selesai
- **File diubah / dibuat:**
  - `components/SystemClock.tsx`: Membuat komponen baru untuk menampilkan waktu server secara real-time yang terus diperbarui setiap detik.
  - `app/dashboard/layout.tsx`: Memasukkan komponen `SystemClock` ke bagian footer sidebar agar dapat diakses dari seluruh halaman dashboard.
- **Catatan teknis:**
  - Komponen melakukan fetch ke `/api/time` sekali di awal untuk mendapatkan `serverOffsetMs`, sehingga waktu yang ditampilkan tetap akurat sesuai zona waktu server tanpa harus terus menerus membebani server dengan request berkali-kali. Format penulisan menggunakan standar baku 24-jam beserta WIB.

---

### [2026-10-06] Perbaikan Fitur Announcer (Ponytail Review)

- **Status:** ✅ Selesai
- **File diubah / dibuat:**
  - `app/api/time/route.ts`: Membuat endpoint baru `/api/time` untuk memberikan waktu server yang akurat. File sempat terbuat kosong lalu di-repopulasi dengan standar `NextResponse`.
  - `components/AnnouncerBadge.tsx`: Menghapus efek `backdrop-blur-sm` yang menyebabkan antarmuka nge-freeze/blank di OS Android TV yang minim VRAM.
  - `components/SlideStage.tsx`: Menambahkan `onPause` handler pada tag `<video>` (Workaround: OS Android TV memiliki 'Audio Focus' yang nge-pause paksa video latar saat audio pengumuman dimainkan. Script akan berusaha melakukan resume atau me-skip video jika decoder terkunci).
  - `app/display/[slug]/page.tsx`:
    - Mengintegrasikan fetch `/api/time` saat player dimuat guna menghitung `serverOffsetMs`, sehingga `evaluateSchedule` mengacu ke waktu server, bukan waktu jam TV yang sering keliru (memperbaiki jadwal tak muncul).
    - Menambahkan hard fallback timer 3 menit di auto-advance video supaya TV player tidak freeze abadi saat tag video gagal nge-trigger onEnded.
- **Catatan teknis:**
  - Build ✅ Lint ✅

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

### [2026-10-07] Multi-Role — Administrator vs Operator Bidang (7 Bidang)

- **Status:** ✅ Selesai (migrasi + RLS + UI guard + build hijau 14 routes)
- **Peran:** `admin` (akses penuh) vs `operator_bidang` (TU / INTEL / BIN / PIDSUS / PIDUM / DATUN / PAPBB). Bidang disimpan di `profiles.bidang` + di `displays.bidang`/`playlists.bidang` untuk isolasi. Akun lama di-backfill → `admin`.
- **File diubah / dibuat:**
  - `lib/types.ts`: `Role`, `Bidang`, `BIDANG_OPTIONS`, `Profile`, `Display.owner_id/bidang`, `Playlist.owner_id/bidang`, `Media.owner_id`, `Schedule.owner_id`.
  - `lib/auth.ts`: helper `isAdmin`, `isOperator`, `canEditDisplay`, `canEditOwner`, `canAccessAnnouncer/Emergency/Users`.
  - `supabase/migrations/20261006_multirole.sql`: tabel `profiles`, kolom `owner_id`/`bidang`, fungsi `is_admin()` & `my_bidang()` (`security definer`), RLS (Displays/Playlists SELECT all, UPDATE/DELETE owner/bidang/admin; Media/Schedules owner/admin; Announcer/Emergency/RemoteCommands admin only), index, trigger `handle_new_user()`, backfill admin.
  - `supabase/fix_profiles_rls.sql`: perbaiki rekursi RLS `profiles` → `is_admin()` security definer.
  - `proxy.ts` + `app/dashboard/layout.tsx`: role guard (anon → /login, operator blok `/dashboard/users`/`/announcer`/`/emergency`).
  - `components/DashboardShell.tsx` / `Sidebar.tsx`: sembunyikan Kontrol Siaran untuk operator, badge `Operator — BIDANG`, link Manajemen User hanya admin.
  - `app/dashboard/users` + `app/api/admin/*`: CRUD user via `service_role` (create auth user + profiles), pagination 10.
  - `app/dashboard/displays/media/playlists/schedules`: view all, edit/delete hanya owner/bidang/admin, auto set `owner_id/bidang` saat insert.
- **Build:** ✅ 14 routes

---

### [2026-10-07] Redesign UI/UX — Accessibility, Layout & Pagination

- **Status:** ✅ Selesai
- **Latar:** Gradient tidak aksesibel, kontras light/dark, card transparan, overflow `min-h-screen + overflow-hidden`, double title, scroll clipping, viewport lock.
- **File diubah / dibuat:**
  - `app/globals.css`: `@custom-variant dark`, migrasi token `bg-surface/border-border/text-text/bg-signal` → `bg-white dark:bg-slate-900` dkk.
  - `app/layout.tsx`: `html/body height:100%` → `min-height`, viewport lock.
  - `components/DashboardShell.tsx`: hapus `overflow-hidden` pada flex/`min-h-screen`.
  - `components/Sidebar.tsx`: fix `dark:hover:bg-slate-700 dark:hover:text-white` untuk Manajemen User.
  - `components/Pagination.tsx`: komponen baru numbered (Media 24, Users/Schedules/Playlists/Announcer 10, Displays all); di luar `overflow-hidden rounded-2xl > overflow-x-auto` agar tidak ter-clipping.
  - `components/PageHeader.tsx`: Shell sticky header jadi single source (Opsi A); 6 halaman hapus `<header><h1>` ganda.
  - CTA `emerald-wave-pattern` → solid `bg-emerald-600 hover:bg-emerald-700 font-bold` (WCAG AA 4.63:1); `KpiCard` gradient dipertahankan; `ThemeToggle` tetap ada.
- **Build:** ✅ Lint ✅

---

### [2026-10-07] Announcer Audio Storage Ownership — Anti-Hapus Master (Opsi C)

- **Status:** ✅ Selesai (build hijau; migrasi siap eksekusi di Supabase Dashboard)
- **Root cause:** `announcer_queue.audio_url` share file dengan `announcements.audio_url`. `handleCancelQueueItem` (dan `handleSaveSchedule` yang hapus lama sebelum DB sukses + parsing `split("/announcer")` rapuh) menghapus storage → master jadi 404.
- **File diubah / dibuat:**
  - `supabase/migrations/20261007_announcer_ownership.sql`: `announcements.storage_path`, `announcer_queue.storage_path + source_announcement_id FK ON DELETE SET NULL + idx` + backfill `split_part(audio_url,'/announcer/',2)`.
  - `supabase/schema.sql`: sinkron instalasi baru (storage_path + source_announcement_id + idx).
  - `lib/types.ts`: `Announcement.storage_path`, `AnnouncerItem.storage_path + source_announcement_id`.
  - `app/dashboard/announcer/page.tsx`: helper `getStoragePath(raw)` robust, `handleTriggerNow` insert `storage_path+source_announcement_id`, `handleSaveSchedule` trash-safe (upload baru → `getPublicUrl` → DB sukses baru `remove(old)` else `remove(new)`), `handleDeleteSchedule`/`handleBroadcastSubmit` pakai `storage_path ?? getStoragePath`, `handleCancelQueueItem` guard ownership (`source != null` → hanya `delete row`).
  - `app/display/[slug]/page.tsx`: item jadwal `sched-…` → `storage_path + source_announcement_id`; player hanya geser antrean, tidak `storage.remove`.
- **Manual 1x:** Jalankan `20261006_multirole.sql` → `20261007_announcer_ownership.sql` → `fix_profiles_rls.sql` di SQL Editor; verifikasi `select email,role,bidang from profiles`.
- **Build:** ✅ 14 routes

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
│   │   ├── 20261004_announcer.sql           # Migrasi antrean pengumuman bersuara
│   │   ├── 20261005_announcements.sql       # Migrasi master jadwal pengumuman
│   │   ├── 20261006_multirole.sql           # Migrasi multi-role (profiles, owner/bidang, RLS)
│   │   └── 20261007_announcer_ownership.sql # Migrasi ownership audio announcer (storage_path + source)
│   ├── fix_profiles_rls.sql                 # Fix rekursi RLS profiles (is_admin definer)
│   └── schema.sql                           # Skema DB lengkap (referensi instalasi baru)
├── lib/
│   ├── auth.ts                              # Helper role/bidang & guard
│   └── types.ts                             # Role/Bidang/Profile/Display/Playlist + Announcer ownership
├── proxy.ts                                 # Middleware auth (Next.js 16)
├── AGENTS.md                                # Aturan wajib untuk coding agent
└── progress.md                              # File ini
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

### [2026-10-08] Security Hardening — Pre-Launch Audit Fixes

- **Status:** ✅ Selesai (build hijau, npm audit 0 vulnerabilities)
- **Tujuan:** Menutup celah keamanan kritis dan tinggi hasil audit pre-launch sebelum deploy produksi.
- **File diubah / dibuat:**
  - `package.json` + `package-lock.json`: Upgrade `next` → `^16.4.3`, `react` → `^19.3.1`, `react-dom` → `^19.3.1`. `npm audit fix --force` menghapun semua vulnerabilitas (`sharp`, `source-map-js`, `zod`).
  - `lib/rate-limit.ts` (baru): Rate limiter sederhana berbasis `lru-cache` untuk API routes.
  - `lib/sanitize.ts` (baru): Helper sanitasi XSS menggunakan `isomorphic-dompurify` (`sanitizeText`, `sanitizeYouTubeId`, `sanitizeUrl`).
  - `next.config.ts`: Menambahkan security headers global — `Content-Security-Policy`, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, dan `Strict-Transport-Security` (production).
  - `lib/supabase/server.ts`, `lib/supabase/client.ts`, `proxy.ts`: Cookie session flags `httpOnly`, `sameSite: "strict"`, `secure` di production, `maxAge` 7 hari, `path: "/"`. Security headers dasar juga di-set di `proxy.ts`.
  - `app/api/admin/create-user/route.ts`, `app/api/admin/users/route.ts`, `app/api/admin/users/[id]/route.ts`, `app/api/time/route.ts`: Rate limiting per IP; error message generik ke client; detail error hanya di server log.
  - `app/login/page.tsx`: Client-side brute-force lockout — 5x gagal → blokir 1 menit.
  - `app/display/page.tsx`: Pairing code lockout — 5x salah → blokir 1 menit; input menerima 8 karakter alfanumerik.
  - `lib/utils.ts`: `generatePairingCode()` diganti dari 6 digit `Math.random()` menjadi 8 karakter alfanumerik dengan `crypto.getRandomValues()`; `generateSlug()` menggunakan `crypto.randomUUID()`; `parseYouTubeUrl()` membatasi domain allowlist; `youtubeEmbedUrl()` dan `playerUrlFor()` menggunakan `encodeURIComponent`.
  - `components/AgendaTable.tsx`, `components/EmergencyOverlay.tsx`: Output teks (title, message, columns, rows) disanitasi dengan `sanitizeText`.
  - `app/dashboard/emergency/page.tsx`: Input title & message dibatasi (120 / 1000 karakter) dan disanitasi sebelum disimpan.
  - `app/dashboard/media/page.tsx`, `components/EditMediaModal.tsx`: Tabel konten (title, columns, rows) disanitasi sebelum insert/update.
  - `app/dashboard/announcer/page.tsx`: Label schedule & broadcast disanitasi dan dibatasi 100 karakter.
  - `components/SlideStage.tsx`: YouTube iframe ditambahkan `sandbox="allow-scripts allow-same-origin allow-presentation"` dan `loading="lazy"`.
  - `app/display/[slug]/page.tsx`, `components/SystemClock.tsx`, `components/SlideStage.tsx`: `console.error`/`console.warn` tidak lagi menampilkan objek error lengkap ke browser.
  - `components/SignOutButton.tsx`: Logout sekarang memanggil API route `POST /api/auth/signout` (server-side signOut) + hard navigation ke `/login`.
  - `app/api/auth/signout/route.ts` (baru): API route server-side untuk menghapus session Supabase secara tepat.
- **Catatan teknis:**
  - Cookie name custom `sb-session` dihapus karena menyebabkan mismatch antara browser client dan server/middleware, yang membuat login stuck setelah perubahan cookie flags.
  - Logout yang awalnya tidak berfungsi disebabkan oleh client-side `supabase.auth.signOut()` tidak memicu penghapusan cookie di server; solusi dengan dedicated API route + hard navigation.
  - `npm audit` setelah fix: **0 vulnerabilities**.
- **Build:** ✅ 15 routes

---

### [2026-10-25] FIX: Video CDN tidak bisa diputar (Content Security Policy)

- **Status:** Selesai (build hijau)
- **Gejala:** Video dari link CDN tampil blank hitam di player TV. Thumbnail video CDN yang sama **tampil normal** di halaman Konten Media.
- **ROOT CAUSE:** `media-src` pada header CSP di `next.config.ts` hanya mengizinkan `self` + `*.supabase.co`. Domain CDN (mis. `cdn.knwng.my.id`) diblokir **browser** sebelum request dikirim. Bukan bug kode player sama sekali.
- **Mengapa menyesatkan:**
  - <img> diatur `img-src` (permisif) sehingga thumbnail lolos, sedangkan <video> diatur `media-src` (ketat) sehingga terblokir.
  - CSP baru masuk saat Security Hardening (2026-10-08), sehingga sebelumnya link CDN memang berjalan normal.
  - Blokir terjadi di layer browser, jadi tidak ada error di server maupun log aplikasi.
- **Kontradiksi desain:** Aplikasi ini secara resmi mendukung fitur "CDN link generik" (lihat AGENTS.md), tetapi CSP sejak awal memblokirnya. Fitur tersebut tidak pernah benar-benar berfungsi.
- **Perbaikan:**
  - `next.config.ts`: `media-src 'self' https://*.supabase.co` -> `media-src 'self' blob: data: https:`
  - `https:` = izinkan semua CDN via HTTPS (sesuai desain CDN link generik; tidak perlu ubah saat ganti domain). `blob:` untuk preview upload (URL.createObjectURL), `data:` untuk media inline. Tetap menolak `http:` dan skema berbahaya.
- **Catatan wajib setelah deploy:** Header CSP di-cache browser. Restart server/redeploy lalu **hard refresh** di TV (Ctrl+Shift+R) atau gunakan tombol "Lepas pasangan" agar header baru terpakai.
- **Pelajaran (PENTING):**
  1. Baca **Console browser** lebih dulu. Pesan `violates the following Content Security Policy directive` langsung menunjuk penyebab.
  2. Petunjuk pembeda gejala ("A tampil, B tidak") adalah kunci diagnosis. Thumbnail tampil + video tidak = masalahnya di level **izin resource**, bukan kode player.
  3. Jika perbaikan tidak mengubah gejala apa pun, **berhenti menebak** dan cari bukti baru (Console / Network tab / header response).
- **Build:** OK
---

### [2026-10-26] FIX: Video terpotong & blank hitam saat transisi playlist

- **Status:** Selesai (build hijau, lint baseline tetap 35)
- **Gejala 1:** Video (khususnya dari CDN) berganti ke konten berikutnya sebelum durasinya selesai — terpotong di tengah jalan.
- **Gejala 2:** Saat looping dari konten terakhir kembali ke konten pertama, muncul glitch: visual konten pertama -> blank hitam -> baru normal.
- **ROOT CAUSE #1 (durasi):** `app/display/[slug]/page.tsx` memasang `setTimeout(advance, 30_000)` tanpa syarat untuk SEMUA video tanpa `duration_override`. Timer tidak tahu apakah video sedang berputar atau macet, jadi video sehat berdurasi panjang selalu dipotong di detik ke-30. (Regresi dari perubahan sebelumnya yang menurunkan cadangan 3 menit -> 30 detik.)
- **ROOT CAUSE #2 (transisi):** Crossfade berbasis `opacity` — lapis lama memudar habis sementara video baru belum punya frame pertama -> layar kosong. Diperparah `zIndex` yang berubah seketika bersamaan dengan animasi opacity (memicu re-compositing; di Android TV menghasilkan 1-2 frame hitam). Selain itu status "ready" di-reset saat looping sehingga crossfade menunggu dari nol.
- **Perbaikan #1 — Watchdog durasi berbasis progres:**
  - `app/display/[slug]/page.tsx`: ganti timer tanpa syarat dengan `setInterval` 1 detik yang memeriksa `currentTime` video aktif.
  - Video dianggap sehat selama `currentTime` terus maju -> tidak pernah dipotong.
  - `advance()` hanya dipanggil bila macet >= 30 detik (CDN stall / decoder mati).
  - Prop baru `onActiveVideoChange` pada `SlideStage` -> pemutar induk membaca elemen `<video>` yang SEDANG tayang (bukan lapis prefetch).
- **Perbaikan #2 — Penukaran instan (tanpa crossfade):**
  - `components/SlideStage.tsx` ditulis ulang: `displayed` + `staged` (dulu `displayed` + `incoming` + `incomingVisible`).
  - Hapus semua `opacity`/`transition`/`zIndex` dinamis; lapis prefetch disembunyikan via `visibility: hidden`.
  - Konten lama tetap terlihat PENUH sampai konten baru dijamin punya frame (`readyState >= 2` atau event `playing`), lalu ditukar dalam satu batch React (`swapIn()`).
  - Failsafe dinaikkan 3 dtk -> 8 dtk, diposisikan sebagai jaring terakhir.
  - Status ready tidak lagi di-reset saat looping -> item hasil prefetch langsung ditukar tanpa menunggu.
- **Keputusan desain FINAL:** Player TV memakai **penukaran instan, bukan crossfade**. Crossfade berbasis opacity terbukti menyebabkan blank hitam pada video CDN besar dan tidak boleh dihidupkan kembali tanpa pengujian matang di TV.
- **Catatan cache video (hasil analisis):**
  - Metadata playlist di-query Supabase **sekali** per perubahan `activePlaylistId`; looping tidak memicu query ulang.
  - `<video>` memakai `key={media.url}` -> elemen dibuat baru tiap giliran, tetapi request dilayani **HTTP cache browser** berkat header CDN (`Cache-Control: max-age=14400` + `ETag`) -> bukan download ulang penuh setiap putaran.
  - `localStorage` TIDAK dipakai untuk video (hanya menyimpan slug pairing).
- **Build:** OK - **Lint:** 35 problems (baseline, tidak ada masalah baru)

_Terakhir diperbarui: 2026-10-26_
