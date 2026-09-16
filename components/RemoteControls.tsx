"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { RemoteCommandType } from "@/lib/types";

export default function RemoteControls({
  displayId,
  isPaused,
}: {
  displayId: string;
  isPaused: boolean;
}) {
  const [sending, setSending] = useState<RemoteCommandType | null>(null);

  async function send(command: RemoteCommandType) {
    setSending(command);
    const supabase = createClient();
    await supabase.from("remote_commands").insert({ display_id: displayId, command });

    if (command === "play" || command === "pause") {
      await supabase
        .from("displays")
        .update({ is_paused: command === "pause" })
        .eq("id", displayId);
    }
    setSending(null);
  }

  const buttonClass =
    "rounded-md border border-border px-2.5 py-1.5 text-xs text-text-muted transition-colors hover:border-signal/50 hover:text-text disabled:opacity-40";

  return (
    <div className="flex items-center gap-1.5">
      <button
        className={buttonClass}
        disabled={sending !== null}
        onClick={() => send("prev")}
        title="Konten sebelumnya"
      >
        ⏮
      </button>
      <button
        className={buttonClass}
        disabled={sending !== null}
        onClick={() => send(isPaused ? "play" : "pause")}
        title={isPaused ? "Lanjutkan" : "Jeda"}
      >
        {isPaused ? "▶" : "⏸"}
      </button>
      <button
        className={buttonClass}
        disabled={sending !== null}
        onClick={() => send("next")}
        title="Konten berikutnya"
      >
        ⏭
      </button>
      <button
        className={buttonClass}
        disabled={sending !== null}
        onClick={() => send("refresh")}
        title="Muat ulang layar"
      >
        ⟳
      </button>
    </div>
  );
}
