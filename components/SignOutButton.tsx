"use client";

export default function SignOutButton() {
  async function handleSignOut() {
    try {
      const res = await fetch("/api/auth/signout", { method: "POST" });
      if (!res.ok) {
        console.error("Gagal keluar");
      }
    } catch {
      console.error("Gagal menghubungi server saat keluar");
    } finally {
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
  }

  return (
    <button
      onClick={handleSignOut}
      data-testid="signout-button"
      className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs text-slate-500 dark:text-slate-400 transition-colors hover:bg-rose-600/10 hover:text-rose-600 dark:text-rose-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-rose-500"
    >
      <span aria-hidden>→</span>
      Keluar
    </button>
  );
}
