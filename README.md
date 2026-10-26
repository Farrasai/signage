# Siaran — Digital Signage CMS

CMS untuk mengelola TV / video wall dari mana saja: pilih foto, video, atau
playlist YouTube; atur durasi tiap konten; jadwalkan per hari & jam; kendalikan
layar dari jarak jauh (refresh, next/prev, jeda); tampil fullscreen lengkap
dengan teks berjalan (marquee) di footer.

- **Frontend & backend app**: Next.js 16 (App Router) — siap deploy ke **Vercel**
- **Database, auth, storage/CDN, realtime**: **Supabase** (free tier, cukup untuk skala kecil–menengah)

Tidak ada server tambahan yang perlu dikelola.

---

## 1. Struktur Codebase

```
app/
  api/
    admin/
      create-user/route.ts        POST buat auth user + baris profiles (service_role)
      users/route.ts              GET daftar user + profil (pagination)
      users/[id]/route.ts         PATCH / DELETE user
    auth/signout/route.ts         POST logout server-side (hapus cookie session)
    time/route.ts                 GET waktu server (dipakai TV untuk sinkronisasi jam)
  dashboard/                      panel kontrol (butuh login)
    layout.tsx                    guard session + fetch profile + DashboardShell
    page.tsx                      Ringkasan (stat cards, activity log, remote control)
    displays/page.tsx             Kelola layar & kode pairing
    media/page.tsx                Perpustakaan konten (upload / CDN / YouTube / tabel)
    playlists/page.tsx            Daftar playlist
    playlists/[id]/page.tsx       Susun urutan & durasi item playlist
    schedules/page.tsx            Jadwal playlist per layar & hari/jam
    announcer/page.tsx            Pengumuman suara + jadwal pengumuman (admin)
    emergency/page.tsx            Siaran darurat (admin)
    users/page.tsx                Manajemen user (admin)
  display/page.tsx                Halaman publik pairing (masukkan kode PIN)
  display/[slug]/page.tsx         Player fullscreen TV (anon)
  login/page.tsx                  Login admin/operator
  globals.css                     Token warna Tailwind v4 + animasi marquee
  layout.tsx                      Root layout + script anti-flash tema
  page.tsx                        Root page

components/
  AgendaTable.tsx                 Render konten bertipe tabel (shared player + dashboard)
  AnnouncerBadge.tsx              Badge pengumuman saat audio aktif (player TV)
  DashboardShell.tsx              Shell layout dashboard (sidebar + header)
  EditMediaModal.tsx              Modal edit konten media
  EmergencyOverlay.tsx            Overlay siaran darurat (shared)
  KpiCard.tsx                     Kartu statistik halaman Ringkasan
  Modal.tsx                       Modal generik (Escape untuk tutup, role=dialog)
  PageHeader.tsx                  Judul halaman (single source di sticky header)
  Pagination.tsx                  Pagination bernomor
  RemoteControls.tsx              Tombol remote control layar
  Sidebar.tsx                     Navigasi dashboard + badge jumlah
  SignOutButton.tsx               Tombol logout
  SlideStage.tsx                  Mesin render + prefetch konten (shared)
  StatusDot.tsx                   Indikator online/offline layar
  StatusPill.tsx                  Pill status
  SystemClock.tsx                 Jam real-time (offset dari /api/time)
  ThemeToggle.tsx                 Toggle light/dark

lib/
  auth.ts                         Helper role & bidang (isAdmin, canEditDisplay, dst.)
  rate-limit.ts                   Rate limiter in-memory (LRU) untuk API routes
  sanitize.ts                     Sanitasi teks/URL/YouTube ID (isomorphic-dompurify)
  toast/index.tsx                 Toast provider + useToast + queueToast
  types.ts                        Semua type & konstanta domain
  utils.ts                        Slug, pairing code, YouTube URL, jadwal, format
  supabase/client.ts              Supabase client (browser)
  supabase/server.ts              Supabase client (server, cookie-based)

supabase/                         (di-.gitignore — lihat catatan di bawah)
  schema.sql                      Skema referensi lengkap untuk instalasi baru
  migrations/                     Migrasi inkremental
  fix_profiles_rls.sql            Perbaikan rekursi RLS pada profiles

proxy.ts                          Middleware Next.js 16 (export proxy()), auth + role guard
next.config.ts                    Security headers & CSP
AGENTS.md                         Aturan wajib untuk coding agent
DESIGN.md                         Sistem desain (token warna, radius, tipografi)
PRD-Siaran-Digital-Signage.md     Dokumen produk lengkap
progress.md                       Riwayat task
```

