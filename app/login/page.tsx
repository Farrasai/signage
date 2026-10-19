"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    setLoading(false);

    if (error) {
      setError("Email atau password salah.");
      return;
    }

    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 dark:bg-slate-950 lg:flex-row">
      {/* Panel kiri: branding — emerald glossy pattern */}
      <div className="hidden flex-col justify-between emerald-wave-pattern p-10 text-white lg:flex lg:w-2/5">
        <div className="flex items-center gap-2.5">
          <span
            className="h-2 w-2 rounded-full bg-white"
            style={{ boxShadow: "0 0 10px rgba(255,255,255,0.8)" }}
            aria-hidden
          />
          <span className="text-sm font-semibold tracking-tight">Digital Signage</span>
        </div>

        <div>
          <p className="text-3xl font-semibold leading-snug">
            Kelola konten TV dari satu tempat.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-white/70">
            Atur playlist, jadwal siaran, dan kirim pengumuman ke semua layar secara bersamaan.
          </p>
        </div>

        <p className="text-xs text-white/50">
          KN Wonogiri &mdash; Intel Digital Service
        </p>
      </div>

      {/* Panel kanan: form login */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12">
        {/* Branding mobile (hanya tampil di layar kecil) */}
        <div className="mb-8 flex items-center gap-2.5 lg:hidden">
          <span
            className="h-2 w-2 rounded-full emerald-wave-pattern"
            style={{ boxShadow: "0 0 8px var(--signal)" }}
            aria-hidden
          />
          <span className="text-sm font-semibold tracking-tight text-slate-900 dark:text-white">Digital Signage</span>
        </div>

        <div className="w-full max-w-sm">
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Masuk</h1>
          <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
            Akses panel kontrol layar TV Anda.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4" noValidate>
            <div>
              <label
                className="mb-1.5 block text-sm font-medium text-slate-900 dark:text-white"
                htmlFor="email"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-500 dark:text-slate-400 outline-none transition-colors focus:border-emerald-500 focus-visible:ring-2 focus-visible:ring-emerald-500/20"
                placeholder="admin@example.com"
              />
            </div>

            <div>
              <label
                className="mb-1.5 block text-sm font-medium text-slate-900 dark:text-white"
                htmlFor="password"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-500 dark:text-slate-400 outline-none transition-colors focus:border-emerald-500 focus-visible:ring-2 focus-visible:ring-emerald-500/20"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <p
                role="alert"
                className="rounded-lg border border-rose-200/30 bg-rose-50 px-3.5 py-2.5 text-sm text-rose-600"
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-emerald-600 hover:bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
            >
              {loading ? "Memeriksa..." : "Masuk ke Dashboard"}
            </button>
          </form>

          <p className="mt-8 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
            &copy; 2026 Intel Digital Service KN Wonogiri. Semua hak dilindungi.
          </p>
        </div>
      </div>
    </div>
  );
}
