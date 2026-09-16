"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Display, PlaylistItem, RemoteCommand, Schedule } from "@/lib/types";
import { resolveActiveSchedule, youtubeEmbedUrl } from "@/lib/utils";

export default function DisplayPlayerPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;

  const [supabase] = useState(() => createClient());
  const [display, setDisplay] = useState<Display | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [items, setItems] = useState<PlaylistItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [tick, setTick] = useState(0);
  const [fsActive, setFsActive] = useState(false);

  const itemsRef = useRef<PlaylistItem[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  // ---------- Load display by slug ----------
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.from("displays").select("*").eq("slug", slug).maybeSingle();
      if (cancelled) return;
      if (!data) {
        setNotFound(true);
        return;
      }
      setDisplay(data as Display);
    })();
    return () => {
      cancelled = true;
    };
  }, [slug, supabase]);

  // ---------- Heartbeat so the dashboard knows this screen is online ----------
  useEffect(() => {
    if (!display) return;
    const beat = async () => {
      await supabase
        .from("displays")
        .update({ last_seen: new Date().toISOString() })
        .eq("id", display.id);
    };
    beat();
    const id = setInterval(beat, 25000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [display?.id]);

  // ---------- Schedules: fetched on load, refreshed periodically ----------
  const refreshSchedules = useCallback(async () => {
    if (!display) return;
    const { data } = await supabase.from("schedules").select("*").eq("display_id", display.id);
    setSchedules(data ?? []);
  }, [display, supabase]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refreshSchedules();
    const id = setInterval(() => {
      refreshSchedules();
      setTick((t) => t + 1);
    }, 30000);
    return () => clearInterval(id);
  }, [refreshSchedules]);

  const activePlaylistId = useMemo(() => {
    if (!display) return null;
    const active = resolveActiveSchedule(schedules);
    return active?.playlist_id ?? display.default_playlist_id;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [display, schedules, tick]);

  // ---------- Load playlist items whenever the active playlist changes ----------
  useEffect(() => {
    let cancelled = false;
    if (!activePlaylistId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setItems([]);
      setCurrentIndex(0);
      return;
    }
    (async () => {
      const { data } = await supabase
        .from("playlist_items")
        .select("*, media(*)")
        .eq("playlist_id", activePlaylistId)
        .order("sort_order", { ascending: true });
      if (!cancelled) {
        setItems((data as unknown as PlaylistItem[]) ?? []);
        setCurrentIndex(0);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activePlaylistId, supabase]);

  // ---------- Advance / rewind ----------
  const advance = useCallback(() => {
    setCurrentIndex((i) => {
      const len = itemsRef.current.length;
      return len === 0 ? 0 : (i + 1) % len;
    });
  }, []);

  const goPrev = useCallback(() => {
    setCurrentIndex((i) => {
      const len = itemsRef.current.length;
      return len === 0 ? 0 : (i - 1 + len) % len;
    });
  }, []);

  // ---------- Realtime: display config changes + remote control commands ----------
  useEffect(() => {
    if (!display) return;
    const channel = supabase
      .channel(`display-${display.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "displays", filter: `id=eq.${display.id}` },
        (payload) => setDisplay(payload.new as Display)
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "remote_commands",
          filter: `display_id=eq.${display.id}`,
        },
        async (payload) => {
          const cmd = payload.new as RemoteCommand;
          if (cmd.command === "refresh") {
            window.location.reload();
            return;
          }
          if (cmd.command === "next") advance();
          if (cmd.command === "prev") goPrev();
          await supabase.from("remote_commands").update({ executed: true }).eq("id", cmd.id);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [display, supabase, advance, goPrev]);

  // ---------- Auto-advance timer for the current item ----------
  const currentItem = items[currentIndex];
  const paused = display?.is_paused ?? false;

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (paused || !currentItem?.media) return;

    // Uploaded videos advance on their own "ended" event; only set a
    // safety timer if the operator explicitly overrode the duration.
    if (currentItem.media.type === "video" && !currentItem.duration_override) {
      return;
    }

    const seconds = currentItem.duration_override ?? currentItem.media.duration ?? 10;
    timerRef.current = setTimeout(advance, Math.max(1, seconds) * 1000);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [currentItem, paused, advance]);

  // ---------- Fullscreen + wake lock ----------
  const enableFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      }
      setFsActive(true);
    } catch {
      // Beberapa TV browser tidak mengizinkan fullscreen API — tidak masalah.
    }
    try {
      wakeLockRef.current = (await navigator.wakeLock?.request("screen")) ?? null;
    } catch {
      // Wake Lock tidak didukung — layar mungkin tidur sesuai pengaturan TV.
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    enableFullscreen();
    const onVisible = () => {
      if (document.visibilityState === "visible") enableFullscreen();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [enableFullscreen]);

  // ---------- Render ----------
  if (notFound) {
    return (
      <FullscreenShell>
        <div className="text-center">
          <p className="text-lg text-text-muted">Layar tidak ditemukan.</p>
          <p className="mt-1 text-sm text-text-muted">
            Periksa kembali URL yang diberikan di dashboard.
          </p>
        </div>
      </FullscreenShell>
    );
  }

  if (!display) {
    return <FullscreenShell>{null}</FullscreenShell>;
  }

  const marqueeText = display.marquee_enabled ? display.marquee_text.trim() : "";
  const marqueeDuration = Math.max(15, marqueeText.length * 0.28);

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-black">
      {!fsActive && (
        <button
          onClick={enableFullscreen}
          className="absolute right-3 top-3 z-30 rounded-md border border-white/20 bg-black/40 px-3 py-1.5 text-xs text-white/70 backdrop-blur hover:bg-black/60"
        >
          ⛶ Layar penuh
        </button>
      )}

      <div className="absolute inset-0">
        {!currentItem?.media ? (
          <WaitingScreen name={display.name} hasPlaylist={Boolean(activePlaylistId)} />
        ) : currentItem.media.type === "image" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={currentItem.id}
            src={currentItem.media.url}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : currentItem.media.type === "video" ? (
          <video
            key={currentItem.id}
            src={currentItem.media.url}
            className="h-full w-full object-cover"
            autoPlay
            muted
            playsInline
            onEnded={advance}
          />
        ) : (
          <iframe
            key={currentItem.id}
            src={youtubeEmbedUrl(
              currentItem.media.type as "youtube_video" | "youtube_playlist",
              currentItem.media.url
            )}
            className="h-full w-full"
            allow="autoplay; encrypted-media; fullscreen"
            frameBorder={0}
          />
        )}
      </div>

      {marqueeText && (
        <div className="absolute inset-x-0 bottom-0 z-20 flex h-12 items-center overflow-hidden bg-black/70 backdrop-blur-sm sm:h-14">
          <div
            className="marquee-track text-base font-medium text-white sm:text-lg"
            style={{ animationDuration: `${marqueeDuration}s` }}
          >
            <span className="px-8">{marqueeText}</span>
            <span className="px-8">{marqueeText}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function WaitingScreen({ name, hasPlaylist }: { name: string; hasPlaylist: boolean }) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-[#0a0c10] text-center">
      <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-[#ff6a3d]" />
      <p className="text-xl font-medium text-white">{name}</p>
      <p className="max-w-md text-sm text-white/50">
        {hasPlaylist
          ? "Playlist ini belum memiliki konten. Tambahkan dari dashboard."
          : "Belum ada playlist yang diatur untuk layar ini. Atur dari dashboard."}
      </p>
    </div>
  );
}

function FullscreenShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-black">{children}</div>
  );
}
