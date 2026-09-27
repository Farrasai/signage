"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { Display, Playlist } from "@/lib/types";
import { formatDateTime, isOnline, playerUrlFor } from "@/lib/utils";
import StatusDot from "@/components/StatusDot";
import RemoteControls from "@/components/RemoteControls";

type ActivityEntry = {
  id: string;
  label: string;
  timestamp: string;
  icon: string;
};

export default function OverviewPage() {
  const [displays, setDisplays] = useState<Display[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [mediaCount, setMediaCount] = useState<number>(0);
  const [activities, setActivities] = useState<ActivityEntry[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const supabase = createClient();
    const [
      { data: d },
      { data: p },
      { count: mc },
      { data: recentDisplays },
      { data: recentMedia },
      { data: seenDisplays },
    ] = await Promise.all([
      supabase.from("displays").select("*").order("created_at", { ascending: false }),
      supabase.from("playlists").select("*"),
      supabase.from("media").select("*", { count: "exact", head: true }),
      supabase
        .from("displays")
        .select("id, name, created_at")
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("media")
        .select("id, name, created_at")
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("displays")
        .select("id, name, last_seen")
        .not("last_seen", "is", null)
        .order("last_seen", { ascending: false })
        .limit(5),
    ]);

    setDisplays(d ?? []);
    setPlaylists(p ?? []);
    setMediaCount(mc ?? 0);

    // Gabungkan semua entri aktivitas lalu urutkan terbaru
    const entries: ActivityEntry[] = [
      ...(recentDisplays ?? []).map((r) => ({
        id: `display-added-${r.id}`,
        label: `Layar "${r.name}" ditambahkan`,
        timestamp: r.created_at as string,
        icon: "🖥",
      })),
      ...(recentMedia ?? []).map((r) => ({
        id: `media-added-${r.id}`,
        label: `Konten "${r.name}" ditambahkan`,
        timestamp: r.created_at as string,
        icon: "🎞",
      })),
      ...(seenDisplays ?? []).map((r) => ({
        id: `display-seen-${r.id}`,
        label: `Layar "${r.name}" terakhir online`,
        timestamp: r.last_seen as string,
        icon: "🟢",
      })),
    ];

    entries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    setActivities(entries.slice(0, 10));

    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    const supabase = createClient();
    const channel = supabase
      .channel("overview-displays")
      .on("postgres_changes", { event: "*", schema: "public", table: "displays" }, load)
      .subscribe();

    const interval = setInterval(load, 15000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [load]);

  function playlistName(id: string | null) {
    if (!id) return "Belum diatur";
    return playlists.find((p) => p.id === id)?.name ?? "Playlist terhapus";
  }

  async function copyUrl(slug: string, id: string) {
    await navigator.clipboard.writeText(playerUrlFor(slug));
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  }

  const onlineCount = displays.filter((d) => isOnline(d.last_seen)).length;

  const stats: { label: string; value: number; icon: string; href: string | null; accent?: boolean }[] = [
    { label: "Total Layar", value: displays.length, icon: "🖥", href: "/dashboard/displays" },
    { label: "Total Konten", value: mediaCount, icon: "🎞", href: "/dashboard/media" },
    { label: "Total Playlist", value: playlists.length, icon: "📋", href: "/dashboard/playlists" },
    { label: "Layar Online", value: onlineCount, icon: "●", href: null, accent: true },
  ];

  return (
    <div>
      <header className="mb-7">
        <h1 className="font-display text-2xl font-semibold">Ringkasan</h1>
        <p className="mt-1 text-sm text-text-muted">
          {loading
            ? "Memuat status layar..."
            : `${onlineCount} dari ${displays.length} layar sedang online.`}
        </p>
      </header>

      {/* Stat Cards */}
      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((s) => {
          const card = (
            <div className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-4 transition-colors hover:border-signal/40">
              <span
                className={`text-base leading-none ${s.accent ? "text-online" : "text-text-muted"}`}
              >
                {s.icon}
              </span>
              <p
                className={`text-3xl font-semibold tabular-nums text-lavender ${s.accent ? "text-online" : ""}`}
              >
                {loading ? (
                  <span className="text-2xl text-text-muted">—</span>
                ) : (
                  s.value
                )}
              </p>
              <p className="text-xs text-text-muted">{s.label}</p>
            </div>
          );

          return s.href ? (
            <Link key={s.label} href={s.href}>
              {card}
            </Link>
          ) : (
            <div key={s.label}>{card}</div>
          );
        })}
      </div>

      {!loading && displays.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center">
          <p className="text-text-muted">Belum ada layar terdaftar.</p>
          <Link
            href="/dashboard/displays"
            className="mt-3 inline-block rounded-md btn-aurora px-4 py-2 text-sm font-medium hover:opacity-90"
          >
            Tambah layar pertama
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {displays.map((d) => (
          <div
            key={d.id}
            className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4"
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-medium">{d.name}</h3>
                <p className="mt-0.5 font-mono text-xs text-text-muted">{d.slug}</p>
              </div>
              <StatusDot lastSeen={d.last_seen} />
            </div>

            <div className="text-xs text-text-muted">
              <p>
                Playlist: <span className="text-text">{playlistName(d.default_playlist_id)}</span>
              </p>
              <p className="mt-0.5">Terakhir aktif: {formatDateTime(d.last_seen)}</p>
            </div>

            <div className="mt-1 flex items-center justify-between border-t border-border pt-3">
              <RemoteControls displayId={d.id} isPaused={d.is_paused} />
              <div className="flex items-center gap-2">
                <button
                  onClick={() => copyUrl(d.slug, d.id)}
                  className="text-xs text-text-muted hover:text-text"
                >
                  {copiedId === d.id ? "Tersalin!" : "Salin URL"}
                </button>
                <a
                  href={`/display/${d.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-md border border-border px-2.5 py-1.5 text-xs hover:border-signal/50"
                >
                  Buka ↗
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Activity Log */}
      {!loading && activities.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-4 font-display text-base font-semibold">Aktivitas Terbaru</h2>
          <div className="divide-y divide-border rounded-2xl border border-border bg-surface">
            {activities.map((a) => (
              <div key={a.id} className="flex items-center gap-3 px-4 py-3">
                <span className="shrink-0 text-sm leading-none">{a.icon}</span>
                <p className="min-w-0 flex-1 truncate text-sm">{a.label}</p>
                <time className="shrink-0 text-xs text-text-muted">
                  {formatDateTime(a.timestamp)}
                </time>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
