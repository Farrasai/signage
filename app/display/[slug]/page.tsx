"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Display, EmergencyNotice, PlaylistItem, RemoteCommand, Schedule, AnnouncerItem, Announcement, DayOfWeek } from "@/lib/types";
import { PAIRING_STORAGE_KEY, resolveActiveSchedule } from "@/lib/utils";
import EmergencyOverlay from "@/components/EmergencyOverlay";
import SlideStage from "@/components/SlideStage";
import AnnouncerBadge from "@/components/AnnouncerBadge";

export default function DisplayPlayerPage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const slug = params.slug;

  const [supabase] = useState(() => createClient());
  const [display, setDisplay] = useState<Display | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [items, setItems] = useState<PlaylistItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [tick, setTick] = useState(0);
  const [fsActive, setFsActive] = useState(false);
  const [emergencyNotice, setEmergencyNotice] = useState<EmergencyNotice | null>(null);
  const [announcerQueue, setAnnouncerQueue] = useState<AnnouncerItem[]>([]);
  const [scheduledAnnouncements, setScheduledAnnouncements] = useState<Announcement[]>([]);
  const [serverOffsetMs, setServerOffsetMs] = useState<number>(0);

  const itemsRef = useRef<PlaylistItem[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playCountRef = useRef(0);
  const lastTriggeredRef = useRef<Record<string, string>>({});
  const playedIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  // ---------- Load display by slug ----------
  useEffect(() => {
    if (!slug) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setNotFound(true);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const clientSent = Date.now();
        const res = await fetch("/api/time", { cache: "no-store" });
        if (res.ok && !cancelled) {
          const { time } = await res.json();
          const serverTime = new Date(time).getTime();
          const roundtrip = Date.now() - clientSent;
          setServerOffsetMs(serverTime - (clientSent + roundtrip / 2));
        }
      } catch (e) {
        console.warn("Gagal sinkronisasi waktu server", e);
      }

      const { data, error } = await supabase.from("displays").select("*").eq("slug", slug).maybeSingle();
      if (cancelled) return;
      if (error) {
        console.error("Gagal memuat data layar dari Supabase:", error);
      }
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

  // ---------- Pengumuman darurat: singleton global, dipantau semua layar ----------
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.from("emergency_notice").select("*").eq("id", 1).maybeSingle();
      if (!cancelled) setEmergencyNotice((data as EmergencyNotice) ?? null);
    })();

    const channel = supabase
      .channel("emergency-notice")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "emergency_notice", filter: "id=eq.1" },
        (payload) => setEmergencyNotice(payload.new as EmergencyNotice)
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  const showEmergency = Boolean(
    emergencyNotice?.is_active &&
      display &&
      (emergencyNotice.target_display_ids.length === 0 ||
        emergencyNotice.target_display_ids.includes(display.id))
  );

  // ---------- Announcer: antrean pengumuman bersuara (FIFO) ----------
  useEffect(() => {
    if (!display?.id) return;
    let cancelled = false;

    (async () => {
      // Ambil hanya siaran langsung yang dibuat dalam 2 menit terakhir
      const since = new Date(Date.now() - 2 * 60 * 1000).toISOString();
      const { data } = await supabase
        .from("announcer_queue")
        .select("*")
        .order("created_at", { ascending: true })
        .gte("created_at", since);

      if (!cancelled) {
        const mine = ((data ?? []) as AnnouncerItem[]).filter(
          (item) =>
            !playedIdsRef.current.has(item.id) &&
            ((item.target_display_ids ?? []).length === 0 ||
              (item.target_display_ids ?? []).includes(display.id))
        );
        if (mine.length > 0) {
          setAnnouncerQueue((prev) => {
            const existingIds = new Set(prev.map((i) => i.id));
            const fresh = mine.filter((i) => !existingIds.has(i.id));
            return [...prev, ...fresh];
          });
        }
      }
    })();

    const channel = supabase
      .channel(`announcer-${display.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "announcer_queue" },
        (payload) => {
          const item = payload.new as AnnouncerItem;
          const targetIds = item.target_display_ids ?? [];
          const isTarget = targetIds.length === 0 || targetIds.includes(display.id);
          if (isTarget && !playedIdsRef.current.has(item.id)) {
            setAnnouncerQueue((q) => {
              if (q.some((i) => i.id === item.id)) return q;
              return [...q, item];
            });
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "announcer_queue" },
        (payload) =>
          setAnnouncerQueue((q) =>
            q.filter((i) => i.id !== (payload.old as { id: string }).id)
          )
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [display?.id, supabase]);

  // ---------- Scheduled Announcements: Muat master pengumuman & dengarkan realtime ----------
  useEffect(() => {
    if (!display?.id) return;
    let cancelled = false;

    const fetchScheduled = async () => {
      const { data } = await supabase
        .from("announcements")
        .select("*")
        .eq("is_enabled", true);
      if (!cancelled && data) {
        setScheduledAnnouncements(data as Announcement[]);
      }
    };
    fetchScheduled();

    const channel = supabase
      .channel(`announcements-${display.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "announcements" },
        () => {
          fetchScheduled();
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [display?.id, supabase]);

  // ---------- Scheduled Announcements Evaluator: Periksa kecocokan jam per 5 detik ----------
  useEffect(() => {
    if (!display?.id || scheduledAnnouncements.length === 0) return;

    const DAY_CODES: DayOfWeek[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

    const evaluateSchedule = () => {
      const now = new Date(Date.now() + serverOffsetMs);
      const currentDay = DAY_CODES[now.getDay()];
      const hours = String(now.getHours()).padStart(2, "0");
      const minutes = String(now.getMinutes()).padStart(2, "0");
      const currentHHMM = `${hours}:${minutes}`;
      const minuteKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")} ${currentHHMM}`;

      for (const ann of scheduledAnnouncements) {
        if (!ann.is_enabled) continue;

        // Cek target layar (null-safe)
        const targetIds = ann.target_display_ids ?? [];
        const isTarget = targetIds.length === 0 || targetIds.includes(display.id);
        if (!isTarget) continue;

        // Cek hari aktif (null-safe)
        const days = ann.days_of_week ?? [];
        const dayMatch = days.length === 0 || days.includes(currentDay);
        if (!dayMatch) continue;

        // Normalisasi format jam "HH:mm" (null-safe)
        const [rawH = "", rawM = ""] = (ann.time ?? "").split(":");
        const annHHMM = `${rawH.padStart(2, "0")}:${rawM.padStart(2, "0")}`;

        if (annHHMM === currentHHMM) {
          // Guard deduping per menit
          if (lastTriggeredRef.current[ann.id] !== minuteKey) {
            lastTriggeredRef.current[ann.id] = minuteKey;
            const itemId = `sched-${ann.id}-${minuteKey}`;
            if (!playedIdsRef.current.has(itemId)) {
              playedIdsRef.current.add(itemId);
              const item: AnnouncerItem = {
                id: itemId,
                label: ann.label,
                audio_url: ann.audio_url,
                repeat_count: ann.repeat_count || 1,
                target_display_ids: targetIds,
                created_at: new Date().toISOString(),
              };
              setAnnouncerQueue((q) => {
                if (q.some((i) => i.id === itemId)) return q;
                return [...q, item];
              });
            }
          }
        }
      }
    };

    evaluateSchedule();
    const interval = setInterval(evaluateSchedule, 5000);
    return () => clearInterval(interval);
  }, [display?.id, scheduledAnnouncements, serverOffsetMs]);

  // ---------- Audio engine: putar item pertama di antrean, repeat N kali lalu lanjut ----------
  const currentAnnouncer = announcerQueue[0] ?? null;

  useEffect(() => {
    if (!currentAnnouncer) {
      audioRef.current?.pause();
      audioRef.current = null;
      playCountRef.current = 0;
      return;
    }

    const audio = new Audio(currentAnnouncer.audio_url);
    audioRef.current = audio;
    playCountRef.current = 0;

    function finishItem() {
      // Tandai ID ini sudah pernah diputar agar tidak diulang oleh query database
      if (currentAnnouncer) {
        playedIdsRef.current.add(currentAnnouncer.id);
      }
      setAnnouncerQueue((q) => q.slice(1));
    }

    function onEnded() {
      playCountRef.current += 1;
      if (playCountRef.current < (currentAnnouncer!.repeat_count || 1)) {
        audio.currentTime = 0;
        audio.play().catch(() => {
          finishItem();
        });
      } else {
        finishItem();
      }
    }

    audio.addEventListener("ended", onEnded);
    audio.play().catch((err) => {
      console.warn("Autoplay audio tertahan browser (perlu klik/gesture di layar TV terlebih dahulu):", err);
      // Agar antrean tidak macet jika autoplay diblokir browser:
      setTimeout(() => {
        finishItem();
      }, 3000);
    });

    return () => {
      audio.removeEventListener("ended", onEnded);
      audio.pause();
      audio.src = "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentAnnouncer?.id]); // Re-run hanya saat item pertama berganti (by id) // Re-run hanya saat item pertama berganti (by id)

  // ---------- Auto-advance timer for the current item ----------
  const currentItem = items[currentIndex];
  const paused = display?.is_paused ?? false;

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (paused || !currentItem?.media) return;

    // Uploaded videos advance on their own "ended" event; only set a
    // safety timer if the operator explicitly overrode the duration.
    if (currentItem.media.type === "video" && !currentItem.duration_override) {
      // Fallback ekstrim: maksimal 3 menit jika event 'ended' tidak pernah jalan
      timerRef.current = setTimeout(advance, 180000);
      return () => {
        if (timerRef.current) clearTimeout(timerRef.current);
      };
    }

    const seconds = currentItem.duration_override ?? currentItem.media.duration ?? 10;
    timerRef.current = setTimeout(advance, Math.max(1, seconds) * 1000);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [currentItem, paused, advance]);

  // ---------- Fullscreen + wake lock ----------
  const acquireWakeLock = useCallback(async () => {
    try {
      wakeLockRef.current = (await navigator.wakeLock?.request("screen")) ?? null;
    } catch {
      // Wake Lock tidak didukung di browser ini — layar mungkin tidur sesuai
      // pengaturan TV, tapi ini bukan masalah kritis.
    }
  }, []);

  const enterFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      }
    } catch {
      // Sebagian browser TV tidak mengizinkan Fullscreen API lewat tombol ini.
      // Gunakan mode kiosk bawaan browser/TV (lihat README) sebagai gantinya.
    }
    acquireWakeLock();
  }, [acquireWakeLock]);

  useEffect(() => {
    // Wake Lock aman diminta otomatis (tidak butuh klik pengguna di sebagian
    // besar browser). Fullscreen SENGAJA TIDAK diminta otomatis saat halaman
    // dimuat — browser modern memblokirnya tanpa interaksi pengguna, dan
    // kalaupun berhasil (mis. di sebagian browser TV) terasa tiba-tiba/
    // mengagetkan. Fullscreen hanya dipicu lewat tombol "⛶ Layar penuh".
    acquireWakeLock();
    const onVisible = () => {
      if (document.visibilityState === "visible") acquireWakeLock();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [acquireWakeLock]);

  // Sinkronkan tombol dengan status fullscreen sebenarnya (mis. saat keluar
  // fullscreen dengan tombol Escape, tombolnya harus muncul kembali).
  useEffect(() => {
    const onFsChange = () => setFsActive(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  // ---------- Render ----------
  if (notFound) {
    return (
      <FullscreenShell>
        <div className="max-w-md px-6 text-center">
          {!slug ? (
            <>
              <p className="text-lg text-text-muted">URL layar tidak lengkap.</p>
              <p className="mt-3 text-xs text-text-muted">
                URL harus berbentuk <code>/display/nama-slug-layar</code> (ada nama layarnya
                setelah <code>/display/</code>). Buka lagi lewat tombol &ldquo;Buka ↗&rdquo; atau
                &ldquo;Salin URL&rdquo; di halaman Layar &amp; TV pada dashboard, jangan mengetik
                sendiri path-nya.
              </p>
            </>
          ) : (
            <>
              <p className="text-lg text-text-muted">Layar tidak ditemukan.</p>
              <p className="mt-1 text-sm text-text-muted">
                Slug yang dicari: <span className="font-mono text-white/70">{slug}</span>
              </p>
              <p className="mt-3 text-xs text-text-muted">
                Periksa kembali URL yang diberikan di dashboard. Jika slug di atas sudah benar-benar
                sesuai dengan yang ada di dashboard, kemungkinan kebijakan akses publik (RLS) untuk
                tabel <code>displays</code> di Supabase belum aktif untuk pengguna anonim.
              </p>
            </>
          )}
        </div>
      </FullscreenShell>
    );
  }

  if (!display) {
    return <FullscreenShell>{null}</FullscreenShell>;
  }

  const marqueeText = display.marquee_enabled ? display.marquee_text.trim() : "";
  const marqueeDuration = Math.max(15, marqueeText.length * 0.28);

  function unpair() {
    window.localStorage.removeItem(PAIRING_STORAGE_KEY);
    router.replace("/display");
  }

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-black">
      {!fsActive && (
        <button
          onClick={enterFullscreen}
          className="absolute right-3 top-3 z-30 rounded-md border border-white/20 bg-black/40 px-3 py-1.5 text-xs text-white/70 backdrop-blur hover:bg-black/60"
        >
          ⛶ Layar penuh
        </button>
      )}

      <button
        onClick={unpair}
        className="absolute bottom-3 right-3 z-30 rounded-md border border-white/10 bg-black/30 px-2.5 py-1 text-[10px] text-white/30 backdrop-blur hover:border-white/30 hover:text-white/60"
        title="Lepas pasangan layar ini dan kembali ke halaman pairing"
      >
        ↺ Lepas pasangan
      </button>

      <div className="absolute inset-0">
        {!currentItem?.media ? (
          <WaitingScreen name={display.name} hasPlaylist={Boolean(activePlaylistId)} />
        ) : (
          <SlideStage items={items} currentIndex={currentIndex} onVideoEnded={advance} />
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

      {currentAnnouncer && (
        <AnnouncerBadge label={currentAnnouncer.label} />
      )}

      {showEmergency && emergencyNotice && (
        <EmergencyOverlay
          title={emergencyNotice.title}
          message={emergencyNotice.message}
          publishedAt={emergencyNotice.published_at}
        />
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