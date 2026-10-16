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
    <div className="flex min-h-screen flex-col bg-bg lg:flex-row">
      {/* Panel kiri: branding */}
      <div className="hidden flex-col justify-between bg-signal p-10 text-white lg:flex lg:w-2/5">
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
            className="h-2 w-2 rounded-full bg-signal"
            style={{ boxShadow: "0 0 8px var(--signal)" }}
            aria-hidden
          />
          <span className="text-sm font-semibold tracking-tight text-text">Digital Signage</span>
        </div>

        <div className="w-full max-w-sm">
          <h1 className="text-2xl font-semibold text-text">Masuk</h1>
          <p className="mt-1.5 text-sm text-text-muted">
            Akses panel kontrol layar TV Anda.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4" noValidate>
            <div>
              <label
                className="mb-1.5 block text-sm font-medium text-text"
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
                className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-text placeholder:text-text-muted outline-none transition-colors focus:border-signal focus-visible:ring-2 focus-visible:ring-signal/20"
                placeholder="admin@example.com"
              />
            </div>

            <div>
              <label
                className="mb-1.5 block text-sm font-medium text-text"
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
                className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-text placeholder:text-text-muted outline-none transition-colors focus:border-signal focus-visible:ring-2 focus-visible:ring-signal/20"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <p
                role="alert"
                className="rounded-lg border border-danger/30 bg-danger/10 px-3.5 py-2.5 text-sm text-danger"
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-signal px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal"
            >
              {loading ? "Memeriksa..." : "Masuk ke Dashboard"}
            </button>
          </form>

          <p className="mt-8 text-xs leading-relaxed text-text-muted">
            &copy; 2026 Intel Digital Service KN Wonogiri. Semua hak dilindungi.
          </p>
        </div>
      </div>
    </div>
  );
}
