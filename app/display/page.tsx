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

    const trimmed = code.trim();
    if (trimmed.length < 4) {
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
      console.error("Gagal menukar kode pairing:", rpcError);
      setError("Terjadi kesalahan saat menghubungi server. Coba lagi.");
      return;
    }

    const row = (Array.isArray(data) ? data[0] : null) as { slug: string; name: string } | null;
    if (!row?.slug) {
      setError("Kode salah atau sudah kedaluwarsa. Minta kode baru dari admin.");
      setCode("");
      return;
    }

    window.localStorage.setItem(PAIRING_STORAGE_KEY, row.slug);
    setPairedName(row.name);
    router.replace(`/display/${row.slug}`);
  }

  if (checking) {
    return <div className="h-screen w-screen bg-[#0a0c10]" />;
  }

  return (
    <div className="flex h-screen w-screen flex-col items-center justify-center bg-[#0a0c10] px-6 text-center">
      <span className="mb-6 h-2.5 w-2.5 rounded-full bg-signal shadow-[0_0_12px_var(--signal)]" />
      <h1 className="font-display text-2xl font-semibold text-white sm:text-3xl">
        Pasangkan Layar Ini
      </h1>
      <p className="mt-2 max-w-sm text-sm text-white/50">
        Masukkan kode pairing 6 digit yang diberikan admin. Cukup sekali — layar ini akan
        mengingatnya sendiri setelahnya, walau TV dimatikan/dinyalakan lagi.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 w-full max-w-xs">
        <input
          autoFocus
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))}
          type="tel"
          inputMode="numeric"
          pattern="[0-9]*"
          placeholder="482913"
          className="w-full rounded-xl border-2 border-white/15 bg-white/5 px-4 py-4 text-center font-mono text-3xl tracking-[0.4em] text-white outline-none focus:border-signal"
        />

        {error && <p className="mt-3 text-sm text-danger">{error}</p>}
        {pairedName && !error && (
          <p className="mt-3 text-sm text-online">
            Berhasil dipasangkan ke &ldquo;{pairedName}&rdquo;, memuat layar...
          </p>
        )}

        <button
          type="submit"
          disabled={submitting || code.length < 4}
          className="mt-4 w-full rounded-xl bg-signal px-4 py-3.5 text-base font-semibold text-[#160a05] hover:opacity-90 disabled:opacity-40"
        >
          {submitting ? "Memeriksa..." : "Pasang Layar"}
        </button>
      </form>

      <p className="mt-10 max-w-xs text-xs text-white/30">
        Belum punya kode? Buat dari dashboard → Layar &amp; TV → tombol &ldquo;Buat Kode
        Pairing&rdquo; pada layar yang dituju.
      </p>
    </div>
  );
}