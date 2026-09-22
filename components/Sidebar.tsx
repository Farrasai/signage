"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Ringkasan", exact: true },
  { href: "/dashboard/displays", label: "Layar & TV" },
  { href: "/dashboard/media", label: "Konten" },
  { href: "/dashboard/playlists", label: "Playlist" },
  { href: "/dashboard/schedules", label: "Jadwal" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const emergencyActive = pathname.startsWith("/dashboard/emergency");

  return (
    <nav className="flex flex-col gap-1">
      {NAV_ITEMS.map((item) => {
        const active = item.exact
          ? pathname === item.href
          : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`rounded-lg px-3 py-2 text-sm transition-colors ${
              active
                ? "bg-signal-soft text-signal"
                : "text-text-muted hover:bg-surface-2 hover:text-text"
            }`}
          >
            {item.label}
          </Link>
        );
      })}

      <div className="my-2 border-t border-border" />

      <Link
        href="/dashboard/emergency"
        className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm transition-colors ${
          emergencyActive
            ? "bg-danger/15 text-danger"
            : "text-text-muted hover:bg-danger/10 hover:text-danger"
        }`}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-danger" />
        Darurat
      </Link>
    </nav>
  );
}