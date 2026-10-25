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

export async function GET(req: Request) {
  try {
    await limiter.check(30, `list-users:${getClientIp(req)}`);
  } catch {
    return NextResponse.json({ error: "Terlalu banyak permintaan. Coba lagi nanti." }, { status: 429 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  // robust check via service_role to avoid RLS recursion
  let isAdminUser = false;
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const svc = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (url && svc) {
      const adminTmp = createAdminClient(url, svc, { auth: { autoRefreshToken: false, persistSession: false } });
      const { data: prof } = await adminTmp.from("profiles").select("role").eq("id", user.id).maybeSingle();
      isAdminUser = (prof as { role?: string } | null)?.role === "admin";
    } else {
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
      isAdminUser = (profile as { role?: string } | null)?.role === "admin";
    }
  } catch (err) {
    console.error("Admin check error", err);
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
    isAdminUser = (profile as { role?: string } | null)?.role === "admin";
  }
  if (!isAdminUser) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { data, error } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
  if (error) {
    console.error("List users error", error);
    return NextResponse.json({ error: "Gagal memuat data user." }, { status: 500 });
  }
  return NextResponse.json({ profiles: data });
}
