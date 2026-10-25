# Siaran â€” Digital Signage CMS

CMS sederhana untuk mengelola TV / video wall dari mana saja: pilih foto, video,
atau playlist YouTube; atur durasi tiap konten; jadwalkan per hari & jam;
kendalikan layar dari jarak jauh (refresh, next/prev, jeda); tampil fullscreen
lengkap dengan teks berjalan (marquee) di footer.

- **Frontend & backend app**: Next.js (App Router) â€” siap deploy ke **Vercel**
- **Database, auth, storage/CDN, realtime**: **Supabase** (free tier, cukup untuk skala kecilâ€“menengah)

Tidak ada server tambahan yang perlu dikelola â€” dua layanan gratis ini sudah cukup.

---

## 1. Struktur

```
app/
  login/                 halaman login admin
  dashboard/             panel kontrol (butuh login)
    displays/            kelola daftar TV/layar
    media/                perpustakaan konten (upload / YouTube)
    playlists/            susun urutan & durasi konten
    schedules/             jadwal playlist per hari/jam
  display/[slug]/         halaman fullscreen yang dibuka di TV
supabase/schema.sql       skema database + RLS + storage bucket
```

## 2. Siapkan Supabase (gratis)

1. Buat project baru di [supabase.com](https://supabase.com) (paket Free sudah cukup).
2. Buka **SQL Editor** â†’ tempel seluruh isi `supabase/schema.sql` â†’ **Run**.
   Ini akan membuat semua tabel, mengaktifkan realtime, mengatur Row Level
   Security, dan membuat bucket Storage `media` (dipakai sebagai CDN untuk
   foto/video yang diunggah).
3. Buka **Authentication â†’ Users â†’ Add user**, buat satu akun admin (email +
   password). Aplikasi ini sengaja tidak punya halaman "daftar" publik â€”
   hanya admin yang dibuatkan akun yang bisa masuk ke dashboard.
4. Buka **Project Settings â†’ API**, salin:
   - `Project URL` â†’ `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public key` â†’ `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## 3. Jalankan lokal (opsional)

```bash
npm install
cp .env.example .env.local   # isi dengan nilai dari langkah 2.4
npm run dev
```

Buka `http://localhost:3000` â†’ otomatis diarahkan ke halaman login.

## 4. Deploy ke Vercel

1. Push folder ini ke repository GitHub/GitLab, lalu import ke
   [vercel.com/new](https://vercel.com/new). **Atau** pakai CLI: `npx vercel`.
2. Saat setup, tambahkan Environment Variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Deploy. Selesai â€” dashboard bisa diakses dari mana saja, dan setiap TV
   tinggal membuka URL layarnya masing-masing.

## 5. Memasang TV / video wall

1. Di dashboard â†’ **Layar & TV** â†’ **Tambah layar** â†’ beri nama (mis. "TV Lobby").
2. Salin URL yang muncul (`https://domain-anda.vercel.app/display/nama-slug-nya`).
3. Buka URL itu di browser pada TV/Android TV box/mini PC yang terhubung ke
   layar. Untuk hasil terbaik dan agar berjalan 24/7 tanpa gangguan:
   - Gunakan aplikasi kiosk browser seperti **Fully Kiosk Browser** (Android TV box),
     atau jalankan Chrome dengan flag `--kiosk https://domain-anda.vercel.app/display/slug`
     di mini PC/PC yang disambungkan ke TV lewat HDMI.
   - Aktifkan "Launch on boot" di aplikasi kiosk agar otomatis menyala saat TV dinyalakan.
   - Halaman sudah otomatis meminta mode layar penuh & mencegah layar tidur
     (Wake Lock) saat dibuka; ada juga tombol "â›¶ Layar penuh" kecil di pojok
     jika browser memerlukan interaksi pengguna sekali untuk mengaktifkannya.
4. Tambahkan konten di **Konten** (upload foto/video, atau tempel link
   YouTube), susun jadi **Playlist**, lalu pasang playlist itu ke layar di
   halaman **Layar & TV**. Perubahan langsung tersiar ke TV dalam hitungan
   detik lewat Supabase Realtime â€” tidak perlu refresh manual di TV.

## 6. Yang perlu diketahui

- **Resolusi**: tampilan otomatis menyesuaikan ukuran layar (mendukung Full HD
  1080p dan lebih tinggi) â€” foto/video mengisi penuh layar (`object-fit: cover`).
- **Durasi konten**: setiap foto/video/YouTube punya durasi tampil (detik) yang
  bisa diatur di halaman Konten, dan bisa ditimpa per-item di dalam Playlist.
  Video yang diunggah otomatis lanjut ke konten berikutnya saat videonya
  selesai diputar (bukan berdasarkan timer), kecuali durasi ditimpa manual.
- **YouTube**: karena memakai YouTube embed (tanpa API key, gratis, tanpa
  kuota), durasi video YouTube tidak dideteksi otomatis â€” atur sendiri durasi
  putarnya (mis. sepanjang video tersebut) saat menambahkannya.
- **Remote control**: tombol â® â¸/â–¶ â­ âŸ³ di dashboard mengirim perintah lewat
  Supabase Realtime ke layar yang sedang terbuka, di mana pun lokasinya.
- **Jadwal**: jika ada jadwal yang cocok dengan hari & jam saat ini, playlist
  jadwal itu dipakai; jika tidak, layar kembali ke playlist default-nya.
- **Keamanan**: RLS pada `schema.sql` dibuat agar sederhana â€” layar (anonim)
  boleh membaca semua konten & memperbarui statusnya sendiri, sementara
  membuat/mengubah/menghapus konten hanya bisa oleh admin yang login. Ini
  cocok untuk pemakaian internal; untuk publik/skala besar, pertimbangkan
  memperketat kebijakan RLS lebih lanjut.

## 7. Link CDN video & Content Security Policy (PENTING)

Aplikasi ini mendukung **link CDN generik** untuk foto/video (Cloudinary, Bunny,
server sendiri, dll) selain upload ke Supabase Storage.

Agar video dari domain luar bisa diputar, header CSP di `next.config.ts` **harus**
mengizinkan domain tersebut pada direktif `media-src`. Saat ini diset:

```
media-src self blob: data: https:
```

- `https:` -> semua CDN via HTTPS diizinkan (tidak perlu diubah saat ganti provider).
- `blob:` -> untuk preview upload (`URL.createObjectURL`).
- `data:` -> untuk media inline.

**Jangan pernah mempersempit `media-src` hanya ke `self` + Supabase** tanpa
menambahkan domain CDN, karena video CDN akan **blank hitam** di player TV padahal
thumbnail-nya tetap tampil di dashboard (thumbnail diatur `img-src`, bukan
`media-src`). Ini pernah terjadi dan sangat membingungkan karena tidak ada error
di server maupun log aplikasi.

Untuk mengecek cepat: buka player TV, tekan F12 lalu tab **Console**. Jika muncul pesan
tentang `violates the following Content Security Policy directive` pada
`media-src`, berarti domain CDN belum diizinkan.

Setelah mengubah CSP, **restart server** dan **hard refresh** browser TV (Ctrl+Shift+R)
karena header CSP di-cache browser.
