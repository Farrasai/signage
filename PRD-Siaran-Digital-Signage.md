# Product Requirements Document (PRD)
## Siaran — Digital Signage CMS

| | |
|---|---|
| **Produk** | Siaran — Digital Signage CMS |
| **Versi dokumen** | 1.0 |
| **Status** | Diimplementasikan & sudah deploy production |
| **Platform** | Web (Next.js) — dashboard admin + player fullscreen untuk TV/monitor |

---

## 1. Ringkasan Eksekutif

Siaran adalah sistem manajemen konten digital signage berbasis web yang memungkinkan satu admin mengelola banyak layar TV/video wall dari lokasi mana pun, tanpa perangkat lunak tambahan di sisi TV — cukup browser bawaan TV/Android TV box. Sistem mencakup manajemen konten (foto, video, tabel data, YouTube, CDN eksternal), penjadwalan otomatis berbasis waktu, kontrol jarak jauh secara realtime, mode darurat (pengumuman prioritas), serta mekanisme pemasangan (pairing) TV yang ramah remote control.

**Prinsip desain utama**: sederhana, murah/gratis untuk dioperasikan, dan siap pakai tanpa server tambahan yang perlu dikelola sendiri.

---

## 2. Latar Belakang & Masalah yang Diselesaikan

Kebutuhan awal: sebuah CMS digital signage yang lengkap namun ringkas, dengan kemampuan:
- Mengelola konten berdasarkan durasi tampil.
- Tampilan fullscreen dengan teks berjalan (marquee) di footer.
- Sumber konten fleksibel: unggahan sendiri (CDN), atau playlist YouTube.
- Lancar dijalankan di TV/monitor, mendukung resolusi Full HD 1080p.
- Siap deploy ke Vercel, dengan backend yang sederhana dan gratis.

Seiring pengembangan, muncul kebutuhan tambahan dari penggunaan nyata di lapangan:
- Operator perlu memasang banyak TV tanpa mengetik URL panjang di setiap unit.
- Perlu jalur komunikasi darurat yang bisa menimpa seluruh/tempat tertentu secara instan.
- Perlu konten non-visual (tabel agenda/pengumuman), bukan cuma foto/video.
- Perlu mengurangi biaya bandwidth (egress) dari pemutaran ulang (looping) konten yang sama terus-menerus.
- Perlu proses edit konten yang lengkap (bukan cuma tambah/hapus/atur durasi).

---

## 3. Tujuan (Goals)

1. Admin dapat mengelola seluruh siklus konten (upload/tautkan → susun playlist → jadwalkan → tayangkan) dari satu dashboard web, dari mana saja.
2. Perubahan yang dilakukan admin tersiar ke layar TV **secara realtime**, tanpa perlu me-refresh manual di TV.
3. Sistem berjalan **di atas layanan gratis/berbiaya rendah** (Vercel + Supabase free tier) untuk skala kecil–menengah.
4. Pemasangan TV baru **semudah mungkin** bagi operator lapangan yang hanya punya remote control TV.
5. Ada jalur komunikasi darurat yang **andal dan terpusat** (hanya bisa ditutup dari admin, bukan dari TV).
6. Pemutaran konten **hemat bandwidth** lewat caching browser, prefetch, dan transisi halus tanpa reload.

### Non-Goals (di luar cakupan versi ini)
- Analitik "proof-of-play" (laporan bukti tayang terperinci per detik/lokasi).
- Multi-tenant / multi-organisasi dengan isolasi data penuh antar klien.
- Manajemen pengguna berjenjang (role viewer/editor terpisah) — saat ini single admin role.
- Aplikasi native untuk Android TV/tvOS (saat ini murni berbasis browser web).
- Integrasi CDN video pihak ketiga otomatis (Cloudinary/Bunny/R2) di luar mekanisme "tempel link" manual.

---

## 4. Target Pengguna

| Peran | Kebutuhan |
|---|---|
| **Admin/Operator Pusat** | Mengelola konten, playlist, jadwal, dan seluruh layar dari satu tempat, termasuk saat tidak berada di lokasi fisik TV |
| **Teknisi/Operator Lapangan** | Memasang TV baru secepat dan semudah mungkin menggunakan remote control, tanpa akses ke dashboard admin |
| **Penonton (pengunjung/karyawan di lokasi TV)** | Melihat konten yang relevan, jelas, dan (saat darurat) mendapat informasi penting secara mencolok |

---

## 5. Arsitektur Sistem

