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
  migrations/                     Migrasi inkremental (5 file - lihat bagian 2)
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
   - `migrations/20261026_announcer_storage_fix.sql` - policy Storage bucket `announcer`: SELECT publik, INSERT/DELETE authenticated. Wajib dijalankan bila upload audio gagal dengan `new row violates row-level security policy`.
   - `migrations/20261027_heartbeat_rpc.sql` — mencabut policy `update using (true)` untuk anon pada `displays` & `remote_commands`, lalu menambah RPC `touch_display` + `ack_remote_command`. **Wajib**; tanpa migrasi ini siapa pun bisa mengubah semua layar lewat anon key.
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
   - Halaman memakai **Wake Lock** agar layar tidak tidur. Tombol **⛶ Layar penuh** hanya
     muncul bila viewport belum memenuhi layar — jadi di APK/WebView/PWA tombol itu
     otomatis tidak tampil, sementara di Chrome kiosk & Fully Kiosk tetap tersedia.
   - **Khusus APK/WebView:** `navigator.wakeLock` sering tidak tersedia, sehingga Wake Lock
     gagal senyap. Tambahkan `FLAG_KEEP_SCREEN_ON` di sisi Android (`getWindow().addFlags(
     WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)`) supaya layar tidak tidur.
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
- **Konten tabel (agenda)**: kolom dan baris disusun dari dashboard (bisa tempel dari Excel). Di layar TV dirender oleh `components/AgendaTable.tsx` dengan tema **terang**: latar putih, header `emerald-600` solid + teks putih **bold**, isi sel `slate-900` **bold**, zebra `emerald-50`. **Ukuran font dihitung otomatis agar tabel SELALU FIT** (auto-fit terukur: tinggi panel diukur, font diperkecil bertahap sampai muat) — bukan angka `rem` tetap, karena Smart TV sering melaporkan CSS viewport hanya 540–720px sehingga tabel jadi kebesaran dan terpotong.
- **Toast notification**: setiap aksi (login/logout, tambah/edit/hapus layar, konten, playlist, jadwal, pengumuman suara, user) memberi umpan balik sukses/gagal lewat `lib/toast`. Untuk logout dipakai `queueToast()` agar pesan tampil setelah pindah ke halaman login.
- **Pengumuman suara - dua mode**: tab **Jadwal Pengumuman** (otomatis pada jam & hari tertentu) dan tab **Siaran Langsung** (langsung masuk antrean TV). Tombol tambah selalu tersedia di toolbar kanan atas.

---

## 7. Keamanan

- **RLS multi-role**: player TV (anonim) hanya bisa `SELECT` konten; ia **tidak** punya
  policy `UPDATE` pada tabel apa pun. Heartbeat (`displays.last_seen`) dan ACK perintah
  remote (`remote_commands.executed`) ditulis lewat dua RPC `SECURITY DEFINER`
  (`touch_display`, `ack_remote_command`) yang masing-masing hanya menyentuh satu kolom.
  `INSERT/UPDATE/DELETE` konten dibatasi untuk user terautentikasi, dan pada tabel
  ber-`owner_id`/`bidang` hanya pemilik, se-bidang, atau admin. Tabel announcer, emergency,
  dan remote command: **admin only**.
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
- **RLS Storage terpisah dari RLS tabel**: policy tabel tidak berlaku untuk file. Bucket `media` dan `announcer` masing-masing punya 3 policy di `storage.objects` (SELECT publik untuk player TV anonim, INSERT/DELETE untuk `authenticated`). Jika policy ini hilang, upload gagal dengan `new row violates row-level security policy` - lihat bagian 10.

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
- Sebelum menganggap selesai, jalankan `npm run build` dan `npx eslint . --max-warnings=999`. Baseline lint saat ini **20 problems** - jangan menambah.
- Jangan menghidupkan kembali crossfade opacity di `SlideStage.tsx`, memasang timer `advance()` tanpa syarat, mempersempit `media-src`, atau mengembalikan `AgendaTable` ke tema gelap. Semua itu sudah terbukti menimbulkan bug.
- Tombol aksi (CREATE) wajib permanen di toolbar, bukan hanya di empty-state. Setiap `useState` untuk tab wajib punya pemanggil `setX` - kalau tidak, UI-nya mati.

