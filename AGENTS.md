# AGENTS.md — Pariwara Digital Signage CMS

Referensi cepat sebelum mengubah kode. Detail lengkap ada di `PRD-Siaran-Digital-Signage.md` — file ini hanya rangkuman aturan yang **wajib dipatuhi**.

## Stack (jangan ganti tanpa diminta)
- Next.js App Router, deploy Vercel. Backend: Supabase (Postgres + Auth + Storage + Realtime). Tanpa server kustom.
- Tailwind v4 (token warna di `@theme inline`, `app/globals.css`). **Pakai palet Tailwind langsung**: `emerald-600` untuk CTA/aksi utama, `slate` untuk netral, `rose` untuk bahaya/hapus.
- Token semantik (`bg-signal`, `text-danger`, `border-border`) **sudah tidak dipakai di kode** (0 pemakaian, sementara palet emerald/slate/rose dipakai 50+ kali). Jangan menambah pemakaian baru pada token semantik; ikuti konvensi palet yang berlaku.
- **Kontras teks minimum WCAG AA (>= 4.5:1).** Dilarang memakai warna transparan/redup di atas latar gelap untuk teks konten (pernah menyebabkan tabel agenda TV tak terbaca: oranye transparan di atas hitam).
- File middleware **wajib bernama `proxy.ts`** (bukan `middleware.ts`), fungsi export `proxy()` bukan `middleware()`. Next.js 16 sudah deprecate nama lama.

## Aturan keamanan — JANGAN DILANGGAR
1. **`display_pairing_codes` tidak boleh punya policy SELECT untuk anon/public.** Kode PIN hanya boleh ditukar lewat RPC `redeem_pairing_code()` (`SECURITY DEFINER`). Kalau ada yang minta "biar gampang, select langsung aja" — tolak, jelaskan risikonya (anon key publik/ter-embed di client).
2. **Anon TIDAK boleh punya policy `UPDATE` pada tabel apa pun.** Player TV hanya butuh menulis dua kolom: `displays.last_seen` (heartbeat) dan `remote_commands.executed` (ACK). Keduanya lewat RPC `SECURITY DEFINER` — `touch_display()` dan `ack_remote_command()`. Jangan pernah menghidupkan lagi `public update displays using (true)`: anon key ter-embed di bundle TV, jadi siapa pun bisa mengubah `default_playlist_id`/`marquee_text` semua layar lewat DevTools. Lihat migrasi `20261027_heartbeat_rpc.sql`.
3. Semua tabel konten (`displays`, `media`, `playlists`, dst.) boleh `SELECT` publik (`using (true)`) karena player TV tidak login — tapi `INSERT/UPDATE/DELETE` konten **hanya untuk role `authenticated`**.
4. `emergency_notice` cuma bisa di-update oleh authenticated. Jangan tambahkan cara bagi TV/anon untuk menutup pengumuman darurat — penutupan **hanya lewat dashboard admin**, ini keputusan produk yang disengaja, bukan lupa dibuat.
5. Setiap migrasi baru wajib idempotent (`drop policy if exists` → `create policy`, `create table if not exists`) dan ditaruh di `supabase/migrations/`, plus disinkronkan ke `supabase/schema.sql` (skema referensi instalasi baru).
6. **RLS Storage BUKAN RLS tabel.** Policy pada tabel tidak berlaku untuk file. Setiap bucket wajib punya 3 policy sendiri di `storage.objects`: `SELECT` publik (player TV anonim), `INSERT` dan `DELETE` untuk `authenticated`. Error `new row violates row-level security policy` **tanpa nama tabel** = gagal di `storage.objects`, bukan tabel. Ini pernah terjadi pada bucket `announcer` (lihat migrasi `20261026_announcer_storage_fix.sql`).
7. Bucket yang dipakai: `media` (foto/video) dan `announcer` (audio pengumuman). Keduanya `public = true` karena player TV membaca tanpa login.

