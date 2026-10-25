import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import rateLimit from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const limiter = rateLimit({ interval: 60_000 });

function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return "unknown";
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await limiter.check(10, `delete-user:${getClientIp(_req)}`);
  } catch {
    return NextResponse.json({ error: "Terlalu banyak permintaan. Coba lagi nanti." }, { status: 429 });
  }

  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if ((profile as { role?: string } | null)?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (id === user.id) return NextResponse.json({ error: "Tidak dapat menghapus diri sendiri." }, { status: 400 });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY belum dikonfigurasi." }, { status: 500 });
  }
  const admin = createAdminClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const { error: delAuth } = await admin.auth.admin.deleteUser(id);
  if (delAuth) {
    console.error("Delete user error", delAuth);
    return NextResponse.json({ error: "Gagal menghapus user." }, { status: 400 });
  }
  // profile will cascade delete
  return NextResponse.json({ ok: true });
}
