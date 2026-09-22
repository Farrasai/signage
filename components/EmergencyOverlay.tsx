import { formatDateTime } from "@/lib/utils";

export default function EmergencyOverlay({
  title,
  message,
  publishedAt,
}: {
  title: string;
  message: string;
  publishedAt: string | null;
}) {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-red-950/90 via-black/85 to-red-950/90 px-6 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border-2 border-red-500 bg-[#0a0f1a] p-8 text-center shadow-[0_0_60px_rgba(239,68,68,0.45)] sm:p-10">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full border-2 border-red-500 text-3xl font-bold text-red-500 sm:h-20 sm:w-20 sm:text-4xl">
          !
        </div>

        <span className="inline-block rounded-full bg-red-600 px-3 py-1 text-xs font-bold tracking-wide text-white">
          PERHATIAN URGENT
        </span>

        <h2 className="mt-4 font-display text-xl font-bold uppercase leading-snug text-white sm:text-3xl">
          {title}
        </h2>

        {message && (
          <div className="mt-5 rounded-lg bg-white/5 px-5 py-4">
            <p className="text-sm leading-relaxed text-white/90 sm:text-base">{message}</p>
          </div>
        )}

        {publishedAt && (
          <p className="mt-4 font-mono text-xs text-red-400">
            Dipublikasikan pada: {formatDateTime(publishedAt)}
          </p>
        )}
      </div>
    </div>
  );
}