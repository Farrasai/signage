"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { PAIRING_STORAGE_KEY } from "@/lib/utils";

export default function DisplayPairingPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pairedName, setPairedName] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);

  // Sudah pernah dipasangkan sebelumnya di browser ini? Langsung lanjut,
  // tidak perlu ketik kode lagi.
  useEffect(() => {
    const saved = window.localStorage.getItem(PAIRING_STORAGE_KEY);
    if (saved) {
      router.replace(`/display/${saved}`);
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setChecking(false);
  }, [router]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (lockedUntil && Date.now() < lockedUntil) {
      setError("Terlalu banyak percobaan gagal. Silakan tunggu sebentar.");
      return;
    }

    const trimmed = code.trim().toUpperCase();
    if (trimmed.length < 6) {
      setError("Masukkan kode pairing yang diberikan admin.");
      return;
    }

    setSubmitting(true);
    const supabase = createClient();
    const { data, error: rpcError } = await supabase.rpc("redeem_pairing_code", {
      input_code: trimmed,
    });
    setSubmitting(false);

    if (rpcError) {
      console.error("Gagal menukar kode pairing");
      setError("Terjadi kesalahan saat menghubungi server. Coba lagi.");
      return;
    }

    const row = (Array.isArray(data) ? data[0] : null) as { slug: string; name: string } | null;
    if (!row?.slug) {
      const nextAttempts = attempts + 1;
      setAttempts(nextAttempts);
      if (nextAttempts >= 5) {
        setLockedUntil(Date.now() + 60_000);
        setError("Terlalu banyak percobaan gagal. Coba lagi dalam 1 menit.");
      } else {
        setError("Kode salah atau sudah kedaluwarsa. Minta kode baru dari admin.");
      }
      setCode("");
      return;
    }

    setAttempts(0);
    setLockedUntil(null);
    window.localStorage.setItem(PAIRING_STORAGE_KEY, row.slug);
    setPairedName(row.name);
    router.replace(`/display/${row.slug}`);
  }

  if (checking) {
    return <div className="h-screen w-screen bg-slate-950" />;
  }

  return (
    <div className="flex h-screen w-screen flex-col items-center justify-center bg-slate-950 px-6 text-center">
      <span className="mb-6 h-2.5 w-2.5 rounded-full bg-emerald-600 shadow-[0_0_12px_var(--signal)]" />
      <h1 className="font-display text-2xl font-semibold text-white sm:text-3xl">
        Pasangkan Layar Ini
      </h1>
      <p className="mt-2 max-w-sm text-sm text-white/50">
        Masukkan kode pairing 6 digit yang diberikan admin.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 w-full max-w-xs">
        <input
          autoFocus
          data-testid="pairing-code-input"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/[^a-zA-Z0-9]/g, "").slice(0, 8))}
          type="text"
          inputMode="text"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="characters"
          spellCheck={false}
          placeholder="AB3D9E2K"
          className="w-full rounded-xl border-2 border-white/15 bg-white/5 px-4 py-4 text-center font-mono text-3xl tracking-[0.4em] text-white outline-none focus:border-emerald-500"
        />

        {error && <p data-testid="pairing-error" className="mt-3 text-sm text-rose-400">{error}</p>}
        {pairedName && !error && (
          <p data-testid="pairing-success" className="mt-3 text-sm text-emerald-400">
            Berhasil dipasangkan ke &ldquo;{pairedName}&rdquo;, memuat layar...
          </p>
        )}

        <button
          data-testid="pairing-submit"
          type="submit"
          disabled={submitting || code.length < 6}
          className="mt-4 w-full rounded-lg bg-white px-4 py-3.5 text-base font-semibold text-gray-900 hover:opacity-90 disabled:opacity-40"
        >
          {submitting ? "Memeriksa..." : "Pasang Layar"}
        </button>
      </form>

      <p className="mt-10 max-w-xs text-xs text-white/30">
        Belum punya kode? Tanya Admin
      </p>
      {lockedUntil && Date.now() < lockedUntil && (
        <p className="mt-2 text-xs text-rose-400">
          Terkunci sementara karena terlalu banyak percobaan.
        </p>
      )}
    </div>
  );
}