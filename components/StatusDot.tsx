import { isOnline } from "@/lib/utils";

export default function StatusDot({ lastSeen }: { lastSeen: string | null }) {
  const online = isOnline(lastSeen);
  return (
    <span className="inline-flex items-center gap-1.5 text-xs">
      <span
        className="h-2 w-2 rounded-full"
        style={{
          background: online ? "var(--online)" : "var(--offline)",
          boxShadow: online ? "0 0 8px var(--online)" : "none",
        }}
      />
      <span className={online ? "text-emerald-600 dark:text-emerald-400" : "text-slate-500 dark:text-slate-400"}>
        {online ? "Online" : "Offline"}
      </span>
    </span>
  );
}
