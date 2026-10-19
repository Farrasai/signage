import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const ALLOWED_BIDANG = ["TU", "INTEL", "BIN", "PIDSUS", "PIDUM", "DATUN", "PAPBB"] as const;

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Robust admin check: bypass RLS via service_role if available, + bootstrap first admin
  let isAdminUser = false;
  let profileRole: string | null = null;
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const svc = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (url && svc) {
      const adminTmp = createAdminClient(url, svc, { auth: { autoRefreshToken: false, persistSession: false } });
      const { data: prof } = await adminTmp.from("profiles").select("role").eq("id", user.id).maybeSingle();
      profileRole = (prof as { role?: string } | null)?.role ?? null;
      if (profileRole === "admin") isAdminUser = true;
      else {
        // bootstrap: if no admin exists at all, promote this user
        const { count } = await adminTmp.from("profiles").select("id", { count: "exact", head: true }).eq("role", "admin");
        if (count === 0) {
          await adminTmp.from("profiles").upsert({ id: user.id, email: user.email ?? "", role: "admin" }, { onConflict: "id" });
          isAdminUser = true;
        }
      }
    } else {
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
      profileRole = (profile as { role?: string } | null)?.role ?? null;
      isAdminUser = profileRole === "admin";
    }
  } catch {
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
    profileRole = (profile as { role?: string } | null)?.role ?? null;
    isAdminUser = profileRole === "admin";
  }
  if (!isAdminUser) {
    const hint = profileRole ? `Role kamu saat ini: ${profileRole}.` : "Profile tidak ditemukan — jalankan migrasi 20261006_multirole.sql dan pastikan ada baris admin di public.profiles.";
    return NextResponse.json({ error: `Hanya Administrator dapat membuat user. ${hint}` }, { status: 403 });
  }

  let body: { email?: string; password?: string; bidang?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Body JSON tidak valid." }, { status: 400 }); }

  const email = body.email?.trim().toLowerCase();
  const password = body.password?.trim();
  const bidang = body.bidang?.trim();

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Email tidak valid." }, { status: 400 });
  }
  if (!password || password.length < 6) {
    return NextResponse.json({ error: "Password minimal 6 karakter." }, { status: 400 });
  }
  if (!bidang || !(ALLOWED_BIDANG as readonly string[]).includes(bidang)) {
    return NextResponse.json({ error: `Bidang harus salah satu: ${ALLOWED_BIDANG.join(", ")}` }, { status: 400 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return NextResponse.json({ error: "Server belum dikonfigurasi SUPABASE_SERVICE_ROLE_KEY. Tambahkan di .env.local dan restart." }, { status: 500 });
  }

  const admin = createAdminClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (createError) {
    return NextResponse.json({ error: createError.message }, { status: 400 });
  }
  const newId = created.user?.id;
  if (!newId) return NextResponse.json({ error: "Gagal mendapatkan ID user baru." }, { status: 500 });

  const { error: profError } = await admin.from("profiles").upsert({
    id: newId,
    email,
    role: "operator_bidang",
    bidang,
    created_by: user.id,
  }, { onConflict: "id" });

  if (profError) {
    return NextResponse.json({ error: `User dibuat tapi gagal set profile: ${profError.message}` }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id: newId });
}