```
┌─────────────────────┐        ┌───────────────────────────┐
│   Dashboard Admin    │◄──────►│                           │
│ (Next.js, /dashboard)│        │       Supabase             │
└─────────────────────┘        │  ┌─────────────────────┐  │
                                 │  │ Postgres (data)      │  │
┌─────────────────────┐        │  │ Auth (admin login)   │  │
│   Player TV          │◄──────►│  │ Storage (CDN foto/   │  │
│ (Next.js, /display)  │  Real- │  │   video upload)       │  │
└─────────────────────┘  time   │  │ Realtime (broadcast)  │  │
                                 │  └─────────────────────┘  │
                                 └───────────────────────────┘
```

- **Frontend & backend app**: Next.js (App Router), di-deploy ke **Vercel**. Satu basis kode untuk dashboard admin maupun halaman player TV.
- **Backend layanan**: **Supabase** (free tier) menyediakan:
  - **Postgres** — seluruh data terstruktur (layar, konten, playlist, jadwal, dst).
  - **Auth** — login admin (email/password), tanpa halaman pendaftaran publik (akun admin dibuat manual lewat Supabase Dashboard).
  - **Storage** — bertindak sebagai CDN untuk foto/video yang diunggah langsung, dengan `Cache-Control` 1 tahun.
  - **Realtime** — menyiarkan perubahan (playlist baru, perintah remote, status darurat) ke semua layar yang sedang terbuka, dalam hitungan detik.
- Tidak ada server backend kustom yang perlu di-hosting/di-maintain sendiri.

---

## 6. Model Data (Skema Database)

| Tabel | Fungsi |
|---|---|
| `displays` | Satu baris per layar TV: nama, `slug` (identitas URL), playlist default, teks marquee, status jeda, `last_seen` (heartbeat online/offline) |
| `media` | Perpustakaan konten: tipe (`image`, `video`, `youtube_video`, `youtube_playlist`, `table`), URL/konten, durasi tampil |
| `playlists` | Kumpulan/wadah urutan konten |
| `playlist_items` | Item di dalam playlist: urutan tampil, durasi override per-item |
| `schedules` | Aturan jadwal: layar mana memakai playlist mana, pada hari & jam berapa, dengan prioritas |
| `remote_commands` | Antrean perintah kontrol jarak jauh (refresh/next/prev/play/pause) per layar |
| `emergency_notice` | **Singleton** (selalu 1 baris) — status darurat aktif/tidak, judul, pesan, target layar (kosong = semua layar) |
| `display_pairing_codes` | Kode PIN sekali-pakai untuk pemasangan TV, dengan waktu kedaluwarsa |

**Keamanan tingkat baris (RLS)**:
- Layar TV (pengguna anonim, tanpa login) hanya boleh **membaca** konten yang relevan dan **memperbarui statusnya sendiri** (heartbeat, tandai perintah selesai).
- Semua operasi tulis/hapus konten hanya boleh dilakukan admin yang **login**.
- Kode pairing **sengaja tidak bisa dibaca langsung** oleh siapa pun lewat query biasa — hanya bisa ditukar lewat fungsi database khusus (`redeem_pairing_code`, `SECURITY DEFINER`) yang langsung menghanguskan kodenya setelah dipakai. Ini mencegah kode aktif "diintip" lewat anon key yang memang publik.

---

## 7. Rincian Fitur (Functional Requirements)

### 7.1 Autentikasi Admin
- Login email/password via Supabase Auth.
- Tidak ada pendaftaran mandiri — akun dibuat admin lewat Supabase Dashboard, menghindari akses tak sah ke panel kontrol.
- Semua rute `/dashboard/*` dilindungi middleware (proxy) yang mengalihkan ke `/login` bila belum autentikasi.

### 7.2 Manajemen Layar & TV (`/dashboard/displays`)
- Tambah/ubah nama layar, hapus layar.
- Setiap layar otomatis mendapat `slug` unik → URL publik `/display/{slug}`.
- Atur playlist default per layar.
- Atur teks marquee (berjalan) per layar, bisa diaktif/nonaktifkan.
- Indikator status **online/offline** (berdasar heartbeat `last_seen`, dianggap offline jika >60 detik tanpa kabar).
- **Kontrol jarak jauh**: tombol ⏮ (sebelumnya) ⏸/▶ (jeda/lanjut) ⏭ (berikutnya) ⟳ (refresh paksa) — dikirim lewat tabel `remote_commands` dan diterima layar via Realtime dalam hitungan detik.
- **Kode Pairing**: generate kode PIN 6 digit (berlaku 30 menit atau sampai dipakai sekali) untuk pemasangan TV via remote (lihat §7.8).

