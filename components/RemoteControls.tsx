"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { RemoteCommandType } from "@/lib/types";

export default function RemoteControls({
  displayId,
  isPaused,
  compact,
}: {
  displayId: string;
  isPaused: boolean;
  compact?: boolean;
}) {
  const [sending, setSending] = useState<RemoteCommandType | null>(null);

  async function send(command: RemoteCommandType) {
    setSending(command);
    const supabase = createClient();
    await supabase.from("remote_commands").insert({ display_id: displayId, command });
    if (command === "play" || command === "pause") {
      await supabase.from("displays").update({ is_paused: command === "pause" }).eq("id", displayId);
    }
    setSending(null);
  }

  const base = "inline-flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-40";
  const muted = "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200";
  const playCls = isPaused
    ? "bg-emerald-600 hover:bg-emerald-700 border-transparent text-white font-bold"
    : "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200";

  return (
    <div className={`grid gap-2 ${compact ? "grid-cols-4" : "grid-cols-4"}`}>
      <button className={`${base} ${muted}`} disabled={sending !== null} onClick={() => send("prev")}>
        <span aria-hidden>⏮</span> Mundur
      </button>
      <button className={`${base} ${playCls}`} disabled={sending !== null} onClick={() => send(isPaused ? "play" : "pause")}>
        <span aria-hidden>{isPaused ? "▶" : "⏸"}</span> {isPaused ? "Putar" : "Jeda"}
      </button>
      <button className={`${base} ${muted}`} disabled={sending !== null} onClick={() => send("next")}>
        <span aria-hidden>⏭</span> Maju
      </button>
      <button className={`${base} ${muted}`} disabled={sending !== null} onClick={() => send("refresh")}>
        <span aria-hidden>⟳</span> Refresh
      </button>
    </div>
  );
}

