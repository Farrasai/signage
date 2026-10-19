# DESIGN.md — Digital Signage Admin Dashboard Redesign Specification

> **Dokumen Panduan untuk AI Coding Agent**  
> Gunakan dokumen ini sebagai referensi utama (*Single Source of Truth*) saat merombak antarmuka pengguna (UI/UX) aplikasi Admin Digital Signage. Pertahankan seluruh fungsi *backend*, pemanggilan API/Supabase, serta *state management* yang sudah ada, namun terapkan arsitektur tata letak, palet warna **Liquid Emerald & Neon Lime Wave**, tipografi, dan komponen interaktif sesuai spesifikasi di bawah ini.

---

## 1. Filosofi Desain & Tujuan Utama UX

1. **Identitas Visual "Liquid Emerald & Neon Lime Wave":**  
   Mengubah tampilan kartu putih polos yang monoton menjadi ruang kendali (*command center*) modern dengan aksen gradasi zamrud gelap (`#022c22` hingga `#047857`), kilauan cahaya *Neon Lime* (`#a3e635`), dan pola gelombang vektor SVG yang elegan.
2. **Tombol Kontrol Player Mudah Terbaca & Diklik (*High-Affordance Controls*):**  
   Semua tombol kontrol pemutaran TV (**Mundur**, **Putar/Jeda**, **Maju**, **Refresh**, **Salin URL**, **Buka Player**) **wajib** menampilkan **Ikon + Teks Label Eksplisit** dengan area klik (*hit target*) yang besar dan kontras tinggi. Hindari tombol ikon kecil tanpa teks.
3. **Visualisasi Kontekstual (*Live Preview*):**  
   - Kartu TV memiliki *header* visual menyerupai monitor dengan status *Online/Offline* yang kontras.
   - Halaman **Playlist** menggunakan **Modal Sub-Menu** interaktif untuk mengatur urutan naik/turun (`↑`/`↓`) dan durasi konten.
   - Halaman **Darurat** memiliki pratinjau langsung (*Live 16:9 TV Overlay Preview*) di sisi kanan layar.
4. **Dukungan Penuh Mode Terang & Mode Gelap (*Light & Dark Mode*):**  
   Menggunakan sistem berbasis class `dark` pada elemen `<html>` (`bg-slate-50` di mode terang, `bg-slate-950` di mode gelap).

---

## 2. Sistem Desain (Design Tokens)

### 2.1. Tipografi
Muat Google Fonts berikut pada `<head>` atau konfigurasi `next/font`:
- **UI & Heading (`font-sans`):** `'Plus Jakarta Sans', sans-serif` (Weights: `400`, `500`, `600`, `700`, `800`)
- **Kode Perangkat, PIN, Jam, & Durasi (`font-mono`):** `'JetBrains Mono', monospace` (Weights: `400`, `500`, `700`)

### 2.2. Palet Warna Utama
| Token / Peran | Mode Terang (Light) | Mode Gelap (Dark) | Keterangan Penggunaan |
| :--- | :--- | :--- | :--- |
| **Background Utama** | `bg-slate-50` (`#f8fafc`) | `bg-slate-950` (`#020617`) | Latar belakang utama halaman dengan `.ambient-bg` |
| **Surface / Kartu** | `bg-white` (`#ffffff`) | `bg-slate-900` (`#0f172a`) | Kartu KPI, Kartu TV, Tabel, dan Modal |
| **Border Kartu** | `border-slate-200/80` | `border-slate-800` | Garis tepi halus pada seluruh kontainer |
| **Primary Brand** | `emerald-600` (`#059669`) | `emerald-500` (`#10b981`) | Aksen utama, status aktif, toggle switch |
| **Highlight / Accent** | `lime-300` / `lime-400` | `lime-300` / `lime-400` | Aksen kontras di atas `.emerald-wave-pattern` |
| **Emergency / Danger**| `rose-600` (`#e11d48`) | `rose-500` (`#f43f5e`) | Menu Darurat, tombol hapus, peringatan |