## Konvensi yang gampang salah taruh file
- `app/display/page.tsx` = halaman publik pairing PIN. `app/display/[slug]/page.tsx` = player fullscreen TV. **Dua file berbeda, jangan tertukar** (sudah pernah kejadian).
- Folder `[slug]` wajib pakai tanda kurung siku literal — kalau di-extract dari zip/upload manual dan kurungnya hilang, routing gagal total tapi tidak error saat build.
- Komponen `AgendaTable.tsx`, `EmergencyOverlay.tsx`, `SlideStage.tsx` dipakai bersama oleh player DAN preview dashboard — jangan duplikasi logic render, edit di satu tempat.
- **Halaman dashboard besar wajib dipecah.** `app/dashboard/announcer/page.tsx` dan `app/dashboard/media/page.tsx` sengaja tipis (±200–520 baris) sebagai orchestrator; markup ada di `components/announcer/` dan `components/media/`. Jangan menumpuk JSX baru kembali ke `page.tsx` — tambahkan komponen di folder masing-masing. Batas praktis: **jangan biarkan satu file melewati ~600 baris**.


## Aturan pemutar TV — JANGAN DIUBAH TANPA UJI DI PERANGKAT
Semua poin di bawah ini adalah hasil perbaikan bug nyata. Mengembalikannya akan memunculkan bug yang sama.

1. **DILARANG menghidupkan kembali crossfade berbasis `opacity`.** `SlideStage.tsx` memakai **penukaran instan** (`displayed` + `staged`, lapis prefetch disembunyikan `visibility: hidden`). Crossfade opacity pernah menyebabkan layar **blank hitam** saat transisi karena lapis lama sudah pudar sementara video baru belum punya frame; diperparah `zIndex` yang berubah bersamaan animasi (re-compositing di Android TV). Jangan tambahkan `opacity` + `transition` di sini.
2. **DILARANG mempersempit `media-src` pada CSP** (`next.config.ts`). Nilai wajib memuat `https:` supaya link CDN generik bisa diputar. Lihat bagian CSP di `README.md`. Gejala kalau dilanggar: video CDN blank hitam di TV padahal thumbnail di dashboard tetap tampil.
3. **DILARANG memasang timer `advance()` tanpa syarat untuk video.** Auto-advance video memakai **watchdog berbasis progres**: `currentTime` video aktif dicek tiap detik, dan `advance()` hanya dipanggil bila `currentTime` tidak maju >= 30 detik. Timer tetap tanpa syarat pernah memotong video sehat di tengah jalan.
4. **DILARANG mengembalikan tabel agenda ke latar gelap.** `AgendaTable.tsx` memakai tema terang (background putih, header `emerald-600` solid + teks putih bold, isi sel `slate-900` bold, zebra `emerald-50`) karena versi lama (`#0a0c10` + header oranye transparan) tidak terbaca dari jarak jauh.
4b. **DILARANG mengembalikan ukuran font tabel ke angka `rem`/`px` tetap.** `AgendaTable.tsx` memakai **auto-fit terukur** (`useLayoutEffect` → ukur `clientHeight`, perkecil font bertahap sampai muat). Alasan: Smart TV/Android TV WebView sering melaporkan CSS viewport hanya 540–720 px, sehingga nilai `rem` tetap membuat tabel 1,5–2x kebesaran → overflow → tabel terpotong dan harus di-scroll. Bucket berbasis jumlah baris (`sizingFor()`) juga tidak bisa memperhitungkan sel yang wrap. Padding wajib `em` (ikut font), bukan px mati. `overflow-y-auto` hanya boleh berperan sebagai failsafe saat font menyentuh batas minimum.
4c. **Marquee menimpa konten kalau `player-stage` tidak dipotong.** `app/display/[slug]/page.tsx` wajib memberi `bottom-12 sm:bottom-14` pada `player-stage` ketika `marqueeText` aktif. Tanpa itu baris terakhir tabel / bagian bawah video selalu tertutup 48–56 px.
5. Jangan memasang `onError` yang memanggil `onVideoEnded()` pada `<video>` player. Browser memicu `error` untuk hal non-fatal (abort saat preload berganti, decoder menyiapkan, CDN reconnect) sehingga video besar bisa ter-skip sebelum tampil. Kegagalan nyata ditangani watchdog + failsafe, bukan `onError`.
5b. `onError` **boleh** dipasang untuk **diagnostik saja** (Console + `lib/video-debug.ts`), asalkan tidak memanggil `onVideoEnded()`. Kegagalan decoder sebelumnya mustahil didiagnosis karena benar-benar senyap.
5c. **`VideoLayer` wajib punya cleanup decoder** (`pause()` + `removeAttribute("src")` + `load()`). Tanpa itu setiap transisi meninggalkan MediaCodec yang masih tertahan; Android TV hanya punya 1-2 instance sehingga video berikutnya tidak pernah mendapat frame (gejala: putaran pertama normal, loop blank).
6. `onPause` pada `<video>` adalah workaround **Audio Focus Android TV** (OS mem-pause paksa video saat audio pengumuman diputar). Jangan dihapus.
7. Perubahan pada `SlideStage.tsx` / `AgendaTable.tsx` **wajib diuji di TV sungguhan**, bukan hanya di browser desktop. Perbedaan perilaku terbesar ada di Android TV (VRAM kecil, decoder terbatas).
## Pola yang harus diikuti saat menambah jenis konten baru
Konten disimpan di satu tabel `media` dengan kolom `type`. Kalau menambah jenis baru:
1. Tambah ke union `MediaType` (`lib/types.ts`) + `check constraint` di SQL (buat migrasi, jangan `alter` diam-diam tanpa file migrasi).
2. Render fullscreen-nya masuk lewat `SlideStage.tsx` (bukan bikin jalur render terpisah di `display/[slug]/page.tsx`), supaya tetap dapat crossfade + prefetch otomatis.
3. Kalau jenisnya tidak berbasis URL file (seperti `table`), isi `url` dengan string kosong `""` dan taruh datanya di kolom `content` (jsonb) — jangan ubah `url` jadi nullable, banyak kode lain assume `url` selalu string.