> **Catatan**: folder `supabase/` saat ini **tidak ter-commit** ke repository karena
> tercantum di `.gitignore`. Direktori tersebut harus tersedia di mesin yang menjalankan
> migrasi; kalau tidak ada, struktur tabel mengikuti `progress.md` dan dokumen ini.

## 2. Siapkan Supabase (gratis)

1. Buat project baru di [supabase.com](https://supabase.com) (paket Free sudah cukup).
2. Buka **SQL Editor** lalu jalankan skema. Untuk instalasi baru: tempel seluruh isi
   `supabase/schema.sql` -> **Run**. Untuk database yang sudah berjalan, jalankan
   migrasi secara berurutan:
   - `migrations/20261004_announcer.sql` — antrean pengumuman suara
   - `migrations/20261005_announcements.sql` — master jadwal pengumuman
   - `migrations/20261006_multirole.sql` — tabel `profiles`, kolom `owner_id`/`bidang`, RLS multi-role
   - `migrations/20261007_announcer_ownership.sql` — `storage_path` + `source_announcement_id`
   - `fix_profiles_rls.sql` — perbaiki rekursi RLS pada `profiles`

   Semua migrasi idempotent (`if not exists` / `drop policy if exists`).
3. Buka **Authentication -> Users -> Add user**, buat akun admin (email + password).
   Aplikasi ini tidak punya halaman "daftar" publik.
4. Set role di tabel `profiles` (baris dibuat otomatis oleh trigger `handle_new_user()`):

   ```sql
   -- Admin (akses penuh)
   update profiles set role = 'admin', bidang = null where email = 'admin@contoh.id';

   -- Operator bidang (pilih: TU, INTEL, BIN, PIDSUS, PIDUM, DATUN, PAPBB)
   update profiles set role = 'operator_bidang', bidang = 'PIDUM' where email = 'op@contoh.id';

   -- Verifikasi
   select email, role, bidang from profiles;
   ```

   User yang dibuat lewat halaman **Manajemen User** di dashboard sudah otomatis
   lengkap (role + bidang), jadi langkah ini hanya perlu untuk akun pertama.
5. Buka **Project Settings -> API**, salin:
   - `Project URL` -> `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public key` -> `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Role & hak akses

| Role | Akses |
| --- | --- |
| `admin` | Semua halaman: dashboard, layar, konten, playlist, jadwal, **pengumuman suara**, **siaran darurat**, **manajemen user** |
| `operator_bidang` | Dashboard, layar, konten, playlist, jadwal — dibatasi ke data miliknya sendiri atau se-bidang. Akses ke announcer/emergency/users ditolak (redirect ke `/dashboard`) |

Bidang yang tersedia: `TU`, `INTEL`, `BIN`, `PIDSUS`, `PIDUM`, `DATUN`, `PAPBB`.

## 3. Jalankan lokal (opsional)

```bash
npm install
cp .env.example .env.local   # isi dengan nilai dari langkah 2.4
npm run dev
```

Buka `http://localhost:3000` -> otomatis diarahkan ke halaman login.

Perintah lain:

```bash
npm run build    # production build
npm start        # jalankan hasil build
npm run lint     # eslint
```

## 4. Deploy ke Vercel

1. Push folder ini ke repository GitHub/GitLab, lalu import ke
   [vercel.com/new](https://vercel.com/new). **Atau** pakai CLI: `npx vercel`.
2. Saat setup, tambahkan Environment Variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Deploy. Dashboard bisa diakses dari mana saja, dan setiap TV tinggal membuka
   URL layarnya masing-masing.

> API route admin (`/api/admin/*`) memakai `service_role` untuk membuat/menghapus user.
> Key tersebut hanya dipakai di sisi server dan tidak memakai prefix `NEXT_PUBLIC_`.

## 5. Memasang TV / video wall

1. Di dashboard -> **Layar & TV** -> **Tambah layar** -> beri nama (mis. "TV Lobby").
   Sistem menampilkan **kode pairing** (8 karakter alfanumerik, berlaku 30 menit).
2. Di perangkat TV, buka `/display` -> masukkan kode pairing -> TV tersimpan dan otomatis
   diarahkan ke player layarnya. Tidak perlu mengetik URL panjang pakai remote.
   (Alternatif: buka langsung `https://domain-anda.vercel.app/display/nama-slug`.)
3. Untuk hasil terbaik dan agar berjalan 24/7 tanpa gangguan:
   - Gunakan aplikasi kiosk browser seperti **Fully Kiosk Browser** (Android TV box),
     atau jalankan Chrome dengan flag `--kiosk https://domain-anda.vercel.app/display/slug`
     di mini PC/PC yang disambungkan ke TV lewat HDMI.
   - Aktifkan "Launch on boot" di aplikasi kiosk agar otomatis menyala saat TV dinyalakan.
   - Halaman memakai **Wake Lock** agar layar tidak tidur, dan ada tombol fullscreen
     kecil di pojok. Fullscreen tidak dipicu otomatis saat load: browser memblokir
     tanpa interaksi pengguna dan efeknya terasa mengagetkan.
4. Tambahkan konten di **Konten Media** (upload foto/video, tempel link CDN, atau link
   YouTube), susun jadi **Playlist**, lalu pasang playlist itu ke layar di halaman
   **Layar & TV**. Perubahan tersiar ke TV dalam hitungan detik lewat Supabase Realtime —
   tidak perlu refresh manual di TV.

## 6. Fitur & perilaku

- **Jenis konten**: `image`, `video`, `youtube_video`, `youtube_playlist`, `table`
  (tabel agenda). Konten disimpan di satu tabel `media` dengan kolom `type`.
- **Sumber konten**: upload ke Supabase Storage (bucket `media`), **link CDN generik**
  (Cloudinary, Bunny, server sendiri), atau URL YouTube.
- **Resolusi**: tampilan menyesuaikan ukuran layar (Full HD 1080p ke atas); foto/video
  mengisi penuh layar (`object-fit: cover`).
- **Durasi konten**: setiap item punya durasi tampil (detik) yang bisa ditimpa per-item
  di dalam playlist (`duration_override`). Video yang diunggah lanjut ke konten
  berikutnya saat videonya selesai, dipantau lewat **watchdog berbasis progres**:
  `currentTime` video aktif diperiksa tiap detik, dan konten hanya di-skip bila
  `currentTime` tidak maju selama 30 detik. Video sehat tidak pernah dipotong timer.
- **YouTube**: memakai embed (tanpa API key, tanpa kuota), sehingga durasi tidak
  terdeteksi otomatis — atur manual saat menambahkan.
- **Transisi**: player memakai **penukaran instan**, bukan crossfade. Konten lama tetap
  terlihat penuh sampai konten baru dipastikan punya frame, lalu ditukar sekaligus.
  Crossfade berbasis opacity pernah menyebabkan layar blank hitam pada video CDN besar.
- **Remote control**: tombol refresh / next / prev / jeda di dashboard mengirim perintah
  lewat Supabase Realtime ke layar yang sedang terbuka, di mana pun lokasinya.
- **Jadwal**: jika ada jadwal yang cocok dengan hari & jam saat ini, playlist jadwal
  dipakai; jika tidak, layar kembali ke playlist default. Evaluasi memakai waktu
  **server** (offset dari `/api/time`), bukan jam perangkat TV yang sering keliru.
- **Pengumuman suara** (admin): audio mp3/wav/ogg diputar FIFO tanpa mengganggu konten
  visual, bisa siaran langsung atau dijadwalkan (`announcements`). Evaluasi jadwal
  berjalan di sisi browser TV, tanpa cron server.
- **Siaran darurat** (admin): overlay layar penuh. Penutupan **hanya** dari dashboard
  admin — keputusan produk yang disengaja.
- **Mode gelap**: light mode sebagai default, toggle tersedia di footer sidebar;
  preferensi disimpan di `localStorage`.
- **Status online**: TV mengirim heartbeat tiap 25 detik; layar dianggap online bila
  heartbeat terakhir kurang dari 60 detik.

---

## 7. Keamanan

- **RLS multi-role**: player TV (anonim) hanya bisa `SELECT` konten dan memperbarui
  `last_seen` pada baris layarnya sendiri. `INSERT/UPDATE/DELETE` konten dibatasi untuk
  user terautentikasi, dan pada tabel ber-`owner_id`/`bidang` hanya pemilik, se-bidang,
  atau admin. Tabel announcer, emergency, dan remote command: **admin only**.
- **Pairing code**: tabel `display_pairing_codes` **tidak** punya policy `SELECT` untuk
  anon. Kode hanya bisa ditukar lewat RPC `redeem_pairing_code()` (`SECURITY DEFINER`),
  karena anon key ter-embed di client.
- **Session cookie**: `httpOnly`, `sameSite=strict`, `secure` di production, `maxAge` 7 hari.
- **Rate limiting** pada API routes (`lib/rate-limit.ts`) plus lockout sisi client setelah
  beberapa percobaan gagal (login & pairing).
- **Sanitasi XSS** (`lib/sanitize.ts`): semua teks yang dirender ke layar (judul, isi
  pengumuman, tabel agenda) dibersihkan dengan `isomorphic-dompurify`. URL YouTube
  dibatasi allowlist domain.
- **Security headers** di `next.config.ts`: CSP, `X-Frame-Options`, `X-Content-Type-Options`,
  `Referrer-Policy`, `Permissions-Policy`, dan HSTS (production).

## 8. Link CDN video & Content Security Policy (PENTING)

Aplikasi ini mendukung **link CDN generik** untuk foto/video (Cloudinary, Bunny,
server sendiri, dll) selain upload ke Supabase Storage.

Agar video dari domain luar bisa diputar, header CSP di `next.config.ts` **harus**
mengizinkan domain tersebut pada direktif `media-src`. Saat ini diset:

```
media-src 'self' blob: data: https:
```

- `https:` -> semua CDN via HTTPS diizinkan (tidak perlu diubah saat ganti provider).
- `blob:` -> untuk preview upload (`URL.createObjectURL`).
- `data:` -> untuk media inline.

**Jangan pernah mempersempit `media-src` hanya ke `'self'` + Supabase** tanpa
menambahkan domain CDN, karena video CDN akan **blank hitam** di player TV padahal
thumbnail-nya tetap tampil di dashboard (thumbnail diatur `img-src`, bukan
`media-src`). Ini pernah terjadi dan sangat membingungkan karena tidak ada error
di server maupun log aplikasi.

Untuk mengecek cepat: buka player TV, tekan F12 lalu tab **Console**. Jika muncul pesan
tentang `violates the following Content Security Policy directive` pada
`media-src`, berarti domain CDN belum diizinkan.

Setelah mengubah CSP, **restart server** dan **hard refresh** browser TV (Ctrl+Shift+R)
karena header CSP di-cache browser.

---

## 9. Catatan pengembangan

Detail aturan lengkap ada di `AGENTS.md`. Yang paling sering terlewat:

- Middleware **wajib** bernama `proxy.ts` dengan export `proxy()` (bukan `middleware.ts`).
- `app/display/page.tsx` (pairing) dan `app/display/[slug]/page.tsx` (player) adalah
  dua file berbeda — jangan tertukar.
- Komponen `SlideStage.tsx`, `AgendaTable.tsx`, `EmergencyOverlay.tsx` dipakai bersama
  oleh player **dan** preview dashboard — jangan duplikasi logic render.
- Setiap migrasi baru harus idempotent, ditaruh di `supabase/migrations/`, dan
  disinkronkan ke `supabase/schema.sql`.
- Sebelum menganggap selesai, jalankan `npm run build` dan `npx eslint . --max-warnings=999`.