### 7.3 Manajemen Konten (`/dashboard/media`)
Empat cara menambah konten, dalam satu perpustakaan yang sama:

| Sumber | Cara kerja |
|---|---|
| **Unggah file** | Foto/video diunggah ke Supabase Storage (bertindak sebagai CDN), durasi video terdeteksi otomatis dari metadata |
| **YouTube** | Tempel link video atau playlist YouTube, admin mengatur durasi tampil manual (karena panjang video YouTube tak bisa dideteksi tanpa API key) |
| **Link CDN eksternal** | Tempel URL langsung ke file foto/video dari CDN mana pun (Cloudinary, Bunny, S3, dll.) — jenis kontennya otomatis ditebak dari ekstensi URL |
| **Tabel (Agenda/Pengumuman)** | Builder tabel dengan kolom kustom (default: No., Agenda, Waktu dan Tempat, Keterangan), data bisa diisi manual atau **tempel sekaligus** dari Excel (tab-separated) / CSV (koma-separated) |

- **Edit menyeluruh**: tiap konten bisa diedit ulang (nama, durasi, URL/link, isi tabel, atau ganti file untuk unggahan) — bukan cuma durasi seperti versi awal.
- Hapus konten otomatis membersihkan file terkait di Storage (khusus unggahan sendiri, bukan link eksternal).

### 7.4 Manajemen Playlist (`/dashboard/playlists`)
- Buat/hapus playlist, ganti nama.
- Tambah konten dari perpustakaan ke playlist, atur urutan (naik/turun), timpa durasi per-item (opsional, beda dari durasi default konten).

### 7.5 Penjadwalan (`/dashboard/schedules`)
- Tetapkan playlist tertentu ke layar tertentu, aktif pada hari (bisa pilih beberapa hari atau kosong = setiap hari) dan rentang jam tertentu.
- Mendukung prioritas untuk jadwal yang tumpang tindih.
- Jika tak ada jadwal yang cocok dengan waktu sekarang, layar kembali memakai playlist default-nya.

### 7.6 Pemutar TV Fullscreen (`/display/{slug}`)
- Tampilan fullscreen, otomatis menyesuaikan ukuran layar (mendukung Full HD 1080p+), `object-fit: cover`.
- Marquee (teks berjalan) di footer, kecepatan menyesuaikan panjang teks.
- **Prefetch & crossfade** (lihat §7.9) — transisi antar konten mulus, tanpa kedip hitam/reload.
- Tombol kecil "⛶ Layar penuh" (memicu Fullscreen API + Wake Lock, butuh satu klik/sentuh karena kebijakan browser) dan "↺ Lepas pasangan" (reset pairing).
- Heartbeat otomatis setiap ~25 detik agar dashboard tahu status online layar.

### 7.7 Pengumuman Darurat (`/dashboard/emergency`)
- Admin membuat judul + pesan darurat, memilih target: **semua layar** atau **layar tertentu** (multi-pilih, lengkap dengan status online tiap layar).
- Sekali tayang, overlay merah mencolok (ikon peringatan, badge "PERHATIAN URGENT", kotak pesan, jam publikasi) muncul **menimpa** apa pun yang sedang tayang di layar target — konten di baliknya tetap berjalan (tidak berhenti), hanya tertutup sementara secara visual.
- **Hanya bisa ditutup dari dashboard admin** — sengaja tidak ada tombol tutup di sisi TV, untuk menjaga konsistensi status di semua layar sekaligus.
- Tersiar via Realtime, sehingga aktif/nonaktif di semua layar target hampir bersamaan.

### 7.8 Pairing TV via Kode PIN (`/display`)
Dirancang khusus untuk TV yang dikendalikan remote control (Android TV/Smart TV browser), di mana mengetik URL/slug panjang sangat merepotkan:
1. Admin generate kode PIN 6 digit dari dashboard (per layar, berlaku 30 menit atau sekali pakai).
2. Operator membuka `/display` di TV (URL pendek, sekali saja), mengetik kode pakai remote.
3. Sistem menukar kode → slug lewat fungsi database aman (kode langsung hangus setelah dipakai — sesuai prinsip keamanan sekali-pakai).
4. Slug hasil pairing disimpan di **localStorage browser TV tersebut** — jadi TV "mengingat" identitasnya sendiri, bahkan setelah mati listrik/reboot, tanpa perlu mengetik ulang.
5. Tombol "↺ Lepas pasangan" di player memungkinkan reset bila TV itu suatu saat dipindah fungsi menjadi layar lain.

