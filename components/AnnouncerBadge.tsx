export default function AnnouncerBadge({ label }: { label: string }) {
  return (
    <div className="absolute left-4 top-4 z-25 flex items-center gap-2 rounded-xl border border-white/20 bg-black/65 px-3 py-1.5 text-sm text-white backdrop-blur-sm">
      <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-red-500" />
      <span className="text-base leading-none" aria-hidden>🎤</span>
      <span className="max-w-[180px] truncate font-medium">{label}</span>
    </div>
  );
}

