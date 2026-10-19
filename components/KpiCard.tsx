import Link from "next/link";

export default function KpiCard({
  label,
  value,
  sublabel,
  href,
  variant = "default",
  progress,
}: {
  label: string;
  value: React.ReactNode;
  sublabel?: string;
  href?: string;
  variant?: "default" | "highlight";
  progress?: number; // 0..1
}) {
  const card =
    variant === "highlight" ? (
      <div className="emerald-wave-pattern relative rounded-2xl p-5 text-white shadow-lg">
        <div className="relative">
          <p className="text-xs font-semibold tracking-widest text-lime-200/90 uppercase">{label}</p>
          <p className="mt-2 text-3xl font-extrabold">{value}</p>
          {sublabel && <p className="mt-1 text-xs text-white/80">{sublabel}</p>}
          {typeof progress === "number" && (
            <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/20">
              <div className="h-full rounded-full bg-lime-300" style={{ width: `${Math.round(progress * 100)}%` }} />
            </div>
          )}
        </div>
      </div>
    ) : (
      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <p className="text-xs font-semibold tracking-widest text-slate-500 uppercase dark:text-slate-400">{label}</p>
        <p className="mt-2 text-3xl font-extrabold text-slate-900 dark:text-white">{value}</p>
        {sublabel && <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{sublabel}</p>}
        {href && (
          <span className="mt-3 inline-flex text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            {label.includes("Layar") ? "Kelola Layar →" : label.includes("Konten") ? "Buka Pustaka →" : "Kelola Playlist →"}
          </span>
        )}
      </div>
    );

  if (href && variant !== "highlight") {
    return (
      <Link href={href} className="block">
        {card}
      </Link>
    );
  }
  return card;
}