### 7.9 Optimasi Performa & Bandwidth
- **Cache browser**: unggahan ke Supabase Storage diberi header `Cache-Control` 1 tahun — pemutaran ulang (loop) konten yang sama tidak men-download ulang dari server.
- **Prefetch-next**: selagi satu konten tayang, konten berikutnya di playlist **dimuat diam-diam di lapis tersembunyi** di latar belakang, memanfaatkan seluruh sisa durasi tayang konten saat ini.
- **Crossfade, bukan hard-cut**: pergantian antar konten memakai transisi opacity 500ms antar dua lapis (bukan unmount-lalu-mount elemen), sehingga tidak ada kedip hitam/putih di antara slide — baik karena prefetch sudah menyiapkan kontennya, maupun sebagai fallback yang tetap halus.
- Fallback non-mulus (ganti langsung tanpa fade) hanya terjadi pada lompatan tak terduga (mis. tombol "prev" dari remote), yang jarang terjadi dan bukan bagian dari siklus loop otomatis.

---

## 8. Alur Pengguna Utama (User Flows)

### 8.1 Alur Admin — Menyiapkan Layar Baru
```
Login dashboard
  → Layar & TV: buat layar baru (dapat slug otomatis)
  → Konten: upload/tautkan foto, video, YouTube, atau buat tabel agenda
  → Playlist: buat playlist, tambahkan konten, atur urutan & durasi
  → Layar & TV: tetapkan playlist ke layar tsb
  → (opsional) Jadwal: atur playlist berbeda untuk jam/hari tertentu
  → Layar & TV: generate Kode Pairing untuk layar tsb
```

### 8.2 Alur Operator Lapangan — Memasang TV
```
Buka /display di browser TV (sekali saja)
  → Ketik kode PIN 6 digit dari admin (pakai remote)
  → Otomatis tersambung & tersimpan permanen di TV tsb
  → (di kunjungan berikutnya) TV langsung tampil konten tanpa input apa pun
```

### 8.3 Alur Darurat
```
Admin: Darurat → tulis judul & pesan → pilih target layar → Tayangkan
  → Overlay muncul di layar target dalam hitungan detik
  → Admin: Tutup Pengumuman di Semua Layar (saat situasi selesai)
  → Overlay hilang serentak, konten normal lanjut seperti semula
```

---

## 9. Keputusan Teknis & Alasannya

| Keputusan | Alasan |
|---|---|
| **Next.js + Vercel** | Deploy gratis (hobby tier), satu basis kode untuk dashboard & player, dukungan penuh App Router/Server Components |
| **Supabase sebagai backend tunggal** | Menggabungkan database, auth, storage (CDN), dan realtime dalam satu layanan gratis — menghindari kebutuhan mengelola server sendiri |
| **Realtime (bukan polling agresif)** | Perubahan admin perlu tersiar cepat ke banyak layar tanpa membebani server dengan polling terus-menerus |
| **Kode PIN untuk pairing (bukan sekadar slug)** | Slug yang acak & panjang sulit diketik lewat remote TV; PIN 6 digit angka jauh lebih ramah D-pad/remote |
| **PIN ditukar lewat RPC `SECURITY DEFINER`, bukan tabel biasa** | Anon key Supabase bersifat publik (ter-embed di JS) — kalau kode pairing bisa dibaca langsung lewat query tabel, siapa pun bisa mengintipnya tanpa perlu melihat layar TV secara fisik |
| **Prefetch + crossfade manual (bukan bergantung penuh ke cache browser)** | Cache browser saja tak selalu diandalkan di kiosk device yang kadang membersihkan cache saat reboot; prefetch aktif memastikan konten berikutnya benar-benar siap sebelum dibutuhkan |
| **Penutupan darurat hanya dari dashboard** | Mencegah inkonsistensi status antar layar bila penutupan bisa dilakukan sepihak dari satu TV |
| **Tidak memakai Telegram Bot API sebagai CDN video** *(dipertimbangkan, ditolak)* | Limit unduhan 20MB, link sementara (kedaluwarsa ~1 jam), token bot berisiko bocor di client, bukan CDN sungguhan, dan berisiko melanggar ToS/pemblokiran sepihak — terlalu berisiko untuk sistem 24/7 |

