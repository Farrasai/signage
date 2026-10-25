"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { Display, Playlist } from "@/lib/types";
import { formatDateTime, isOnline, playerUrlFor } from "@/lib/utils";
import KpiCard from "@/components/KpiCard";
import RemoteControls from "@/components/RemoteControls";

type ActivityEntry = { id: string; label: string; timestamp: string; icon: string };
type Filter = "all" | "online" | "offline";

export default function OverviewPage() {
  const [displays, setDisplays] = useState<Display[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [mediaCount, setMediaCount] = useState<number>(0);
  const [activities, setActivities] = useState<ActivityEntry[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [q, setQ] = useState("");

  const load = useCallback(async () => {
    const supabase = createClient();
    const [{ data: d }, { data: p }, { count: mc }, { data: recentDisplays }, { data: recentMedia }, { data: seenDisplays }] =
      await Promise.all([
        supabase.from("displays").select("*").order("created_at", { ascending: false }),
        supabase.from("playlists").select("*"),
        supabase.from("media").select("*", { count: "exact", head: true }),
        supabase.from("displays").select("id, name, created_at").order("created_at", { ascending: false }).limit(5),
        supabase.from("media").select("id, name, created_at").order("created_at", { ascending: false }).limit(5),
        supabase.from("displays").select("id, name, last_seen").not("last_seen", "is", null).order("last_seen", { ascending: false }).limit(5),
      ]);
    setDisplays(d ?? []);
    setPlaylists(p ?? []);
    setMediaCount(mc ?? 0);
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
    load();
    const supabase = createClient();
    const channel = supabase.channel("overview-displays").on("postgres_changes", { event: "*", schema: "public", table: "displays" }, load).subscribe();
    const interval = setInterval(load, 15000);
    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [load]);

  async function copyUrl(slug: string, id: string) {
    await navigator.clipboard.writeText(playerUrlFor(slug));
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  }

  async function changePlaylist(displayId: string, playlistId: string) {
    const supabase = createClient();
    const patch = { default_playlist_id: playlistId || null };
    await supabase.from("displays").update(patch).eq("id", displayId);
    setDisplays((prev) => prev.map((d) => (d.id === displayId ? { ...d, ...patch } : d)));
  }

  const onlineCount = displays.filter((d) => isOnline(d.last_seen)).length;
  const filtered = displays.filter((d) => {
    const online = isOnline(d.last_seen);
    if (filter === "online" && !online) return false;
    if (filter === "offline" && online) return false;
    if (q) {
      const needle = q.toLowerCase();
      if (!d.name.toLowerCase().includes(needle) && !d.slug.toLowerCase().includes(needle)) return false;
    }
    return true;
  });

  return (
    <div>
      <div className="mb-6 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Total Layar" value={loading ? "—" : displays.length} sublabel={loading ? undefined : `${displays.length} perangkat terdaftar`} href="/dashboard/displays" />
        <KpiCard label="Total Konten" value={loading ? "—" : mediaCount} sublabel={loading ? undefined : "Foto, video & tabel"} href="/dashboard/media" />
        <KpiCard label="Total Playlist" value={loading ? "—" : playlists.length} sublabel={loading ? undefined : `${playlists.length} daftar putar`} href="/dashboard/playlists" />
        <KpiCard label="Layar Online" value={loading ? "—" : `${onlineCount} / ${displays.length}`} sublabel={loading ? undefined : `${onlineCount} perangkat`} variant="highlight" progress={displays.length ? onlineCount / displays.length : 0} />
      </div>

      <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white p-3 dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {(["all","online","offline"] as const).map((key) => {
            const labels: Record<string,string> = { all: `Semua Layar (${displays.length})`, online: `Online (${onlineCount})`, offline: `Offline (${displays.length - onlineCount})` };
            return (<button key={key} onClick={() => setFilter(key as Filter)} className={`cursor-pointer rounded-full px-3.5 py-1.5 text-xs font-bold transition-colors ${filter===key?"bg-emerald-600 text-white shadow-sm":"border border-slate-200 bg-slate-50 text-slate-600 hover:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"}`}>{labels[key]}</button>);
          })}
        </div>
        <div className="flex items-center gap-2">
          <input value={q} onChange={(e)=>setQ(e.target.value)} placeholder="Cari nama TV atau ID..." className="w-56 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
          <button onClick={()=>load()} className="cursor-pointer rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">Refresh</button>
        </div>
      </div>
      {!loading && displays.length===0 && (
        <div data-testid="dashboard-empty" className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center dark:border-slate-800 dark:bg-slate-900">
          <p className="text-sm text-slate-500">Belum ada layar terdaftar.</p>
          <Link href="/dashboard/displays" className="bg-emerald-600 hover:bg-emerald-700 mt-3 inline-block cursor-pointer rounded-xl px-4 py-2 text-sm font-bold text-white shadow">+ Tambah layar pertama</Link>
        </div>
      )}
      {!loading && displays.length>0 && filtered.length===0 && (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center dark:border-slate-800 dark:bg-slate-900"><p className="text-sm text-slate-500">Tidak ada layar yang cocok dengan filter.</p></div>
      )}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {filtered.map((d)=>{
          const online=isOnline(d.last_seen);
          return (
            <div key={d.id} data-testid={`display-card-${d.id}`} className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className={`relative h-36 overflow-hidden ${online?"emerald-wave-pattern":"emerald-wave-offline"}`}>
                <span className="absolute left-3 top-3 rounded-md bg-black/35 px-2 py-1 font-mono text-[11px] font-bold tracking-wide text-lime-200">{d.slug}</span>
                <span className={`absolute right-3 top-3 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${online?"bg-white text-emerald-700":"bg-slate-700 text-slate-200"}`}>● {online?"Online":"Offline"}</span>
                <div className="absolute bottom-3 left-3 right-3">
                  <h3 className="relative truncate text-lg font-extrabold text-white">{d.name}</h3>
                  <p className="relative text-xs text-white/70">Terakhir aktif: {formatDateTime(d.last_seen)}</p>
                </div>
              </div>
              <div className="space-y-3 p-4">
                <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Playlist Aktif:</span>
                  <select data-testid={`display-playlist-select-${d.id}`} value={d.default_playlist_id??""} onChange={(e)=>changePlaylist(d.id, e.target.value)} className="max-w-[62%] cursor-pointer rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-medium outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white">
                    <option value="">Belum diatur</option>
                    {playlists.map((p)=>(<option key={p.id} value={p.id}>{p.name}</option>))}
                  </select>
                </div>
                <RemoteControls displayId={d.id} isPaused={d.is_paused} />
                <div className="grid grid-cols-2 gap-2.5 pt-1">
                  <button data-testid={`copy-url-button-${d.id}`} onClick={()=>copyUrl(d.slug, d.id)} className="cursor-pointer rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">{copiedId===d.id?"Tersalin!":"Salin URL"}</button>
                  <a data-testid={`open-player-link-${d.id}`} href={`/display/${d.slug}`} target="_blank" rel="noreferrer" className="bg-emerald-600 hover:bg-emerald-700 inline-flex cursor-pointer items-center justify-center rounded-xl px-3 py-2.5 text-xs font-bold text-white shadow">Buka Player ↗</a>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {!loading && activities.length>0 && (
        <section className="mt-8">
          <h2 className="mb-3 text-base font-extrabold tracking-tight text-slate-900 dark:text-white">Aktivitas Terbaru</h2>
          <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-900">
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {activities.map((a)=>(
                <div key={a.id} className="flex items-center gap-3 px-4 py-3">
                  <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)]" aria-hidden />
                  <span className="shrink-0 text-sm leading-none">{a.icon}</span>
                  <p className="min-w-0 flex-1 truncate text-sm text-slate-700 dark:text-slate-200">{a.label}</p>
                  <time className="shrink-0 font-mono text-xs text-slate-400">{formatDateTime(a.timestamp)}</time>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