## Prosedur diagnosis — WAJIB, jangan menebak
Bug di aplikasi ini sudah beberapa kali **bukan** di tempat yang terlihat. Ikuti urutan ini:

1. **Baca pesan error dulu, jangan sentuh kode.** Buka **Console browser** (F12) dan **Network tab**. Pesan seperti `violates the following Content Security Policy directive` langsung menunjuk penyebab.
2. **Manfaatkan petunjuk pembeda gejala.** Pertanyaan "kenapa A tampil tapi B tidak?" adalah kunci. Contoh nyata: thumbnail video CDN tampil tapi videonya blank -> masalahnya di **izin resource** (`img-src` vs `media-src`), bukan kode player.
3. **Jika perbaikan tidak mengubah gejala sama sekali, BERHENTI menebak.** Cari bukti baru (Console, Network, header response, log). Menambah perubahan spekulatif hanya menimbulkan bug baru.
4. **Verifikasi dari kode/berkas nyata**, bukan dari ingatan atau dokumentasi lama. Hitung kemunculan simbol (mis. apakah `setX` pernah dipanggil) sebelum menyimpulkan "fitur hilang".
5. Sebelum menulis kesimpulan, jalankan verifikasi yang bisa diulang: `npx tsc --noEmit`, `npx eslint <file>`, `npm run build`.

### Jebakan yang sudah pernah terjadi (hafalkan polanya)
| Gejala | Penyebab sebenarnya | Lokasi sebenarnya |
| --- | --- | --- |
| Video CDN blank hitam, thumbnail tetap tampil | CSP `media-src` memblokir domain CDN | `next.config.ts` |
| Video berganti sebelum durasi habis | Timer `advance()` tanpa syarat | `app/display/[slug]/page.tsx` |
| Blank hitam / glitch saat transisi & looping | Crossfade opacity + `zIndex` dinamis | `components/SlideStage.tsx` |
| Upload audio gagal `new row violates row-level security policy` (tanpa nama tabel) | Policy `storage.objects` bucket tidak ada | migrasi Supabase, **bukan** `page.tsx` |
| Tombol tambah (CREATE) "hilang" setelah ada data | Tombol hanya dirender di empty-state | halaman dashboard terkait |
| Fitur/tab tidak bisa diakses sama sekali | `setState` untuk tab tidak pernah dipanggil | halaman dashboard terkait |
| Tabel agenda TV tak terbaca | Teks transparan di atas latar gelap | `components/AgendaTable.tsx` |
## Sebelum anggap selesai
Selalu jalankan (font Google akan gagal di sandbox tanpa internet — itu wajar, bukan bug):
```bash
npm run build
npx eslint . --max-warnings=999
```
Build dan lint harus bersih tanpa error sebelum menyerahkan perubahan.