---

## 10. Persyaratan Non-Fungsional

- **Biaya operasional**: dirancang agar tetap berjalan di tier gratis Vercel + Supabase untuk skala kecil–menengah (banyak foto/video ukuran wajar).
- **Keandalan**: layar TV harus tetap menampilkan konten terakhir yang berhasil dimuat meski terjadi gangguan jaringan sesaat; heartbeat dipakai untuk pemantauan, bukan untuk menghentikan pemutaran.
- **Keamanan**: prinsip *least privilege* diterapkan lewat RLS — pengguna anonim (TV) hanya bisa membaca apa yang perlu ditayangkan dan memperbarui statusnya sendiri; seluruh operasi tulis/hapus konten dan data sensitif (kode pairing) dibatasi ke admin yang terautentikasi atau lewat fungsi database khusus.
- **Kompatibilitas perangkat**: harus berjalan lancar di browser TV/Android TV box dengan sumber daya terbatas — karenanya pendekatan bertumpu pada HTML/CSS/JS ringan, tanpa framework berat di sisi player.
- **Efisiensi bandwidth**: strategi caching + prefetch dirancang mengurangi biaya egress dari pemutaran berulang konten yang identik.

---

## 11. Struktur Proyek (Ringkas)

```
app/
├── login/                          Login admin
├── dashboard/                      Panel kontrol (butuh login)
│   ├── displays/                   Kelola layar, remote control, kode pairing
│   ├── media/                      Perpustakaan konten (4 jenis sumber)
│   ├── playlists/[id]/             Playlist & item-itemnya
│   ├── schedules/                  Jadwal per layar
│   └── emergency/                  Pengumuman darurat
├── display/
│   ├── page.tsx                    Halaman publik pairing PIN
│   └── [slug]/page.tsx             Pemutar fullscreen TV
components/
├── SlideStage.tsx                  Mesin crossfade + prefetch
├── AgendaTable.tsx                 Render tabel agenda fullscreen
├── EmergencyOverlay.tsx            Overlay darurat (dipakai TV & preview admin)
├── EditMediaModal.tsx              Modal edit konten (adaptif per jenis)
└── ...
lib/
├── types.ts                        Definisi tipe data
├── utils.ts                        Helper (slug, parsing YouTube/CSV, dsb.)
└── supabase/                       Klien Supabase (browser & server)
supabase/
├── schema.sql                      Skema lengkap untuk instalasi baru
└── migrations/                     Riwayat migrasi tambahan fitur
```

---

## 12. Ringkasan Riwayat Pengembangan

| Tahap | Fitur yang ditambahkan |
|---|---|
| 1 | CMS inti: dashboard, layar, konten (upload + YouTube), playlist, jadwal, remote control, marquee, fullscreen player |
| 2 | Perbaikan kompatibilitas Next.js 16 (`proxy.ts`), penanganan hydration akibat ekstensi browser |
| 3 | Jenis konten **Link CDN eksternal** |
| 4 | Jenis konten **Tabel** (agenda/pengumuman) dengan paste data massal |
| 5 | Perbaikan UX player: fullscreen manual (bukan otomatis), pesan error lebih jelas |
| 6 | Fitur **Edit** menyeluruh untuk semua jenis konten |
| 7 | **Pengumuman Darurat** dengan target layar spesifik/semua |
| 8 | **Optimasi bandwidth**: prefetch-next + crossfade |
| 9 | **Pairing TV via kode PIN** untuk kemudahan pemasangan banyak layar via remote |

---

## 13. Potensi Pengembangan Lanjutan (Belum Diimplementasikan)

- Laporan/analitik bukti tayang (proof-of-play) per layar.
- Manajemen peran pengguna (admin vs. editor konten vs. viewer laporan).
- Dukungan multi-organisasi/multi-tenant.
- Integrasi CDN video khusus (Cloudflare R2/Bunny.net) sebagai opsi bawaan, bukan sekadar tempel link manual.
- Kompresi/optimasi otomatis video saat diunggah.
- Aplikasi kiosk native pendamping (di luar browser) untuk kontrol perangkat lebih dalam (mis. paksa reboot TV dari jarak jauh).

---

*Dokumen ini merangkum seluruh rancangan dan keputusan desain yang dibahas dan diimplementasikan sepanjang pengembangan aplikasi Siaran, dari perancangan awal hingga status saat ini (sudah di-deploy production).*