---

## 10. Pemecahan masalah (gejala -> penyebab -> lokasi)

Bug di aplikasi ini beberapa kali **bukan** di tempat yang terlihat. Baca Console browser (F12) lebih dulu.

| Gejala | Penyebab | Perbaikan di |
| --- | --- | --- |
| Video CDN blank hitam, thumbnail di dashboard tetap tampil | CSP `media-src` memblokir domain CDN | `next.config.ts` (bagian 8) |
| Video berganti sebelum durasinya habis | Timer `advance()` dipasang tanpa syarat | `app/display/[slug]/page.tsx` (watchdog progres) |
| Blank hitam / glitch saat transisi & looping | Crossfade opacity + `zIndex` dinamis | `components/SlideStage.tsx` (penukaran instan) |
| Upload audio: `new row violates row-level security policy` | Policy bucket di `storage.objects` belum ada | migrasi `20261026_announcer_storage_fix.sql` |
| Tombol tambah (CREATE) hilang setelah ada data | Tombol hanya dirender di empty-state | halaman dashboard terkait (pindah ke toolbar) |
| Tab/fitur tidak bisa dibuka sama sekali | `setState` untuk tab tidak pernah dipanggil | halaman dashboard terkait |
| Tabel agenda TV tidak terbaca | Teks transparan di atas latar gelap | `components/AgendaTable.tsx` (tema terang) |
| Tabel agenda TV terpotong, harus di-scroll | Font `rem` tetap tidak melihat tinggi panel (TV lapor 540–720px) | `components/AgendaTable.tsx` (auto-fit terukur) |
| Baris terakhir tabel / bawah video tertutup | Marquee `z-20` menimpa `player-stage` | `app/display/[slug]/page.tsx` (`bottom-12 sm:bottom-14`) |
| Tombol ⛶ tidak hilang walau diklik di APK | `requestFullscreen()` tidak berefek di WebView, `catch` menelannya | `lib/use-already-fullscreen.ts` (tombol disembunyikan bila viewport sudah penuh) |
| UI TV membeku/blank | `backdrop-blur` di elemen overlay | tombol overlay player, `EmergencyOverlay.tsx` |
| Video CDN blank saat looping, putaran pertama normal | Decoder hardware bocor: `VideoLayer` tidak melepas elemen `<video>` saat unmount | `components/SlideStage.tsx` (cleanup `removeAttribute("src")` + `load()`) |
| Video besar butuh waktu lama / hitam 8 dtk | Tukar-paksa terlalu cepat untuk video | `components/SlideStage.tsx` (`READY_TIMEOUT_VIDEO_MS = 25000`) |
| Video gagal tanpa pesan apa pun | `onError` sengaja tidak memanggil skip, jadi senyap | buka player dengan `?debug=1` (badge diagnostik) |

### Membaca diagnostik video di TV

Buka `https://domain-anda/display/nama-slug?debug=1`. Badge kecil di kiri atas menampilkan
kegagalan video terakhir: `DECODE` (3) = decoder menolak, `NETWORK` (2) = unduhan gagal,
`SRC_NOT_SUPPORTED` (4) = codec tidak didukung WebView, `ABORTED` (1) = normal saat transisi.
Tanpa `?debug=1` badge tidak pernah muncul.

### Cara membedakan error RLS storage vs RLS tabel

- **RLS storage**: gagal **saat upload**, pesan **tidak** menyebut nama tabel -> policy `storage.objects` untuk bucket tersebut.
- **RLS tabel**: file sudah ter-upload, gagal saat `insert`, pesan menyebut tabelnya (mis. `announcements`) -> periksa role/bidang user.

### Setelah mengubah CSP atau kode player

Header CSP dan bundle JS di-cache browser. Wajib **restart server/redeploy** lalu **hard refresh** di TV (`Ctrl+Shift+R` atau tombol **Lepas pasangan**) agar perubahan berlaku.

