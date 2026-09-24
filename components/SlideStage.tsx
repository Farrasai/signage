"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PlaylistItem } from "@/lib/types";
import { youtubeEmbedUrl } from "@/lib/utils";
import AgendaTable from "@/components/AgendaTable";

const FADE_MS = 500;

type Slot = { index: number; item: PlaylistItem };

/**
 * Merender playlist dengan dua lapis (front + back) yang ditumpuk:
 * - Lapis depan menampilkan item yang sedang tayang.
 * - Lapis belakang diam-diam menyiapkan (memuat) item BERIKUTNYA sepanjang
 *   durasi item saat ini masih berjalan — inilah bagian "prefetch"-nya, jadi
 *   saat gilirannya tiba, kontennya sudah ada di cache browser.
 * - Begitu pemutar induk pindah ke item berikutnya, kedua lapis saling
 *   crossfade (opacity) alih-alih diganti langsung — jadi tidak ada kedipan
 *   hitam/putih di antara pergantian slide.
 */
export default function SlideStage({
  items,
  currentIndex,
  onVideoEnded,
}: {
  items: PlaylistItem[];
  currentIndex: number;
  onVideoEnded: () => void;
}) {
  const [displayed, setDisplayed] = useState<Slot | null>(null);
  const [incoming, setIncoming] = useState<Slot | null>(null);
  const [incomingVisible, setIncomingVisible] = useState(false);

  const displayedRef = useRef<Slot | null>(null);
  const incomingRef = useRef<Slot | null>(null);
  const incomingReadyRef = useRef(false);
  const fadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    displayedRef.current = displayed;
  }, [displayed]);
  useEffect(() => {
    incomingRef.current = incoming;
  }, [incoming]);

  const commitIncoming = useCallback(() => {
    const inc = incomingRef.current;
    if (!inc) return;
    setDisplayed(inc);
    setIncoming(null);
    setIncomingVisible(false);
    incomingReadyRef.current = false;
  }, []);

  const startCrossfade = useCallback(() => {
    setIncomingVisible(true);
    if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
    fadeTimerRef.current = setTimeout(commitIncoming, FADE_MS);
  }, [commitIncoming]);

  const handleIncomingReady = useCallback(
    (forIndex: number) => {
      if (incomingRef.current?.index !== forIndex) return; // sudah tergantikan, abaikan
      if (incomingReadyRef.current) return;
      incomingReadyRef.current = true;
      // Cuma mulai crossfade kalau memang ini item yang sedang diminta pemutar.
      if (forIndex === currentIndex) startCrossfade();
    },
    [startCrossfade, currentIndex]
  );

  // Playlist baru dimuat (atau kosong) — mulai dari nol, tanpa transisi.
  useEffect(() => {
    if (items.length === 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDisplayed(null);
      setIncoming(null);
      setIncomingVisible(false);
      return;
    }
    const stillValid =
      displayedRef.current && items[displayedRef.current.index]?.id === displayedRef.current.item.id;
    if (!stillValid) {
      const idx = items[currentIndex] ? currentIndex : 0;
      setDisplayed({ index: idx, item: items[idx] });
      setIncoming(null);
      setIncomingVisible(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  // Item yang tayang sudah "menetap" → mulai siapkan satu item berikutnya
  // di lapis belakang, tersembunyi, sepanjang sisa durasi item ini.
  useEffect(() => {
    if (!displayed || items.length < 2) return;
    const nextIndex = (displayed.index + 1) % items.length;
    const nextItem = items[nextIndex];
    if (!nextItem || incomingRef.current?.item.id === nextItem.id) return;
    setIncoming({ index: nextIndex, item: nextItem });
    setIncomingVisible(false);
    incomingReadyRef.current = false;
  }, [displayed, items]);

  // Pemutar induk benar-benar pindah index → mulai crossfade (kalau sudah
  // siap) atau tandai agar crossfade jalan begitu selesai dimuat.
  useEffect(() => {
    if (!displayed || displayed.index === currentIndex) return;

    if (incomingRef.current?.index === currentIndex) {
      if (incomingReadyRef.current) startCrossfade();
    } else {
      // Lompatan tak terduga (prev/skip lewat remote) — ganti langsung.
      const item = items[currentIndex];
      if (item) {
        if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setDisplayed({ index: currentIndex, item });
        setIncoming(null);
        setIncomingVisible(false);
        incomingReadyRef.current = false;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex]);

  useEffect(() => {
    return () => {
      if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
    };
  }, []);

  return (
    <>
      {displayed && (
        <SlideLayer
          slot={displayed}
          opacity={1}
          isCurrent={displayed.index === currentIndex}
          onReady={() => {}}
          onVideoEnded={onVideoEnded}
        />
      )}
      {incoming && (
        <SlideLayer
          slot={incoming}
          opacity={incomingVisible ? 1 : 0}
          isCurrent={incoming.index === currentIndex}
          onReady={() => handleIncomingReady(incoming.index)}
          onVideoEnded={onVideoEnded}
          preloadOnly={!incomingVisible}
        />
      )}
    </>
  );
}

function SlideLayer({
  slot,
  opacity,
  isCurrent,
  onReady,
  onVideoEnded,
  preloadOnly = false,
}: {
  slot: Slot;
  opacity: number;
  isCurrent: boolean;
  onReady: () => void;
  onVideoEnded: () => void;
  preloadOnly?: boolean;
}) {
  const media = slot.item.media;
  if (!media) return null;

  return (
    <div
      className="absolute inset-0"
      style={{
        opacity,
        transition: `opacity ${FADE_MS}ms ease-in-out`,
        zIndex: preloadOnly ? 0 : 1,
        pointerEvents: preloadOnly ? "none" : "auto",
      }}
    >
      {media.type === "image" ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={media.url} alt="" className="h-full w-full object-cover" onLoad={onReady} />
      ) : media.type === "video" ? (
        <video
          src={media.url}
          className="h-full w-full object-cover"
          autoPlay={!preloadOnly}
          muted
          playsInline
          preload="auto"
          onLoadedData={onReady}
          onEnded={() => {
            if (isCurrent) onVideoEnded();
          }}
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
          frameBorder={0}
          onLoad={onReady}
        />
      )}
    </div>
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