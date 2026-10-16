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
      className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs text-text-muted transition-colors hover:bg-danger/10 hover:text-danger focus-visible:outline focus-visible:outline-2 focus-visible:outline-danger"
    >
      <span aria-hidden>→</span>
      Keluar
    </button>
  );
}
