"use client";

import { useState } from "react";
import { queueToast } from "@/lib/toast";

export default function SignOutButton() {
  const [busy, setBusy] = useState(false);

  async function handleSignOut() {
    setBusy(true);
    let failed = false;
    try {
      const res = await fetch("/api/auth/signout", { method: "POST" });
      if (!res.ok) failed = true;
    } catch {
      failed = true;
    }
    // Toast muncul di /login setelah navigasi penuh.
    queueToast(
      failed ? "error" : "success",
      failed ? "Gagal keluar dari sesi. Silakan coba lagi." : "Anda telah keluar."
    );
    // Bersihkan cookie lokal Supabase jika ada
    try {
      document.cookie.split(";").forEach((cookie) => {
        const [name] = cookie.split("=");
        const trimmedName = name?.trim();
        if (trimmedName && (trimmedName.startsWith("sb-") || trimmedName.includes("auth"))) {
          document.cookie = `${trimmedName}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Strict`;
          document.cookie = `${trimmedName}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Strict; secure`;
        }
      });
    } catch {
      // ignore
    }
    // Hard navigation agar middleware/proxy membaca ulang state tanpa cookie auth
    window.location.replace("/login");
  }

  return (
    <button
      onClick={handleSignOut}
      disabled={busy}
      data-testid="signout-button"
      className="flex w-full cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-xs text-slate-500 transition-colors hover:bg-rose-600/10 hover:text-rose-600 disabled:opacity-50 dark:text-slate-400 dark:hover:text-rose-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-rose-500"
    >
      <span aria-hidden>→</span>
      {busy ? "Keluar..." : "Keluar"}
    </button>
  );
}
