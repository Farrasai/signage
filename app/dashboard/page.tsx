"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { Display, Playlist } from "@/lib/types";
import { formatDateTime, isOnline, playerUrlFor } from "@/lib/utils";
import StatusDot from "@/components/StatusDot";
import RemoteControls from "@/components/RemoteControls";

export default function OverviewPage() {
  const [displays, setDisplays] = useState<Display[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const supabase = createClient();
    const [{ data: d }, { data: p }] = await Promise.all([
      supabase.from("displays").select("*").order("created_at", { ascending: false }),
      supabase.from("playlists").select("*"),
    ]);
    setDisplays(d ?? []);
    setPlaylists(p ?? []);
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

      {!loading && displays.length === 0 && (
        <div className="rounded-xl border border-dashed border-border p-10 text-center">
          <p className="text-text-muted">Belum ada layar terdaftar.</p>
          <Link
            href="/dashboard/displays"
            className="mt-3 inline-block rounded-lg bg-signal px-4 py-2 text-sm font-medium text-[#160a05] hover:opacity-90"
          >
            Tambah layar pertama
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {displays.map((d) => (
          <div
            key={d.id}
            className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4"
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
    </div>
  );
}
