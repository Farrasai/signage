import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST() {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error("Sign out error", error);
    return NextResponse.json({ error: "Gagal keluar" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
