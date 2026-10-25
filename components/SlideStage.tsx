"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PlaylistItem } from "@/lib/types";
import { youtubeEmbedUrl } from "@/lib/utils";
import AgendaTable from "@/components/AgendaTable";

/** Batas tunggu maksimal agar konten berikutnya siap sebelum ditukar paksa. */
const READY_TIMEOUT_MS = 8000;

type Slot = { index: number; item: PlaylistItem };

/**
 * Merender playlist TANPA crossfade: pergantian konten dilakukan instan.
 *
 * Alasan desain (penting — jangan diubah jadi crossfade tanpa menguji di TV):
 * Crossfade berbasis opacity pernah menyebabkan layar blank hitam saat transisi,
 * karena lapis lama sudah memudar sementara video baru belum sempat menampilkan
 * frame pertamanya (terutama video CDN berukuran besar). Dengan penukaran instan,
 * konten lama TETAP terlihat penuh sampai konten baru benar-benar siap, lalu ditukar
 * dalam satu render React — tidak pernah ada momen opacity rendah / layar kosong.
 *
 * Prefetch tetap dipertahankan: konten berikutnya di-mount tersembunyi supaya sudah
 * ter-buffer saat gilirannya tiba.
 */
export default function SlideStage({
  items,
  currentIndex,
  onVideoEnded,
  onActiveVideoChange,
}: {
  items: PlaylistItem[];
  currentIndex: number;
  onActiveVideoChange?: (el: HTMLVideoElement | null) => void;
  onVideoEnded: () => void;
}) {
  /** Satu-satunya lapis yang terlihat. */
  const [displayed, setDisplayed] = useState<Slot | null>(null);
  /** Kandidat pengganti: sudah di-mount (prefetch) tapi belum ditukar. */
  const [staged, setStaged] = useState<Slot | null>(null);

  const displayedRef = useRef<Slot | null>(null);
  const stagedRef = useRef<Slot | null>(null);
  const stagedReadyRef = useRef(false);
  const readyFailsafeRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Index yang diminta pemutar induk (ref agar tidak menangkap closure lama). */
  const currentIndexRef = useRef(currentIndex);

  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

  useEffect(() => {
    displayedRef.current = displayed;
  }, [displayed]);
  useEffect(() => {
    stagedRef.current = staged;
  }, [staged]);
  const clearReadyFailsafe = useCallback(() => {
    if (readyFailsafeRef.current) {
      clearTimeout(readyFailsafeRef.current);
      readyFailsafeRef.current = null;
    }
  }, []);

  /** Tukar instan: kandidat menjadi tayang, kandidat dikosongkan. Satu batch render. */
  const swapIn = useCallback(() => {
    const next = stagedRef.current;
    if (!next) return;
    clearReadyFailsafe();
    setDisplayed(next);
    setStaged(null);
    stagedReadyRef.current = false;
  }, [clearReadyFailsafe]);

  const handleStagedReady = useCallback(
    (forIndex: number) => {
      if (stagedRef.current?.index !== forIndex) return; // sudah tergantikan
      if (stagedReadyRef.current) return;
      stagedReadyRef.current = true;
      // Tukar hanya kalau ini memang item yang sedang diminta pemutar.
      if (forIndex === currentIndexRef.current) swapIn();
    },
    [swapIn]
  );

  // Playlist baru dimuat (atau kosong) -> mulai dari nol.
  useEffect(() => {
    if (items.length === 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDisplayed(null);
      setStaged(null);
      return;
    }
    const stillValid =
      displayedRef.current && items[displayedRef.current.index]?.id === displayedRef.current.item.id;
    if (!stillValid) {
      const idx = items[currentIndex] ? currentIndex : 0;
      setDisplayed({ index: idx, item: items[idx] });
      setStaged(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  // Pemutar induk pindah index -> siapkan pengganti, tukar begitu siap.
  useEffect(() => {
    const cur = displayedRef.current;
    if (!cur) return;
    if (cur.index === currentIndex) return;

    const targetItem = items[currentIndex];
    if (!targetItem) return;

    const st = stagedRef.current;
    if (st && st.index === currentIndex && st.item.id === targetItem.id) {
      // Sudah diprefetch oleh efek di bawah.
      if (stagedReadyRef.current) {
        swapIn();
      } else {
        clearReadyFailsafe();
        readyFailsafeRef.current = setTimeout(() => {
          if (stagedRef.current?.index === currentIndexRef.current) swapIn();
        }, READY_TIMEOUT_MS);
      }
      return;
    }

    // Belum ada / salah kandidat: pasang item tujuan sebagai kandidat.
    // status ready TIDAK di-reset agar item yang sudah siap dari prefetch
    // tidak perlu menunggu lagi.
    clearReadyFailsafe();
    stagedRef.current = { index: currentIndex, item: targetItem };
    setStaged({ index: currentIndex, item: targetItem });
    readyFailsafeRef.current = setTimeout(() => {
      if (stagedRef.current?.index === currentIndexRef.current) swapIn();
    }, READY_TIMEOUT_MS);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex]);

  // Prefetch: siapkan item BERIKUTNYA secara tersembunyi sepanjang durasi item ini.
  useEffect(() => {
    if (!displayed || items.length < 2) return;
    if (displayed.index !== currentIndex) return; // transisi masih menunggu
    const nextIndex = (displayed.index + 1) % items.length;
    const nextItem = items[nextIndex];
    if (!nextItem) return;
    if (stagedRef.current?.item.id === nextItem.id) return;
    // Jangan timpa kandidat yang sudah dipilih efek [currentIndex].
    if (staged) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStaged({ index: nextIndex, item: nextItem });
    stagedReadyRef.current = false;
  }, [displayed, items, currentIndex, staged]);

  useEffect(() => {
    return () => {
      if (readyFailsafeRef.current) clearTimeout(readyFailsafeRef.current);
    };
  }, []);

  return (
    <>
      {displayed && (
        <SlideLayer
          slot={displayed}
          isCurrent={displayed.index === currentIndex}
          onReady={() => {}}
          onVideoEnded={onVideoEnded}
          onActiveVideoChange={onActiveVideoChange}
        />
      )}
      {staged && (
        <SlideLayer
          slot={staged}
          isCurrent={staged.index === currentIndex}
          onReady={() => handleStagedReady(staged.index)}
          onVideoEnded={onVideoEnded}
          hidden
        />
      )}
    </>
  );
}

function SlideLayer({
  slot,
  isCurrent,
  onReady,
  onVideoEnded,
  onActiveVideoChange,
  hidden = false,
}: {
  slot: Slot;
  isCurrent: boolean;
  onReady: () => void;
  onVideoEnded: () => void;
  onActiveVideoChange?: (el: HTMLVideoElement | null) => void;
  /** true = lapis prefetch (tidak terlihat, hanya memuat). */
  hidden?: boolean;
}) {
  const media = slot.item.media;
  if (!media) return null;

  // Sengaja TIDAK memakai opacity/transition. Lapis prefetch disembunyikan total
  // (visibility) sehingga tidak ikut ter-composite; pertukaran dilakukan instan.
  return (
    <div
      className="absolute inset-0"
      style={{
        visibility: hidden ? "hidden" : "visible",
        pointerEvents: hidden ? "none" : "auto",
        zIndex: hidden ? 0 : 1,
      }}
      aria-hidden={hidden || undefined}
    >
      {media.type === "image" ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={media.url}
          alt=""
          className="h-full w-full object-cover"
          onLoad={onReady}
          onError={onReady}
        />
      ) : media.type === "video" ? (
        <VideoLayer
          key={media.url}
          url={media.url}
          isCurrent={isCurrent}
          preloadOnly={hidden}
          onReady={onReady}
          onVideoEnded={onVideoEnded}
          onActiveVideoChange={onActiveVideoChange}
        />
      ) : media.type === "table" && media.content ? (
        <ReadyOnMount onReady={onReady}>
          <AgendaTable
            title={media.content.title}
            columns={media.content.columns}
            rows={media.content.rows}
          />
        </ReadyOnMount>
      ) : (
        <iframe
          src={youtubeEmbedUrl(
            media.type as "youtube_video" | "youtube_playlist",
            media.url
          )}
          className="h-full w-full"
          allow="autoplay; encrypted-media; fullscreen"
          sandbox="allow-scripts allow-same-origin allow-presentation"
          frameBorder={0}
          onLoad={onReady}
          loading="lazy"
        />
      )}
    </div>
  );
}

/**
 * Pemutar video tunggal.
 *
 * Catatan penting:
 * - `onError` SENGAJA tidak memanggil onVideoEnded(). Browser memicu "error" untuk
 *   banyak hal non-fatal (abort saat preload berganti, decoder menyiapkan, CDN
 *   reconnect). Dulu ini membuat video besar di-skip sebelum tampil.
 * - Sinyal "siap" (onReady) baru dikirim saat readyState >= 2 (ada data frame)
 *   atau saat event playing, supaya pertukaran tidak pernah menampilkan frame kosong.
 */
function VideoLayer({
  url,
  isCurrent,
  preloadOnly,
  onReady,
  onVideoEnded,
  onActiveVideoChange,
}: {
  url: string;
  isCurrent: boolean;
  preloadOnly: boolean;
  onReady: () => void;
  onVideoEnded: () => void;
  onActiveVideoChange?: (el: HTMLVideoElement | null) => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  /** true setelah unmount — cegah play()/onVideoEnded() spurious. */
  const disposedRef = useRef(false);
  const readySentRef = useRef(false);

  useEffect(() => {
    disposedRef.current = false;
    return () => {
      disposedRef.current = true;
    };
  }, []);

  /** Kirim sinyal siap hanya kalau sudah ada data frame (bukan sekadar metadata). */
  const markReady = useCallback(() => {
    if (readySentRef.current) return;
    const v = videoRef.current;
    if (v && v.readyState < 2) return; // belum ada frame -> jangan tukar dulu
    readySentRef.current = true;
    onReady();
  }, [onReady]);

  // Mulai pemutaran saat lapis ini jadi aktif (bukan sekadar atribut autoPlay,
  // yang tidak berpengaruh pada elemen yang sudah ter-mount).
  useEffect(() => {
    const v = videoRef.current;
    if (!v || preloadOnly) return;
    // Sebagian browser TV mengabaikan atribut muted -> set lewat properti juga.
    v.muted = true;
    const attempt = v.play();
    if (attempt && typeof attempt.catch === "function") {
      attempt.catch(() => {
        // Ditolak (belum ada gesture / decoder belum siap). Bukan fatal.
      });
    }
  }, [preloadOnly, url]);

  // Laporkan elemen video AKTIF ke pemutar induk (dipakai watchdog durasi).
  useEffect(() => {
    if (!onActiveVideoChange) return;
    if (preloadOnly) {
      onActiveVideoChange(null);
      return;
    }
    onActiveVideoChange(videoRef.current);
    return () => onActiveVideoChange(null);
  }, [preloadOnly, url, onActiveVideoChange]);

  return (
    <video
      ref={videoRef}
      src={url}
      className="h-full w-full object-cover"
      autoPlay={!preloadOnly}
      muted
      playsInline
      // Sengaja TETAP "auto" (tidak diubah saat runtime). Mengubah atribut preload
      // pada <video> yang sudah hidup memicu abort request + event error.
      preload="auto"
      // readyState >= 2 berarti sudah ada frame; baru saat itu aman untuk ditukar.
      onLoadedData={markReady}
      onCanPlay={markReady}
      onPlaying={markReady}
      onEnded={() => {
        if (isCurrent && !disposedRef.current) onVideoEnded();
      }}
      onPause={(e) => {
        // Android TV Audio Focus workaround: OS force-pauses muted videos when Audio plays.
        if (isCurrent && !preloadOnly && !disposedRef.current) {
          const v = e.target as HTMLVideoElement;
          if (v.ended || v.error) return;
          if (!Number.isFinite(v.duration) || v.currentTime >= v.duration - 0.5) return;
          if (v.readyState === 0) return;
          v.play().catch(() => {
            if (disposedRef.current || !isCurrent) return;
            console.warn("Decoder crashed or focus locked. Skipping video.");
            onVideoEnded();
          });
        }
      }}
    />
  );
}

/** Menandai "siap" sesaat setelah konten (mis. tabel) selesai dipasang ke DOM. */
function ReadyOnMount({ onReady, children }: { onReady: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const id = requestAnimationFrame(onReady);
    return () => cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return <>{children}</>;
}
