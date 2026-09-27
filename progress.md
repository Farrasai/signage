# Progress — Siaran Digital Signage CMS

Catatan ringkasan semua task yang sudah dikerjakan pada project ini.
Diperbarui otomatis setiap ada penambahan atau perubahan kode.

---

## 📋 Riwayat Task

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
│   ├── globals.css                # Token warna Tailwind v4
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── AgendaTable.tsx            # Tabel agenda (shared)
│   ├── EditMediaModal.tsx         # Modal edit konten media
│   ├── EmergencyOverlay.tsx       # Overlay darurat (shared)
│   ├── Modal.tsx                  # Komponen modal generik
│   ├── RemoteControls.tsx         # Kontrol remote dari dashboard
│   ├── Sidebar.tsx                # Navigasi dashboard
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
│   └── schema.sql                 # Skema DB lengkap (referensi instalasi baru)
├── proxy.ts                       # Middleware auth (Next.js 16)
├── AGENTS.md                      # Aturan wajib untuk coding agent
└── progress.md                    # File ini
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

_Terakhir diperbarui: 2026-09-27_
