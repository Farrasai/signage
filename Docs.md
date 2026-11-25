# Docs.md - Panduan Instalasi, Deploy, dan Penggunaan Pariwara

Panduan lengkap dari nol sampai aplikasi berjalan di TV.
Ditujukan untuk admin teknis yang memasang Pariwara untuk satu instansi.

- **Frontend + backend app**: Next.js 16 (App Router), deploy ke Vercel
- **Database, auth, storage, realtime**: Supabase
- **Player TV**: browser kiosk, APK Android (`apk-display/`), atau desktop (Pake)

> Untuk aturan pengembangan kode, lihat `AGENTS.md`. Untuk arsitektur dan
> keputusan desain, lihat `README.md`. Dokumen ini fokus pada OPERASIONAL.

---

## Daftar isi

1. [Prasyarat](#1-prasyarat)
2. [Instalasi lokal](#2-instalasi-lokal)
3. [Setup Supabase (urutan WAJIB)](#3-setup-supabase-urutan-wajib)
4. [Akun admin pertama](#4-akun-admin-pertama)
5. [Deploy ke Vercel](#5-deploy-ke-vercel)
6. [Memasang TV](#6-memasang-tv)
7. [Tutorial penggunaan](#7-tutorial-penggunaan)
8. [Pemecahan masalah](#8-pemecahan-masalah)
9. [Checklist go-live](#9-checklist-go-live)
10. [Fitur unggulan](#10-fitur-unggulan)
11. [Onboarding klien baru](#11-onboarding-klien-baru)

---

## 1. Prasyarat

| Kebutuhan | Versi | Catatan |
| --- | --- | --- |
| Node.js | 20.9+ | `node --version` |
| npm | 10+ | ikut Node |
| Akun Supabase | gratis | supabase.com |
| Akun Vercel | gratis | vercel.com |
| Git | - | untuk push repo |
| TV / Android TV box | - | browser kiosk, atau APK |

Opsional untuk build APK: JDK 17 + Android SDK 34 (lihat `apk-display/APK.md`).

---

## 2. Instalasi lokal

### 2.1 Clone dan install dependency

```bash
git clone <url-repo-anda> signage
cd signage
npm install
```

### 2.2 Buat file environment

```bash
cp .env.example .env.local
```

Buka `.env.local` dan isi 3 variabel berikut. Nilai diambil dari
**Supabase Dashboard -> Project Settings -> API**.

| Variabel | Diambil dari | Sifat |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL | publik, ikut ke browser |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon public key | publik, ikut ke browser |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role key | **RAHASIA**, server saja |

Contoh isi:

```env
NEXT_PUBLIC_SUPABASE_URL=https://abcdefghijkl.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.anon
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.service
```

> **PENTING soal `SUPABASE_SERVICE_ROLE_KEY`**
> Key ini melewati seluruh RLS. Jangan pernah memberi prefix `NEXT_PUBLIC_`
> (itu akan membocorkannya ke browser), jangan commit, dan jangan kirim
> lewat chat. Dipakai hanya oleh `app/api/admin/*` untuk membuat/menghapus user.

### 2.3 Jalankan

```bash
npm run dev
```

Buka `http://localhost:3000`. Anda akan diarahkan ke `/login`.
Kalau halaman login tampil, artinya env sudah terbaca.

### 2.4 Verifikasi sebelum lanjut

```bash
npm run build      # harus sukses
npx tsc --noEmit   # harus exit 0
```

> Login belum bisa dipakai di tahap ini karena database masih kosong.
> Lanjut ke bagian 3.

---

## 3. Setup Supabase (urutan WAJIB)

### 3.1 Buat project

1. Buka [supabase.com](https://supabase.com) -> **New project**.
2. Pilih region terdekat (mis. `Southeast Asia (Singapore)`).
3. Simpan **database password** di tempat aman.
4. Tunggu provisioning selesai (±2 menit).

### 3.2 Jalankan SQL - URUTAN INI TIDAK BOLEH DIBALIK

Buka **SQL Editor** di dashboard Supabase. Jalankan file berikut **satu per satu**,
tunggu sampai selesai sebelum lanjut ke nomor berikutnya.

| # | File | Isi |
| --- | --- | --- |
| 1 | `supabase/schema.sql` | 10 tabel inti, 38 policy RLS dasar, 2 bucket storage, 3 RPC |
| 2 | `supabase/migrations/20261004_announcer.sql` | antrean pengumuman suara |
| 3 | `supabase/migrations/20261005_announcements.sql` | master jadwal pengumuman |
| 4 | **`supabase/migrations/20261006_multirole.sql`** | **tabel `profiles`, trigger user, kolom `owner_id`/`bidang`, RLS multi-role** |
| 5 | `supabase/migrations/20261007_announcer_ownership.sql` | `storage_path` + `source_announcement_id` |
| 6 | `supabase/migrations/20261026_announcer_storage_fix.sql` | policy storage bucket `announcer` |
| 7 | `supabase/migrations/20261027_heartbeat_rpc.sql` | RPC heartbeat TV (menutup celah `update using (true)`) |
| 8 | `supabase/fix_profiles_rls.sql` | perbaikan rekursi RLS `profiles` |

> **KENAPA NOMOR 4 WAJIB DAN TIDAK BOLEH DILEWATI**
> `schema.sql` **tidak** memuat tabel `profiles`, trigger `handle_new_user()`,
> maupun kolom `owner_id`/`bidang` (0 referensi - sudah diverifikasi).
> Tanpa migrasi nomor 4:
> - dashboard akan error setelah login (query `profiles` gagal),
> - tombol **Buat Operator** gagal,
> - isolasi data per bidang tidak aktif.

> **Catatan idempotensi**
> `schema.sql` memakai `create policy` TANPA `drop policy if exists`.
> Menjalankannya dua kali di project yang sama akan gagal dengan
> `policy already exists`. Untuk project baru ini aman (dijalankan sekali).
> Migrasi di folder `migrations/` semuanya idempotent.

### 3.3 Verifikasi hasil

Jalankan di SQL Editor. Semua harus sesuai harapan.

```sql
-- 1. Harus muncul 11 tabel (10 dari schema.sql + profiles dari migrasi multirole)
select table_name from information_schema.tables
where table_schema = 'public' order by table_name;

-- 2. Harus >= 70 policy (38 di schema.sql + 33 di multirole, dikurangi duplikat)
select count(*) as jumlah_policy from pg_policies where schemaname = 'public';

-- 3. Harus ada 2 bucket, keduanya public = true
select id, name, public from storage.buckets where id in ('media', 'announcer');

-- 4. Policy storage harus ada (3 per bucket = 6 baris)
select policyname from pg_policies
where schemaname = 'storage' and tablename = 'objects' order by policyname;

-- 5. RPC harus ada
select routine_name from information_schema.routines
where routine_schema = 'public' order by routine_name;

-- 6. Trigger user harus ada
select trigger_name from information_schema.triggers
where trigger_name = 'on_auth_user_created';
```

---

## 4. Akun admin pertama

Aplikasi ini **tidak punya halaman pendaftaran publik**. Akun pertama dibuat manual.

### 4.1 Buat user di Supabase

1. **Authentication -> Users -> Add user**.
2. Isi email + password. Centang *Auto Confirm User*.
3. Simpan.

Trigger `handle_new_user()` otomatis membuat baris di `profiles`.

### 4.2 Set role admin

Jalankan di SQL Editor (ganti email):

```sql
update profiles
set role = 'admin', bidang = null
where email = 'anda@domain.id';

select email, role, bidang from profiles;
```

Hasil yang diharapkan: baris tersebut `role = admin`, `bidang` kosong.

### 4.3 Kalau baris profiles tidak muncul

Berarti trigger belum ada - migrasi `20261006_multirole.sql` belum dijalankan.
Kembali ke bagian 3.2 nomor 4, lalu buat ulang user (atau insert manual):

```sql
insert into profiles (id, email, role, bidang)
select id, email, 'admin', null from auth.users where email = 'anda@domain.id'
on conflict (id) do update set role = 'admin';
```

### 4.4 Role dan bidang yang tersedia

| Role | Akses |
| --- | --- |
| `admin` | Semua halaman, termasuk Pengumuman Suara, Darurat, Manajemen User |
| `operator_bidang` | Ringkasan, Layar, Konten, Playlist, Jadwal - hanya data miliknya/se-bidang |

Bidang yang valid: `TU`, `INTEL`, `BIN`, `PIDSUS`, `PIDUM`, `DATUN`, `PAPBB`.

```sql
-- contoh operator
update profiles set role = 'operator_bidang', bidang = 'PIDUM'
where email = 'op@domain.id';
```

---

## 5. Deploy ke Vercel

### 5.1 Push repo

```bash
git add -A
git commit -m "initial"
git push origin main
```

> Pastikan `.env.local` **tidak** ikut ter-commit (sudah ada di `.gitignore`).

### 5.2 Import di Vercel

1. [vercel.com/new](https://vercel.com/new) -> pilih repo.
2. Framework terdeteksi otomatis sebagai **Next.js**. Jangan ubah build command.
3. Sebelum klik Deploy, buka **Environment Variables** dan tambahkan 3 variabel
   yang sama seperti `.env.local`.

| Key | Environment |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Production, Preview, Development |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Production, Preview, Development |
| `SUPABASE_SERVICE_ROLE_KEY` | Production, Preview, Development |

### 5.3 Deploy dan verifikasi

Setelah deploy selesai:

1. Buka domain `*.vercel.app` -> harus redirect ke `/login`.
2. Login dengan akun admin dari bagian 4.
3. Buat 1 layar percobaan di **Layar & TV**.
4. Buka `/display/<slug>` di tab baru -> player harus tampil.

Kalau langkah 4 menampilkan "Layar tidak ditemukan", penyebab paling sering:
policy `public read displays` belum ada -> ulangi bagian 3.2.

### 5.4 Catatan CSP

`next.config.ts` mengirim header `Content-Security-Policy`.
`media-src` sengaja memuat `https:` agar video dari CDN eksternal bisa diputar.
**Jangan dipersempit** - lihat `README.md` bagian 8.

---

## 6. Memasang TV

### 6.1 Alur pairing (cara utama)

1. Dashboard -> **Layar & TV** -> **Tambah layar**, beri nama (mis. "TV Lobby").
2. Sistem menampilkan **kode pairing 8 karakter**, berlaku **30 menit**.
3. Di perangkat TV, buka `https://domain-anda.vercel.app/display`.
4. Masukkan kode -> TV otomatis diarahkan ke player layarnya.
5. Browser TV menyimpan slug di `localStorage`, jadi restart berikutnya langsung ke player.

Alternatif tanpa PIN: buka langsung `/display/<slug>`.

### 6.2 Pilihan perangkat

| Perangkat | Cara | Catatan |
| --- | --- | --- |
| Android TV / TV box | **APK** di `apk-display/` | auto-start, back diblokir, cache terkendali - lihat `apk-display/APK.md` |
| Android TV / box | Fully Kiosk Browser | set *Launch on boot*, URL = player |
| Mini PC + TV (HDMI) | Chrome `--kiosk` | tambahkan flag `--kiosk` pada shortcut |
| PC Windows | Desktop app (Pake) | butuh WebView2; build butuh Rust + MSVC Build Tools ±5 GB disk |

### 6.3 APK (ringkas)

```bash
cd apk-display
gradle wrapper --gradle-version 8.7      # sekali saja
./gradlew :app:assembleDebug
adb connect <IP-TV>:5555
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

Setup awal tanpa mengetik PIN:

```bash
adb shell am start -n id.knwng.pariwara.display/.MainActivity -e slug tv-lobby
```

Detail lengkap, setelan WebView, dan troubleshooting ada di `apk-display/APK.md`.

### 6.4 Setelah TV terpasang

1. Dashboard -> **Layar & TV** -> pasang **playlist default** pada layar itu.
2. Status layar harus berubah **Online** dalam ±30 detik (heartbeat 25 detik).
3. Uji remote control: tombol refresh / next / prev / jeda.

---

## 7. Tutorial penggunaan

### 7.1 Alur kerja inti (hafalkan urutan ini)

```
KONTEN  ->  PLAYLIST  ->  JADWAL (opsional)  ->  LAYAR
```

Konten tidak bisa tampil kalau belum masuk playlist.
Playlist tidak tampil kalau belum dipasang ke layar (langsung atau lewat jadwal).

### 7.2 Ringkasan (halaman awal)

- **4 kartu statistik**: Total Layar, Total Konten, Total Playlist, Layar Online.
- **Filter**: Semua / Online / Offline + kotak cari nama atau ID.
- **Kartu per layar**: ganti playlist default, remote control, Salin URL, Buka Player.
- **Aktivitas Terbaru**: 10 kejadian terakhir.

Tombol remote control di tiap kartu:

| Tombol | Fungsi |
| --- | --- |
| `|<` | konten sebelumnya |
| play / pause | jeda atau lanjutkan |
| `>|` | konten berikutnya |
| refresh | muat ulang player |

Perintah dikirim lewat Supabase Realtime - berlaku dalam hitungan detik di TV mana pun.

### 7.3 Konten Media - 4 jenis

Menu **Konten Media**. Tombol **Tambah Konten** selalu ada di toolbar kanan atas.

| Jenis | Cara mengisi | Durasi |
| --- | --- | --- |
| **Foto** | upload file, atau tempel URL CDN | diatur manual (detik) |
| **Video** | upload file, atau tempel URL CDN | otomatis berhenti saat video habis |
| **YouTube** | tempel link video atau playlist | diatur manual (tidak terdeteksi otomatis) |
| **Tabel Agenda** | susun kolom + baris (bisa tempel dari Excel) | diatur manual (detik) |

**Tips video:**
- Ukuran wajar 5-15 MB per video. Video 67 MB pernah membuat WebView TV gagal memutar saat loop.
- Kalau memakai CDN sendiri, pastikan header `Accept-Ranges: bytes` aktif agar seek & cache bekerja.
- Format paling aman: H.264 High profile, 8-bit, AAC audio.

**Tips tabel agenda:**
- Tabel otomatis menyesuaikan ukuran font agar MUAT di layar, tidak perlu di-scroll.
- Jangan menaruh terlalu banyak teks per sel - sel panjang akan memaksa font mengecil.

### 7.4 Playlist

1. Menu **Playlist** -> **Buat Playlist**, beri nama.
2. Buka playlist -> **Tambah item** dari perpustakaan konten.
3. Atur **urutan** (naik/turun) dan **durasi per item** bila perlu.

Durasi per item menimpa durasi konten asli (`duration_override`).
Untuk video, biarkan kosong agar mengikuti durasi video sebenarnya.

### 7.5 Jadwal Tayang

Menu **Jadwal Tayang**. Kegunaan: playlist tertentu tampil pada hari & jam tertentu.

- Pilih **layar**, **playlist**, **hari aktif**, dan **rentang jam**.
- Kalau ada jadwal yang cocok, TV memakai playlist jadwal.
- Kalau tidak ada, TV kembali ke **playlist default** layar.

> Evaluasi jadwal memakai **waktu server** (`/api/time`), bukan jam TV.
> Ini disengaja karena jam perangkat TV sering meleset.

### 7.6 Pengumuman Suara (admin saja)

Menu **Pengumuman Suara** punya dua tab:

| Tab | Fungsi |
| --- | --- |
| **Jadwal Pengumuman** | audio diputar otomatis pada jam & hari tertentu |
| **Siaran Langsung** | audio langsung masuk antrean semua TV |

- Format audio: mp3 / wav / ogg.
- Bisa diulang 1-3 kali.
- **Tidak mengganggu** konten visual - video/foto tetap berjalan.
- Antrean diputar FIFO (dulu masuk, dulu keluar).

Di TV akan muncul badge 🎤 saat audio berbunyi.

### 7.7 Siaran Darurat (admin saja)

Menu **Darurat**. Menampilkan overlay layar penuh ke semua TV.

- Isi judul (maks 120 karakter) dan pesan (maks 1000 karakter).
- Overlay **hanya bisa ditutup dari dashboard admin**.
- Ini keputusan produk yang disengaja: TV tidak boleh bisa menutup sendiri.

### 7.8 Manajemen User (admin saja)

Menu **Manajemen User**. Membuat akun **operator bidang**.

- Tombol **Buat Operator** -> isi email, password, role, bidang.
- User langsung aktif tanpa perlu konfirmasi email.
- Operator tidak bisa membuka Pengumuman Suara, Darurat, dan Manajemen User.

### 7.9 Yang dilihat operator bidang

Operator **bisa**: lihat semua layar, konten, playlist, jadwal.
Operator **hanya bisa mengubah**: data miliknya sendiri atau se-bidang.
Operator **tidak bisa**: membuka Announcer, Darurat, Users (dialihkan ke Ringkasan).

---

## 8. Pemecahan masalah

### 8.1 Masalah saat instalasi

| Gejala | Penyebab | Perbaikan |
| --- | --- | --- |
| `cp: .env.example not found` | file belum ada di repo lama | buat `.env.local` manual dengan 3 variabel (bagian 2.2) |
| Halaman login tidak bisa dibuka | env tidak terbaca | restart `npm run dev` setelah mengubah `.env.local` |
| Login sukses tapi dashboard blank | tabel `profiles` tidak ada | jalankan migrasi `20261006_multirole.sql` (bagian 3.2 no. 4) |
| Tombol **Buat Operator** error | `SUPABASE_SERVICE_ROLE_KEY` kosong | isi di `.env.local`, restart dev server |
| SQL error `policy already exists` | `schema.sql` dijalankan dua kali | pakai project Supabase baru |
| Upload audio gagal `row-level security` | policy bucket `announcer` belum ada | jalankan `20261026_announcer_storage_fix.sql` |
| Upload gambar/video gagal | policy bucket `media` belum ada | ulangi `schema.sql` bagian storage |

### 8.2 Masalah di TV

| Gejala | Penyebab | Perbaikan |
| --- | --- | --- |
| Layar **Offline** terus | heartbeat gagal | pastikan migrasi `20261027_heartbeat_rpc.sql` sudah jalan |
| Video CDN hitam, thumbnail tampil | CSP `media-src` memblokir | jangan persempit `media-src`; lihat `README.md` bagian 8 |
| Video terpotong sebelum habis | timer `advance()` tanpa syarat | sudah diperbaiki via watchdog; jangan diubah |
| TV minta PIN tiap restart | storage/LS tidak persist | di APK: `domStorageEnabled` harus `true` |
| Tabel agenda gelap & tak terbaca | force-dark Android | nama file salah, atau `FORCE_DARK_OFF` hilang |
| Tabel terpotong / harus scroll | `useWideViewPort` aktif | lihat `apk-display/APK.md` bagian 3 |
| Marquee menutupi baris terakhir | stage tidak dipendekkan | `bottom-12 sm:bottom-14` di player |
| Pengumuman suara tidak berbunyi | autoplay diblokir | di APK: `mediaPlaybackRequiresUserGesture = false` |

### 8.3 Diagnostik player di TV

Buka player dengan parameter tambahan:

```
https://domain-anda/display/<slug>?debug=1
```

Badge kecil muncul di kiri atas bila ada video gagal, menampilkan:

| Kode | Arti |
| --- | --- |
| `ABORTED (1)` | normal saat transisi - abaikan |
| `NETWORK (2)` | unduhan gagal / terputus |
| `DECODE (3)` | decoder hardware menolak - re-encode video |
| `SRC_NOT_SUPPORTED (4)` | codec tidak didukung WebView - wajib re-encode |

---

## 9. Checklist go-live

Jalankan berurutan sebelum menyerahkan ke klien. Semua harus lolos.

**Database & akses**

- [ ] 11 tabel ada, termasuk `profiles`
- [ ] >= 70 policy RLS di schema `public`
- [ ] 2 bucket storage (`media`, `announcer`), keduanya `public = true`
- [ ] 6 policy storage (3 per bucket)
- [ ] RPC `redeem_pairing_code`, `touch_display`, `ack_remote_command` ada
- [ ] Trigger `on_auth_user_created` ada
- [ ] `display_pairing_codes` **TIDAK** punya policy SELECT untuk anon
- [ ] Akun admin bisa login

**Aplikasi web**

- [ ] `npm run build` sukses
- [ ] Login / logout berfungsi (logout mengarah ke `/login`)
- [ ] Buat layar -> dapat kode pairing
- [ ] Upload foto, video, audio berhasil
- [ ] Buat playlist -> tambah item -> atur urutan
- [ ] Pasang playlist ke layar
- [ ] Jadwal tersimpan dan terbaca

**TV**

- [ ] Pairing lewat PIN berhasil
- [ ] Restart TV -> langsung ke player, **tidak** minta PIN
- [ ] Status layar jadi **Online** dalam 30 detik
- [ ] Remote control (refresh/next/prev/jeda) bereaksi
- [ ] Video diputar penuh lalu lanjut ke konten berikutnya
- [ ] Looping kembali ke awal tanpa layar hitam
- [ ] Tabel agenda terbaca penuh tanpa scroll
- [ ] Marquee berjalan dan tidak menutupi konten
- [ ] Layar tidak tidur setelah 30 menit
- [ ] Cabut internet -> muncul fallback, sambung lagi -> pulih sendiri (khusus APK)

---

---

## 10. Fitur unggulan

Ringkasan kemampuan Pariwara, dikelompokkan per modul. Semua yang tertulis di sini
sudah diverifikasi ada di kode - bukan rencana.

**Sekilas:**

| Modul | Kemampuan |
| --- | --- |
| Konten Media | 5 jenis konten, 3 sumber (upload / CDN / YouTube), tabel agenda auto-fit |
| Playlist | urutan, durasi per item, pratinjau |
| Jadwal Tayang | per layar, per hari, rentang jam, prioritas |
| Pengumuman Suara | langsung + terjadwal, ulang 1-3x, per target layar |
| Siaran Darurat | overlay penuh, 4 template siap pakai, kunci admin |
| Layar / TV | remote 5 tombol, marquee, pilih playlist, jeda global |
| Keamanan | RLS per bidang, pairing PIN sekali pakai, sanitasi XSS |

---

### 10.1 Pengumuman Suara

Audio yang **berbunyi di TV tanpa menghentikan konten visual**. Video dan foto tetap
berjalan; penonton mendengar pengumuman sambil tetap melihat tayangan.

**Dua mode pemakaian**

| Mode | Cara kerja | Cocok untuk |
| --- | --- |
| **Siaran Langsung** | audio langsung masuk antrean semua TV yang dipilih | pengumuman dadakan: tamu, rapat, evakuasi |
| **Jadwal Pengumuman** | diputar otomatis pada jam & hari tertentu | bel masuk, pengingat sholat, pengumuman rutin |

**Yang bisa diatur**

- **Label** pengumuman (nama pengenal, mis. "Bel Masuk").
- **File audio** - format `mp3`, `wav`, `ogg` (input `audio/*`).
- **Waktu tayang** (`time`, format `HH:mm`) untuk mode terjadwal.
- **Hari aktif** - 7 hari (`mon` s/d `sun`), bisa semua hari sekaligus.
- **Jumlah pengulangan** - **1x, 2x, atau 3x** per pemutaran.
- **Target layar** - semua layar, atau pilih layar tertentu saja.
- **Switch aktif/nonaktif** - mematikan jadwal tanpa menghapusnya.
- **Putar sekarang** - tombol untuk memutar jadwal yang tersimpan tanpa menunggu jamnya.
- **Pratinjau audio** - mendengarkan sebelum menyiarkan.

**Keunggulan teknis**

- **Antrean FIFO** - audio diputar berurutan, tidak saling menimpa. Dulu masuk, dulu keluar.
- **Tidak memotong konten** - konten visual punya timer sendiri, audio punya jalurnya sendiri.
- **Penanda visual** - badge 🎤 muncul di pojok TV saat audio berbunyi, jadi operator tahu statusnya.
- **Pengaman file audio** - file master tidak ikut terhapus saat antrean dibatalkan (`storage_path` + `source_announcement_id`). Ini bug yang pernah terjadi dan sudah diperbaiki.
- **Evaluasi tanpa cron** - penjadwalan berjalan di sisi browser TV, jadi tidak butuh server cron tambahan yang harus dijaga 24/7.
---

### 10.2 Siaran Darurat

Overlay **layar penuh** yang menimpa semua konten di TV. Dipakai saat situasi butuh
perhatian total: evakuasi, gangguan layanan, pengumuman penting.

**Yang bisa diatur**

- **Judul** - maksimal **120 karakter**, tampil besar dan huruf kapital.
- **Pesan** - maksimal **1000 karakter** dengan penghitung karakter.
- **Target layar** - semua layar, atau layar tertentu saja.
- **4 template siap pakai** - tinggal pilih, tidak perlu mengetik dari nol:

| Template | Isi |
| --- | --- |
| `Default` | PENGUMUMAN |
| `Rapat Staf AA` | Mohon segera menuju titik kumpul |
| `Evakuasi Gedung` | EVAKUASI GEDUNG |
| `Gangguan Layanan` | GANGGUAN LAYANAN |

**Keunggulan**

- **Tayang dalam hitungan detik** - lewat Supabase Realtime, bukan polling. Semua TV target menerima bersamaan.
- **Tidak bisa ditutup dari TV** - tombol tutup hanya ada di dashboard admin. Ini keputusan produk yang disengaja: kalau TV bisa menutup sendiri, status antar-layar jadi tidak konsisten dan sebagian TV bisa melewatkan instruksi darurat.
- **Kontras tinggi & teks besar** - dirancang terbaca dari jarak jauh, bukan sekadar banner kecil.
- **Warna siaga** - latar merah gelap dengan aksen merah terang, membedakan dari konten biasa.
- **Konten terlindungi XSS** - judul dan pesan disanitasi sebelum dirender.

> Untuk operasional: **satu orang** harus ditunjuk sebagai pemegang akun admin darurat.
> Kalau semua orang bisa menayangkan, risiko salah tembak jadi tinggi.

### 10.3 Konten Media

Perpustakaan konten dengan 5 jenis dan 3 sumber yang bisa dicampur.

**5 jenis konten**

| Jenis | Format | Durasi | Catatan |
| --- | --- | --- | --- |
| Foto | `image/*` - JPG, PNG, WEBP, GIF | manual (detik) | mengisi penuh layar |
| Video | `video/*` - MP4, WEBM | otomatis saat video habis | ada watchdog anti-macet |
| YouTube Video | tempel link | manual | tanpa API key, tanpa kuota |
| YouTube Playlist | tempel link playlist | manual | seluruh playlist diputar |
| Tabel Agenda | susun kolom + baris | manual | auto-fit, tanpa scroll |

**3 sumber file**

1. Upload ke Supabase Storage (bucket `media`) - praktis untuk file kecil.
2. CDN link generik - tempel URL dari Cloudinary, Bunny, R2, atau server sendiri.
3. YouTube - tempel link, sistem menyusun embed.

**Keunggulan tabel agenda**

- **Auto-fit terukur** - font diperkecil bertahap sampai seluruh tabel muat di layar, jadi tidak ada scroll di TV. Ini penting karena Smart TV melaporkan viewport hanya 960x540.
- **Tempel dari Excel** - susun data di spreadsheet, salin, tempel. Tidak perlu input satu per satu.
- **Tema terang** - latar putih, header hijau solid, isi bold; terbaca dari jarak jauh. Versi gelap lama sudah dibuang karena tidak terbaca.
- **Jumlah baris lentur** - 4 baris maupun 20 baris tetap ditangani.

**Keunggulan operasional**

- **Pencarian dan filter real-time** - filter per tipe (Semua / Foto / Video / YouTube / Tabel) dengan penghitung jumlah otomatis.
- **Dua mode tampilan** - Grid untuk melihat visual, List untuk detail dan durasi.
- **Durasi bisa diedit inline** - ubah durasi tanpa membuka modal.
- **Pratinjau bersama** - render di dashboard memakai komponen yang sama dengan player TV, jadi yang dilihat di dashboard adalah yang tampil di TV.
- **Thumbnail otomatis** - YouTube memakai thumbnail resmi, video memakai frame pertama.

**Tips ukuran file**

| Jenis | Ukuran wajar | Batas praktis |
| --- | --- | --- |
| Foto | 200 KB sampai 2 MB | sekitar 5 MB |
| Video | 5 sampai 15 MB | hindari di atas 50 MB untuk TV low-end |
| Audio pengumuman | 100 KB sampai 2 MB | sekitar 10 MB |

> Video 67 MB pernah membuat WebView TV gagal memutar saat looping. Kalau video besar,
> re-encode ke H.264 High profile 8-bit + AAC, atau host di CDN dengan `Accept-Ranges: bytes`.

---

### 10.4 Playlist

Wadah yang menentukan **urutan** dan **durasi** konten saat tayang.

**Yang bisa diatur**

- **Nama playlist** - bebas, untuk pengenalan di dashboard.
- **Isi playlist** - tambah konten dari perpustakaan lewat modal pemilih.
- **Urutan tayang** - geser naik/turun; sistem menyimpan `sort_order`.
- **Durasi per item** - menimpa durasi asli konten (`duration_override`).
  Kosongkan untuk video agar mengikuti durasi sebenarnya.
- **Hapus item** - mengeluarkan konten dari playlist tanpa menghapus dari perpustakaan.

**Keunggulan**

- **Satu konten, banyak playlist** - tidak perlu upload ulang; konten yang sama bisa dipakai
  di beberapa playlist dengan durasi berbeda.
- **Durasi berbeda per playlist** - foto yang sama bisa tampil 10 detik di Lobby dan
  20 detik di Ruang Tunggu.
- **Video tidak dipotong** - kalau durasi override kosong, video diputar sampai habis.
  Watchdog berbasis progres memastikan video sehat tidak pernah terpotong timer.
- **Looping mulus** - kembali ke item pertama tanpa layar hitam (penukaran instan,
  bukan crossfade yang pernah bermasalah di Android TV).
- **Penanda item kosong** - playlist kosong memberi arahan jelas, bukan layar putih.

### 10.5 Jadwal Tayang

Mengatur playlist mana tampil di layar mana, pada hari dan jam apa.

**Yang bisa dibuat**

- **Per layar** - satu jadwal berlaku untuk satu layar tertentu.
- **Per hari** - pilih 7 hari (mon s/d sun), bisa satu hari atau semua hari.
- **Rentang jam** - `start_time` sampai `end_time`, format `HH:mm`.
- **Prioritas** - kolom `priority` menentukan jadwal mana yang menang bila tumpang tindih.
- **Beberapa jadwal sekaligus** - mis. pagi untuk konten berita, siang untuk agenda, sore untuk video profil.

**Cara kerja saat tayang**

```
Ada jadwal yang cocok (hari + jam)?
   ya  -> pakai playlist dari jadwal itu
   tidak -> kembali ke playlist default layar
```

**Keunggulan**

- **Memakai waktu server, bukan jam TV** - jadwal dievaluasi terhadap `/api/time`. Jam perangkat TV sering meleset karena zona waktu salah atau baterai CMOS lemah; ini pernah membuat jadwal tidak muncul sama sekali.
- **Otomatis kembali ke default** - begitu rentang jam berakhir, layar tidak macet di playlist jadwal.
- **Tanpa cron server** - evaluasi berjalan di sisi player, jadi tidak ada pekerjaan terjadwal yang harus dipantau.
- **Bisa dimatikan tanpa dihapus** - switch aktif/nonaktif untuk jadwal musiman.

---

### 10.6 Layar / TV

Kendali penuh atas setiap layar dari dashboard, tanpa perlu menyentuh perangkat.

**Remote control - 5 perintah**

| Tombol | Perintah | Fungsi |
| --- | --- | --- |
| `|<` | prev | konten sebelumnya |
| play | play | lanjutkan pemutaran |
| pause | pause | jeda pemutaran |
| `>|` | next | konten berikutnya |
| refresh | refresh | muat ulang player |

Perintah dikirim lewat Supabase Realtime dan dieksekusi dalam hitungan detik.
Tombol play/pause juga mengubah status jeda layar, jadi tampilan dashboard selalu sinkron.

**Yang bisa diatur per layar**

- **Nama layar** - diedit langsung dari dashboard (blur-to-save).
- **Playlist default** - pilih dari dropdown; ini yang dipakai saat tidak ada jadwal aktif.
- **Marquee (teks berjalan)** - isi teks bebas, plus switch aktif/nonaktif.
- **Jeda global** - tombol pause di remote menghentikan rotasi konten di layar itu.
- **Kode pairing** - dibuat ulang kapan saja, berlaku 30 menit, sekali pakai.
- **Salin URL player** - satu klik, langsung ke clipboard.
- **Buka player** - membuka tab baru untuk pratinjau.

**Marquee - teks berjalan di footer**

- Teks bebas, panjang sesuai kebutuhan.
- **Kecepatan menyesuaikan panjang teks** - rumusnya `panjang_teks x 0,28 detik`, minimal 15 detik.
  Teks pendek tidak berjalan terlalu lambat, teks panjang tidak terpotong.
- **Bisa dimatikan** tanpa menghapus teksnya.
- **Tidak menutupi konten** - area player dipendekkan otomatis setinggi marquee.
  Ini bug yang pernah terjadi dan sudah diperbaiki.

**Keunggulan operasional**

- **Status online otomatis** - TV mengirim heartbeat tiap 25 detik; dianggap online bila heartbeat terakhir di bawah 60 detik. Tidak perlu cek manual ke lokasi.
- **Filter dan pencarian** - Semua / Online / Offline, plus cari berdasarkan nama atau ID.
- **Pairing tanpa ketik URL panjang** - kode 8 karakter alfanumerik, ramah remote TV.
- **Kode sekali pakai dengan masa berlaku** - 30 menit, dan anonim tidak bisa membaca tabel kode (hanya lewat RPC `SECURITY DEFINER`).
- **Hemat daya perangkat** - player memakai Wake Lock agar layar tidak tidur; di APK ditambah `FLAG_KEEP_SCREEN_ON`.

---

### 10.7 Keamanan dan tata kelola

Fitur yang jarang ditonjolkan tapi menentukan saat dipakai instansi.

| Aspek | Implementasi |
| --- | --- |
| Isolasi data per bidang | RLS memakai `is_admin()` dan `my_bidang()`; operator hanya mengubah data miliknya/se-bidang |
| Pairing aman | tabel kode tanpa policy SELECT untuk anon; penukaran hanya lewat RPC `SECURITY DEFINER` |
| Session cookie | `httpOnly`, `sameSite=strict`, `secure` di produksi, 7 hari |
| Rate limiting | pembatasan percobaan pada login dan pairing, plus lockout sisi klien |
| Sanitasi XSS | semua teks yang tampil di TV dibersihkan dengan `isomorphic-dompurify` |
| URL YouTube | dibatasi allowlist domain |
| Security headers | CSP, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, HSTS |
| Darurat terkunci | `emergency_notice` hanya bisa diubah user terautentikasi |

**Pemisahan peran**

- `admin` - semua modul termasuk Pengumuman Suara, Darurat, dan Manajemen User.
- `operator_bidang` - hanya operasional harian; modul sensitif disembunyikan dan ditolak di level route.

---

## 11. Onboarding klien baru

Model yang dipakai: **satu project Supabase per klien**. Ini memberi isolasi data
fisik dan membuat klien menanggung biaya storage/egress medianya sendiri.

Alasan ringkasnya: policy `using (true)` pada tabel konten wajib untuk player TV
anonim, sehingga beberapa tenant dalam satu database akan saling bisa membaca data.

### 11.1 Langkah per klien

| # | Langkah | Estimasi |
| --- | --- | --- |
| 1 | Buat project Supabase baru | 3 menit |
| 2 | Jalankan 8 file SQL sesuai bagian 3.2 | 10 menit |
| 3 | Verifikasi dengan query bagian 3.3 | 3 menit |
| 4 | Buat akun admin pertama (bagian 4) | 2 menit |
| 5 | Deploy ke Vercel dengan 3 env var baru (bagian 5) | 5 menit |
| 6 | Domain kustom (opsional) | 10 menit |
| 7 | Buat layar + pairing TV di lokasi klien | 5 menit/layar |
| 8 | Uji checklist bagian 9 | 20 menit |

Total realistis: sekitar 1 jam untuk klien pertama, sekitar 30 menit untuk klien berikutnya.

### 11.2 Yang TIDAK boleh diubah saat onboarding

| Hal | Alasan |
| --- | --- |
| Nama kunci `siaran:paired-slug` | semua TV yang sudah dipasangkan akan minta PIN ulang |
| `media-src` pada CSP | video CDN jadi blank hitam |
| Nama file `proxy.ts` + export `proxy()` | Next.js 16 tidak mengenali `middleware.ts` |
| Struktur path bucket `media/` dan `announcer/` | kode menyusun URL dari path ini |

### 11.3 Biaya yang ditanggung klien

| Layanan | Perkiraan |
| --- | --- |
| Supabase Free | 500 MB database, 1 GB storage, 2 GB egress/bulan |
| Vercel Hobby | cukup untuk 1 instalasi |
| CDN media (Cloudflare/Cloudinary) | sesuai pemakaian - ini yang paling cepat tumbuh |

Untuk signage 24/7, **egress media** adalah biaya dominan. Sarankan klien memakai
CDN sendiri (mis. Cloudflare R2 atau Bunny) dan memasang URL-nya lewat fitur
CDN link generik di Konten Media.

### 11.4 Rekomendasi pengembangan berikutnya

Sebelum jumlah klien melewati sekitar 5, pertimbangkan:

1. **Tambahkan `org_id`** (nullable) ke semua tabel **sekarang**, walau masih satu project per klien. Biayanya 1 file migrasi, dan membuat migrasi ke multi-tenant nanti jauh lebih murah.
2. **Prefix path storage dengan `org_id`** (`<org>/media/...`) agar ekspor data per tenant bisa dilakukan tanpa menebak kepemilikan file.
3. **Script onboarding** yang menjalankan 8 file SQL otomatis via Supabase CLI, supaya langkah manual berkurang dan tidak ada yang terlewat.

---

## Lampiran: daftar perintah

```bash
# development
npm install
cp .env.example .env.local
npm run dev

# verifikasi
npm run build
npx tsc --noEmit
npx eslint . --max-warnings=999

# APK
cd apk-display && gradle wrapper --gradle-version 8.7
./gradlew :app:assembleDebug
adb install -r app/build/outputs/apk/debug/app-debug.apk
```
