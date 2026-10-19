"use client";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import type { Profile } from "@/lib/types";

const TITLES: Record<string, { title: string; desc: string }> = {
  "/dashboard": { title: "Ringkasan", desc: "Pantau status layar dan performa siaran." },
  "/dashboard/displays": { title: "Layar & TV", desc: "Kelola perangkat display di seluruh lokasi." },
  "/dashboard/media": { title: "Konten Media", desc: "Kelola pustaka foto, video, dan tabel agenda." },
  "/dashboard/playlists": { title: "Playlist", desc: "Susun urutan konten yang diputar di layar." },
  "/dashboard/schedules": { title: "Jadwal Tayang", desc: "Atur kapan playlist tampil di layar tertentu." },
  "/dashboard/announcer": { title: "Pengumuman Suara", desc: "Jadwalkan atau siarkan pengumuman audio ke layar." },
  "/dashboard/emergency": { title: "Darurat", desc: "Tayangkan pengumuman darurat ke semua layar." },
  "/dashboard/users": { title: "Manajemen User", desc: "Kelola akun Operator Bidang — hanya Administrator." },
};

function headerFor(pathname: string) {
  if (TITLES[pathname]) return TITLES[pathname];
  if (pathname.startsWith("/dashboard/playlists/")) return { title: "Detail Playlist", desc: "Atur isi dan urutan konten di playlist ini." };
  if (pathname.startsWith("/dashboard/announcer")) return TITLES["/dashboard/announcer"];
  if (pathname.startsWith("/dashboard/emergency")) return TITLES["/dashboard/emergency"];
  return TITLES["/dashboard"];
}

export default function DashboardShell({
  email,
  counts,
  children,
  profile,
}: {
  email: string;
  counts: { displays: number; media: number; playlists: number; schedules: number; announcer: number };
  children: React.ReactNode;
  profile?: Profile | null;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const meta = headerFor(pathname);
  const onlineBadge = null; // reserved for global online count if needed

  // close drawer on route change
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Mobile overlay */}
      {open && (
        <button
          aria-label="Tutup menu"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm lg:hidden"
        />
      )}
      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-40 flex w-72 shrink-0 flex-col border-r border-slate-200/80 bg-white transition-transform duration-200 dark:border-slate-800 dark:bg-slate-900 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}
      >
        <Sidebar counts={counts} email={email} profile={profile} onNavigate={() => setOpen(false)} />
      </div>

      <div className="min-w-0 flex-1">
        {/* Sticky top header */}
        <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/80 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/80">
          <div className="flex items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
            <button
              onClick={() => setOpen((v) => !v)}
              className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 lg:hidden"
              aria-label="Buka menu"
            >
              ☰
            </button>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-2xl">{meta.title}</h1>
                {onlineBadge}
              </div>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 sm:text-sm">{meta.desc}</p>
            </div>
          </div>
        </header>

        <main className="max-w-full px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
