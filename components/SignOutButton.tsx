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
      className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs text-slate-500 dark:text-slate-400 transition-colors hover:bg-rose-600/10 hover:text-rose-600 dark:text-rose-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-rose-500"
    >
      <span aria-hidden>→</span>
      Keluar
    </button>
  );
}