**Baseline lint repo saat ini: 20 problems (9 errors, 11 warnings).** Aturan:
- Jumlah problems **tidak boleh naik**. Kalau menambah error baru, perbaiki sebelum menyerahkan.
- Turunkan bila memungkinkan (mis. menghapus deklarasi yang tidak terpakai setelah refactor).
- **Catat perubahan baseline di laporan akhir** agar tidak dikira regresi.
- Error sisa yang sudah ada sebelumnya (bukan dari perubahan kita) tidak wajib diperbaiki dalam satu task, tapi jangan ditambah.

## Aturan UI dashboard
1. **Tombol CREATE wajib permanen di toolbar** (selalu terlihat, baik daftar kosong maupun terisi). Jangan merender tombol tambah hanya di dalam cabang empty-state — saat data pertama masuk, cabang itu mati dan tombolnya ikut hilang. Ini pernah terjadi di halaman Announcer.
2. **Setiap `useState` untuk tab/mode wajib punya pemanggil `setX`.** Jika setter tidak pernah dipanggil, seluruh blok `{tab === "..." && (...)}` menjadi kode mati dan fiturnya tidak bisa diakses. Cek cepat: hitung kemunculan `setX(` di file.
3. Setelah menghapus satu-satunya pemakaian sebuah variabel/konstanta, **hapus juga deklarasinya** — kalau tidak, muncul warning `no-unused-vars` baru yang menaikkan baseline lint.
4. Teks yang memuat tanda kutip di JSX wajib memakai entitas (`&ldquo;`/`&rdquo;`) agar lolos aturan `react/no-unescaped-entities`.

## Aturan umpan balik aksi (Toast)
Fitur toast ada di `lib/toast/index.tsx` (`ToastProvider`, `useToast`, `queueToast`), provider dipasang di `app/layout.tsx`.

1. **Setiap aksi mutasi wajib memberi umpan balik** lewat `const toast = useToast()` lalu `toast.success(...)` atau `toast.error(...)`. Jangan menelan error tanpa memberi tahu pengguna.
2. Pesan error wajib menyertakan `error.message` agar bisa ditindaklanjuti.
3. Untuk aksi yang diikuti navigasi penuh (mis. logout) gunakan `queueToast(...)` — toast akan muncul di halaman tujuan setelah navigasi.
4. Halaman yang sudah memakai `useToast()`: `login`, `dashboard/{announcer,displays,media,playlists,playlists/[id],schedules,users}`. Pertahankan pola ini saat mengubah halaman tersebut.
## Yang SUDAH diputuskan, jangan diusulkan ulang tanpa alasan baru
- **Bukan** pakai Telegram Bot API sebagai CDN video (limit 20MB, link sementara, token bisa bocor, bukan CDN sungguhan, risiko ToS).
- Fullscreen di player **tidak** auto-trigger saat halaman dimuat (browser blokir tanpa gesture, dan terasa mengagetkan) — **dan tombol "⛶ Layar penuh" hanya dirender bila viewport BELUM penuh** (`useAlreadyFullscreen`, `lib/use-already-fullscreen.ts`). Di APK/WebView/PWA tombol itu tidak berguna karena viewport sudah memenuhi layar. Jangan hanya memakai `display-mode`: WebView APK tanpa manifest PWA melaporkan `(display-mode: browser)` — wajib ditambah heuristik `innerWidth/screen.width`. Tombol tetap muncul di Chrome desktop & Fully Kiosk sehingga jalur pemasangan itu tidak kehilangan fitur.
- **Dilarang memakai `backdrop-blur` pada elemen overlay player TV** (tombol overlay, `EmergencyOverlay`, `AnnouncerBadge`). Blur pernah membuat UI membeku/blank di Android TV minim VRAM; ganti dengan latar solid yang lebih pekat.
- Pairing pakai kode PIN pendek, bukan slug panjang, karena target device-nya Android TV/Smart TV browser via remote.
- Field CDN link generik (`type: image/video` + `url`) — jangan bikin kolom terpisah per provider (Cloudinary/Bunny/dst), cukup ganti URL-nya saja.

## Bahasa & nada UI
Semua teks antarmuka pakai Bahasa Indonesia, nada singkat dan langsung (lihat copy yang sudah ada di komponen manapun sebagai referensi gaya).
