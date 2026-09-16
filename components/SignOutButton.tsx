"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function SignOutButton() {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <button
      onClick={handleSignOut}
      className="rounded-lg border border-border px-3 py-1.5 text-xs text-text-muted transition-colors hover:border-danger/40 hover:text-danger"
    >
      Keluar
    </button>
  );
}
