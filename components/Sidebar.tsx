"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import SystemClock from "@/components/SystemClock";
import ThemeToggle from "@/components/ThemeToggle";
import SignOutButton from "@/components/SignOutButton";
import type { Profile } from "@/lib/types";

const MAIN = [
  { href: "/dashboard", label: "Dashboard", exact: true },
  { href: "/dashboard/displays", label: "Layar & TV" },
  { href: "/dashboard/media", label: "Konten Media" },
  { href: "/dashboard/playlists", label: "Playlist" },
  { href: "/dashboard/schedules", label: "Jadwal Tayang" },
];

export default function Sidebar({
  counts,
  email,
  onNavigate,
  profile,
}: {
  counts: { displays: number; media: number; playlists: number; schedules: number; announcer: number };
  email: string;
  onNavigate?: () => void;
  profile?: Profile | null;
}) {
  const pathname = usePathname();
  const announcerActive = pathname.startsWith("/dashboard/announcer");
  const emergencyActive = pathname.startsWith("/dashboard/emergency");
  const isAdmin = !profile || profile.role === "admin"; // before migration: treat as admin
  const showKontrolSiaran = isAdmin;
  const badge = (href: string) => {
    if (href === "/dashboard/displays") return counts.displays;
    if (href === "/dashboard/media") return counts.media;
    if (href === "/dashboard/playlists") return counts.playlists;
    if (href === "/dashboard/schedules") return counts.schedules;
    return null;
  };
  return (
    <div className="flex h-full flex-col px-4 py-5">
      <div className="mb-6 flex items-center gap-3 px-1">
        <div className="emerald-wave-pattern relative flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-md">
          <span className="relative text-sm font-extrabold">◈</span>
          <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-400">
            <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400 opacity-60" />
          </span>
        </div>
        <div>
          <p className="text-sm font-bold tracking-tight text-slate-900 dark:text-white">Digital Signage</p>
          <p className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">Sistem Kontrol Terpadu</p>
        </div>
      </div>
      <nav className="flex flex-col gap-0.5">
        <p className="px-2 pb-2 text-[10px] font-bold tracking-widest text-slate-400 uppercase">Menu Utama</p>
        {MAIN.map((item) => {
          const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
          const b = badge(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={`flex cursor-pointer items-center justify-between rounded-xl px-3 py-2.5 text-sm ${active ? "bg-emerald-50 font-bold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300" : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"}`}
            >
              <span className="flex items-center gap-2">
                {active && <span className="h-5 w-1.5 rounded-full bg-emerald-600" aria-hidden />}
                {item.label}
              </span>
              {b !== null && <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${active ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"}`}>{b}</span>}
            </Link>
          );
        })}
        {showKontrolSiaran && (
          <>
            <div className="my-3 border-t border-slate-200 dark:border-slate-800" />
            <p className="px-2 pb-2 text-[10px] font-bold tracking-widest text-slate-400 uppercase">Kontrol Siaran</p>
            <Link
              href="/dashboard/announcer"
              onClick={onNavigate}
              className={`flex cursor-pointer items-center justify-between rounded-xl border px-3 py-2.5 text-sm font-medium ${announcerActive ? "bg-emerald-600 border-transparent text-white font-bold" : "border-emerald-500/20 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300"}`}
            >
              <span className="relative flex items-center gap-2">Pengumuman Suara</span>
              {!announcerActive && counts.announcer > 0 && <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-xs font-bold text-white">{counts.announcer}</span>}
            </Link>
            <Link
              href="/dashboard/emergency"
              onClick={onNavigate}
              className={`mt-2 flex cursor-pointer items-center justify-between rounded-xl border px-3 py-2.5 text-sm font-medium ${emergencyActive ? "border-transparent bg-rose-600 text-white" : "border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-300"}`}
            >
              <span className="flex items-center gap-2">Darurat</span>
              <span className={`h-2 w-2 rounded-full ${emergencyActive ? "bg-white" : "bg-rose-500"}`} aria-hidden />
            </Link>
          </>
        )}
        {isAdmin && (
          <Link
            href="/dashboard/users"
            onClick={onNavigate}
            className={`mt-2 flex cursor-pointer items-center justify-between rounded-xl border px-3 py-2.5 text-sm font-medium ${pathname.startsWith("/dashboard/users") ? "border-transparent bg-slate-900 text-white dark:bg-white dark:text-slate-900" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"}`}
          >
            <span className="flex items-center gap-2">Manajemen User</span>
          </Link>
        )}
      </nav>
      <div className="mt-auto space-y-3 border-t border-slate-200 pt-4 dark:border-slate-800">
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-800/60">
          <div className="font-mono text-xs font-bold text-slate-700 dark:text-slate-200">
            <SystemClock />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <ThemeToggle />
          </div>
          <div className="shrink-0">
            <SignOutButton />
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-2.5 dark:bg-slate-800/60">
          <div className="emerald-wave-pattern flex h-9 w-9 items-center justify-center rounded-full text-xs font-extrabold text-white">KN</div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-slate-900 dark:text-white">
              {profile?.role === "operator_bidang" ? `Operator — ${profile.bidang ?? "-"}` : "Administrator"}
            </p>
            <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">{email}</p>
            {profile?.role === "operator_bidang" && profile.bidang && (
              <span className="mt-1 inline-block rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-bold text-white">{profile.bidang}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