### 2.3. Custom CSS Pattern Wajib (`globals.css`)
Tambahkan class CSS berikut ke file stylesheet global aplikasi untuk menghasilkan efek **Liquid Emerald Wave** (aktif/online) dan **Emerald Wave Offline** (redup/offline):

~~~css
/* Pattern Utama: Liquid Emerald & Neon Lime Wave */
.emerald-wave-pattern {
    background-color: #022c22;
    background-image: 
        radial-gradient(120% 80% at 85% 15%, rgba(163, 230, 53, 0.45) 0%, rgba(16, 185, 129, 0.2) 40%, transparent 70%),
        radial-gradient(100% 90% at 15% 85%, rgba(52, 211, 153, 0.35) 0%, rgba(5, 150, 105, 0.25) 50%, transparent 80%),
        linear-gradient(135deg, #022c22 0%, #064e3b 35%, #047857 68%, #065f46 100%);
    position: relative;
    overflow: hidden;
}

.emerald-wave-pattern::before {
    content: '';
    position: absolute;
    inset: -40%;
    background: radial-gradient(ellipse at center, rgba(217, 249, 157, 0.28) 0%, rgba(16, 185, 129, 0.1) 35%, transparent 65%);
    transform: rotate(-18deg) scaleY(0.45);
    pointer-events: none;
    filter: blur(8px);
}

.emerald-wave-pattern::after {
    content: '';
    position: absolute;
    inset: 0;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 800 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M-100,260 C220,330 420,70 900,150' fill='none' stroke='rgba(217, 249, 157, 0.4)' stroke-width='5' stroke-linecap='round'/%3E%3Cpath d='M-100,295 C260,360 460,110 900,190' fill='none' stroke='rgba(52, 211, 153, 0.25)' stroke-width='12' stroke-linecap='round'/%3E%3Cpath d='M120,420 C380,220 550,280 880,60' fill='none' stroke='rgba(236, 252, 203, 0.22)' stroke-width='2'/%3E%3C/svg%3E");
    background-size: cover;
    background-position: center;
    pointer-events: none;
    mix-blend-mode: screen;
}

/* Pattern Header Kartu TV saat Offline */
.emerald-wave-offline {
    background-color: #091917;
    background-image: 
        radial-gradient(90% 70% at 85% 15%, rgba(16, 185, 129, 0.15) 0%, transparent 65%),
        linear-gradient(135deg, #091514 0%, #0f2925 50%, #11302b 100%);
    position: relative;
    overflow: hidden;
}

.emerald-wave-offline::after {
    content: '';
    position: absolute;
    inset: 0;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 800 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M-100,260 C220,330 420,70 900,150' fill='none' stroke='rgba(52, 211, 153, 0.12)' stroke-width='3'/%3E%3C/svg%3E");
    background-size: cover;
    background-position: center;
    pointer-events: none;
}

/* Ambient Background Glow pada Body */
.ambient-bg {
    background-image: 
        radial-gradient(at 0% 0%, rgba(16, 185, 129, 0.08) 0px, transparent 45%),
        radial-gradient(at 100% 20%, rgba(132, 204, 22, 0.06) 0px, transparent 40%);
}
~~~

---

## 3. Arsitektur Tata Letak Global (Global Layout)

### 3.1. Sidebar Navigasi Kiri (`w-72`, Fixed di Mobile, Sticky di Desktop)
1. **Brand Header:**
   - Ikon berlatar `.emerald-wave-pattern` ukuran `w-10 h-10 rounded-xl` dengan titik indikator hijau berdenyut (`animate-ping`) di sudut kanan atas.
   - Judul: **Digital Signage** (`font-bold text-base`) & Subjudul: `Sistem Kontrol Terpadu` (`text-[11px] text-emerald-600`).
2. **Seksi 1 — `MENU UTAMA`:**
   Setiap item menampilkan ikon di kiri, label menu, dan *badge* jumlah data di kanan:
   - **Dashboard** (Aktif: `bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-bold` + garis vertikal `w-1.5 h-5 rounded-full bg-emerald-600`).
   - **Layar & TV** (Badge jumlah layar, misal: `4`).
   - **Konten Media** (Badge jumlah konten, misal: `10`).
   - **Playlist** (Badge jumlah playlist, misal: `3`).
   - **Jadwal Tayang** (Badge jumlah jadwal, misal: `1`).
3. **Seksi 2 — `KONTROL SIARAN` (Dipisahkan garis `border-t`):**
   - **Pengumuman Suara:** Tombol aksen hijau zamrud lembut (`bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border border-emerald-500/20`) dengan ikon megafon dan badge jumlah jadwal suara. Saat aktif, gunakan `.emerald-wave-pattern text-white`.
   - **Darurat:** Tombol aksen merah siaga (`bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20`) dengan ikon sirine dan titik merah di kanan. Saat aktif, gunakan `bg-rose-600 text-white`.
4. **Sidebar Footer:**
   - **Kotak Waktu Sistem (WIB):** Menampilkan jam *real-time* dengan `font-mono text-xs font-bold` (Contoh: `Sabtu, 17 Okt 2026 16:54:19 WIB`).
   - **Baris Utilitas:** Tombol sakelar **Mode Gelap / Mode Terang** dan tombol **Keluar** (`text-rose-600`).
   - **Profil Pengguna:** Avatar bulat inisial berlatar `.emerald-wave-pattern` (`KN`), nama peran (`Administrator`), dan email (`knwng.id@gmail.com`).

### 3.2. Sticky Top Header (`backdrop-blur-md bg-white/80 dark:bg-slate-900/80`)
- **Sisi Kiri:**
  - Judul Halaman (`text-xl sm:text-2xl font-extrabold`) + **Badge Status Global** di sebelahnya (`0 dari 4 Layar Online`).
  - Deskripsi singkat halaman di bawah judul (`text-xs sm:text-sm text-slate-500`).
- **Sisi Kanan (Hanya 1 Tombol CTA Kontekstual):**
  - Gunakan tombol berlatar `.emerald-wave-pattern` dengan ikon `+` berwarna `text-lime-200`.
  - Label menyesuaikan halaman aktif: `+ Tambah Layar`, `+ Tambah Konten`, `+ Buat Playlist`, `+ Buat Jadwal`, `+ Tambah Jadwal`, atau `Tayangkan Darurat`.
  - **Catatan Penting:** Jangan tampilkan tombol "Simulasikan TV Online" pada header produksi.

---

## 4. Spesifikasi Detail Per Halaman (7 Views)

### Halaman 1: Dashboard (`Ringkasan`)
1. **Baris Kartu KPI (Grid 4 Kolom `grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5`):**
   - **Kartu 1 (Total Layar):** Angka besar `text-3xl font-extrabold`, ikon TV duotone emerald, footer link `Kelola Layar →`.
   - **Kartu 2 (Total Konten):** Angka besar, ikon film duotone teal, footer link `Buka Pustaka →`.
   - **Kartu 3 (Total Playlist):** Angka besar, ikon playlist duotone lime, footer link `Kelola Playlist →`.
   - **Kartu 4 (Layar Online — Highlight Card):** Menggunakan latar `.emerald-wave-pattern text-white`, menampilkan rasio `0 / 4 perangkat`, serta *progress bar* horizontal di bagian bawah.
2. **Toolbar Filter & Pencarian Layar:**
   - Kiri: Pill filter `Semua Layar (4)`, `● Online`, `● Offline`.
   - Kanan: Input pencarian `Cari nama TV atau ID...` + tombol `Refresh Semua`.
3. **Grid Kartu Layar TV (`grid-cols-1 md:grid-cols-2 gap-6`):**
   Setiap kartu TV memiliki struktur 3 bagian:
   - **Bagian Atas (Visual Monitor Header `h-36`):**
     - Menggunakan `.emerald-wave-pattern` jika Online, atau `.emerald-wave-offline` jika Offline.
     - Kiri atas: Badge ID perangkat (`font-mono text-[11px] bg-black/35 text-lime-200`, misal: `tv-tu-xpxkie`).
     - Kanan atas: Pill status `● Online` atau `● Offline`.
     - Kiri bawah: Nama TV (`font-extrabold text-lg text-white`) dan waktu terakhir aktif (`Terakhir aktif: 15 Okt 2026, 20.15`).
   - **Bagian Tengah (Pemilih Playlist Cepat):**
     - Kotak `bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl` berisi label `Playlist Aktif:` di kiri dan `<select>` dropdown untuk langsung mengganti playlist di kanan.
   - **Bagian Bawah (Tombol Kontrol Player Berlabel — WAJIB JELAS & MUDAH DIKLIK):**
     - **Baris 1 (Grid 4 Kolom `grid-cols-4 gap-2`):**
       1. `⏮ Mundur` (Ikon di atas, teks `Mundur` `text-[11px] font-bold` di bawah).
       2. `▶ Putar` / `⏸ Jeda` (Gunakan aksen hijau `.emerald-wave-pattern text-white` saat sedang memutar).
       3. `⏭ Maju` (Ikon di atas, teks `Maju` di bawah).
       4. `↻ Refresh` (Ikon di atas, teks `Refresh` di bawah).
     - **Baris 2 (Grid 2 Kolom `grid-cols-2 gap-2.5`):**
       1. Tombol sekunder berbingkai: `Salin URL`.
       2. Tombol primer `.emerald-wave-pattern text-white`: `Buka Player ↗`.
4. **Seksi Bawah Dashboard (Grid 3 Kolom `lg:grid-cols-3 gap-6`):**
   - **2 Kolom Kiri (`Aktivitas Terbaru`):** Daftar riwayat koneksi TV dengan indikator titik emerald di kiri dan *timestamp* `font-mono` di kanan.
   - **1 Kolom Kanan:** Kartu **Pairing Cepat Smart TV** berlatar `.emerald-wave-pattern` (input 6 digit PIN + tombol `Hubungkan` warna `bg-lime-400 text-emerald-950 font-extrabold`) dan kartu **Status Server Penyimpanan**.

---

### Halaman 2: Layar & TV (`/screens`)
1. **Banner Informasi Pairing:**
   - Berlatar `.emerald-wave-pattern text-white p-6 rounded-2xl` yang menjelaskan cara membuka URL langsung di browser TV atau memasangkan lewat kode PIN dari `/display`, dilengkapi tombol `+ Tambah Layar Baru` (`bg-lime-400 text-emerald-950`).
2. **Daftar Kartu Manajemen Perangkat TV (1 Kolom Penuh per Kartu):**
   - **Header Kartu:** Menggunakan `.emerald-wave-pattern` (Online) atau `.emerald-wave-offline` (Offline) dengan nama TV, kode ID `font-mono`, dan badge status di kanan.
   - **Body Kartu (Grid 2 Kolom `lg:grid-cols-2 gap-4`):**
     - **Kolom 1 (`Playlist default`):** Dropdown `<select>` penuh untuk mengatur playlist bawaan TV.
     - **Kolom 2 (`Teks berjalan / marquee`):** Label di atas dilengkapi badge toggle status `Aktif` (`bg-emerald-100 text-emerald-700`). Di bawahnya terdapat input teks marquee berdampingan dengan tombol `Simpan`.
   - **Baris Kontrol Player & Aksi:**
     - Menampilkan tombol kontrol player (`Mundur`, `Putar/Jeda`, `Maju`, `Refresh`) di sisi kiri, serta waktu aktif terakhir, tombol `Salin URL`, `Buka ↗`, dan `Hapus` di sisi kanan.
   - **Kotak Kode Pairing (`/display`):**
     - Kotak `bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-xl` di bagian paling bawah kartu: menampilkan status kode pairing aktif atau tombol `Buat Kode Pairing` di sisi kanan.

---

### Halaman 3: Konten Media (`/content`)
1. **Toolbar Pencarian & Filter Kategori:**
   - Input pencarian `Cari nama konten...` di sisi kiri.
   - Deretan Pill Kategori beserta angka jumlah item di dalamnya:
     - `Semua [10]`, `Foto [3]`, `Video [3]`, `YouTube [3]`, `Tabel [1]`.
     - Pill aktif menggunakan `.emerald-wave-pattern text-white` dengan kotak angka `bg-black/30 text-lime-300`.
   - Tombol pemilih tampilan **Grid** (`ph-squares-four`) dan **List** (`ph-list-bullets`) di ujung kanan.
2. **Grid Kartu Konten (`grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6`):**
   - **Area Thumbnail (`h-44`):**
     - Menampilkan pratinjau visual sesuai jenis media (foto/infografis, ikon play merah untuk YouTube, atau ikon tabel beserta dimensi `4k · 8b` untuk Tabel Agenda).
     - **Badge Tipe Media** di sudut kiri atas (`top-3 left-3`):
       - `Video`: `bg-purple-500/90 text-white`
       - `YouTube`: `bg-rose-500/90 text-white`
       - `Tabel`: `bg-amber-500/90 text-white`
       - `Foto`: `bg-emerald-600/90 text-white`
   - **Judul Konten:** `font-extrabold text-sm sm:text-base line-clamp-1`.
   - **Footer Kartu Konten:**
     - **Sisi Kiri (Input Durasi Langsung):** Input angka `w-16 rounded-xl font-mono font-extrabold text-center` diikuti teks `dtk` (mengubah nilai langsung menyimpan durasi tayang).
     - **Sisi Kanan:** Tombol `Edit` dan `Hapus` dengan *padding* yang nyaman diklik (`px-3 py-1.5 rounded-xl`).

---

### Halaman 4: Playlist & Modal Sub-Menu Urutan (`/playlists`)
1. **Daftar Kartu Playlist:**
   - Setiap kartu (`Kalibrasi`, `Youtube`, `Video Harlah`) menampilkan ikon playlist berlatar `.emerald-wave-pattern`, judul playlist, badge jumlah konten (`3 konten`), badge total durasi (`Total 140 detik`), serta deretan *chip* pratinjau urutan konten (`1. Kalibrasi Layar (40s)`, `2. DPO (10s)`, dst.).
   - Sisi kanan kartu memiliki tombol `Kelola Isi & Urutan` dan `Hapus`.
2. **Modal Sub-Menu Detail Playlist (Muncul saat kartu playlist diklik):**
   - **Header Modal (`.emerald-wave-pattern text-white`):**
     - Tombol kembali `← Semua playlist`, judul besar playlist (misal: `Kalibrasi`), badge ringkasan (`3 konten • Total 140 detik`), dan tombol `+ Tambah konten` (`bg-lime-400 text-emerald-950 font-extrabold`) di kanan atas.
   - **Drawer `+ Tambah Konten` (Collapsible di bawah header modal):**
     - Berisi dropdown pilih konten dari pustaka, input durasi (detik), dan tombol `Tambahkan ke Urutan`.
   - **Daftar Urutan Konten di Dalam Modal:**
     Setiap baris item memiliki tata letak:
     - **Kiri:** Kotak nomor urut `1`, `2`, `3` (`w-8 h-8 rounded-xl font-mono font-extrabold`) + Judul Konten & sub-label tipe media (`Video`, `Foto`, dll.).
     - **Kanan:**
       - Input inline: `Durasi` `[ 40 ]` `detik` (`font-mono font-bold`).
       - Tombol geser naik `↑` (`w-9 h-9 rounded-xl border`) — otomatis `disabled` jika berada di urutan pertama.
       - Tombol geser turun `↓` (`w-9 h-9 rounded-xl border`) — otomatis `disabled` jika berada di urutan terakhir.
       - Tombol `Hapus` dari playlist.

---

### Halaman 5: Jadwal Tayang & Modal Buat Jadwal (`/schedules`)
1. **Daftar Kartu Jadwal:**
   - Menampilkan relasi target secara visual: **`TV INTEL` → `Video Harlah`** (dengan nama playlist di dalam badge emerald `bg-emerald-50 text-emerald-700`).
   - Baris informasi di bawahnya menampilkan ikon kalender + hari aktif (`Sen, Sel, Rab`) dan ikon jam + rentang waktu (`09:00–17:18` dalam `font-mono font-bold`).
   - Sisi kanan menampilkan tombol `Hapus`.
2. **Modal `Buat jadwal baru`:**
   - **Layar:** Dropdown `<select>` daftar TV (contoh: `Tes Kode Pairing`).
   - **Playlist:** Dropdown `<select>` daftar playlist (contoh: `Kalibrasi`).
   - **Hari (kosongkan untuk setiap hari):** Deretan 7 tombol pill interaktif (`Sen`, `Sel`, `Rab`, `Kam`, `Jum`, `Sab`, `Min`). Saat dipilih, tombol berubah menjadi `.emerald-wave-pattern text-white`.
   - **Mulai & Selesai:** Grid 2 kolom input waktu (`type="time"`, misal `09:00` dan `17:00`).
   - **Prioritas:** Input angka (`type="number"`, default `0`) dengan label *"Prioritas (untuk jadwal yang tumpang tindih, angka lebih besar menang)"*.
   - **Tombol Submit:** Tombol penuh (`w-full py-3.5 rounded-xl .emerald-wave-pattern text-white font-bold`) bertuliskan `Buat jadwal`.

---

### Halaman 6: Pengumuman Suara (`/voice-announcements`)
1. **Navigasi Sub-Tab di Bagian Atas:**
   - Tab 1: `📅 Jadwal Pengumuman (1)` (Garis bawah aktif `border-b-2 border-emerald-600`).
   - Tab 2: `⚡ Siaran Langsung & Antrean`.
2. **Tab 1 — Tabel `Jadwal Pengumuman`:**
   Tabel bersih di dalam kontainer `rounded-2xl border` dengan 7 kolom:
   - **Status:** Toggle switch bulat berwarna hijau (`bg-emerald-600` saat aktif).
   - **Label & Pratinjau:** Tombol bulat Play (`▶`) untuk memutar pratinjau suara TTS di browser, diikuti nama label (`Tes Pengumuman`) dan cuplikan teks pesan di bawahnya.
   - **Jam Tayang:** Badge `font-mono font-extrabold` (contoh: `09:40`).
   - **Hari Aktif:** Deretan 7 badge kecil (`Sen`, `Sel`, `Rab`, `Kam`, `Jum`, `Sab`, `Min`). Hari yang aktif berwarna hijau emerald (`bg-emerald-100 text-emerald-800`), sedangkan hari nonaktif berwarna abu-abu (`bg-slate-100 text-slate-400`).
   - **Target Layar:** Teks dengan ikon TV (contoh: `1 layar`).
   - **Ulang:** Badge jumlah pengulangan (contoh: `1x`).
   - **Aksi (Rata Kanan):**
     - Tombol `▶ Bunyikan` (Aksen emerald untuk memicu pengumuman saat itu juga).
     - Tombol `Edit`.
     - Tombol `Hapus`.
3. **Tab 2 — Panel `Siaran Langsung & Antrean`:**
   - Formulir kirim suara langsung (Pilih Target Layar, Pengulangan & Nada Chime Ding-Dong, Template Cepat Antrean PTSP/Apel Pagi, Textarea kalimat TTS, tombol `Dengarkan Pratinjau` & `Bunyikan ke Layar Sekarang`) berdampingan dengan kartu **Antrean & Riwayat Siaran**.

---

### Halaman 7: Darurat (`/emergency`)
1. **Tata Letak Split 2 Kolom (`grid-cols-1 lg:grid-cols-12 gap-6 items-start`):**
   - **Kolom Kiri (Form Konfigurasi — 7 atau 8 Kolom di Desktop):**
     - **Baris Template Cepat:** Pill preset untuk mengisi cepat (`Default (Tes)`, `Evakuasi Gedung`, `Gangguan Layanan`).
     - **Input `Judul`:** Input teks tebal (default: `PENGUMUMAN`), terhubung langsung (`onInput`) ke layar pratinjau.
     - **Input `Pesan`:** Textarea (default: `tes`), terhubung langsung ke layar pratinjau.
     - **Pemilih `Tayangkan ke`:**
       - *Segmented Control* 2 kolom (`bg-slate-100 p-1 rounded-xl`): tombol **`Semua layar`** dan **`Pilih layar tertentu`**.
       - **Kotak Checklist Layar:** Daftar seluruh TV (`Tes Kode Pairing`, `TV INTEL`, `TV PTSP`, `TV TU`) dengan *checkbox* berwarna hijau emerald di kiri dan indikator status `● Online` / `● Offline` di kanan.
     - **Tombol Eksekusi Utama:**
       - Tombol merah penuh mencolok (`w-full py-3.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold shadow-lg shadow-rose-600/25`).
       - Label dinamis mengikuti jumlah layar yang dicentang: `🚨 Tayangkan ke 1 Layar Terpilih` (atau `Tayangkan ke Semua Layar`).
       - Teks keterangan di bawah tombol: *"Menayangkan ulang akan memperbarui judul/pesan/target yang sedang aktif juga."*
   - **Kolom Kanan (Pratinjau Tampilan di Layar — 4 atau 5 Kolom, `sticky top-24`):**
     - Kartu `Pratinjau tampilan di layar` dengan bingkai monitor rasio `aspect-video` (`16:9`) berlatar hitam pekat (`bg-[#070b12]`).
     - **Komponen Visual di Dalam Layar Preview 16:9:**
       1. Pendaran cahaya merah vertikal di tepi kiri dan kanan layar (`bg-gradient-to-r from-rose-700/75 to-transparent`) beserta garis tipis vertikal `w-[1px] bg-white/15`.
       2. Lingkaran indikator sirine di bagian tengah atas (`border border-white/60`) dengan titik merah berdenyut di dalamnya.
       3. Pill merah menyala bertuliskan **`PERHATIAN`** (`bg-red-600 text-white text-[10px] font-extrabold uppercase tracking-widest rounded-full`).
       4. Teks **Judul Darurat** berukuran besar di tengah (`text-xl sm:text-2xl font-extrabold text-white uppercase`).
       5. Kotak **Pesan Darurat** di bagian bawah (`w-4/5 bg-slate-900/90 border border-white/10 rounded-xl px-4 py-3 text-slate-200`).

---

## 5. Instruksi Implementasi untuk AI Agent

Saat menerapkan `DESIGN.md` ini ke repositori proyek:
1. **Jangan Merusak Logika Data:** Pertahankan seluruh *hook*, *state*, rute halaman (`Next.js App Router` / `Pages`), dan koneksi database (`Supabase` / `WebSocket`) yang sudah berjalan.
2. **Pastikan Konsistensi Komponen:** Buat komponen bersama (*shared components*) untuk badge status `Online/Offline`, header halaman, dan modal agar mudah dipelihara.
3. **Audit Aksesibilitas & Responsivitas:** Pastikan sidebar berubah menjadi *off-canvas drawer* pada layar mobile (`< 1024px`), dan seluruh tombol aksi memiliki `cursor-pointer` serta efek transisi *hover* yang jelas.