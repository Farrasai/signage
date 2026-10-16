"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", exact: true },
  { href: "/dashboard/displays", label: "Layar & TV" },
  { href: "/dashboard/media", label: "Konten" },
  { href: "/dashboard/playlists", label: "Playlist" },
  { href: "/dashboard/schedules", label: "Jadwal" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const emergencyActive = pathname.startsWith("/dashboard/emergency");

  return (
    <nav className="flex flex-col gap-0.5">
      {NAV_ITEMS.map((item) => {
        const active = item.exact
          ? pathname === item.href
          : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`rounded-md px-3 py-2 text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-signal ${
              active
                ? "bg-signal-soft text-signal font-medium"
                : "text-text-muted hover:bg-surface-2 hover:text-text"
            }`}
          >
            {item.label}
          </Link>
        );
      })}

      <div className="my-2 border-t border-border" />

      <Link
        href="/dashboard/announcer"
        className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-signal ${
          pathname.startsWith("/dashboard/announcer")
            ? "bg-amber-500/10 text-amber-600 font-medium dark:text-amber-400"
            : "text-text-muted hover:bg-surface-2 hover:text-text"
        }`}
      >
        <span aria-hidden>🎤</span>
        Pengumuman Suara
      </Link>

      <Link
        href="/dashboard/emergency"
        className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-signal ${
          emergencyActive
            ? "bg-danger/10 text-danger font-medium"
            : "text-text-muted hover:bg-danger/10 hover:text-danger"
        }`}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-danger" aria-hidden />
        Darurat
      </Link>
    </nav>
  );
}