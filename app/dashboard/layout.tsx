import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Sidebar from "@/components/Sidebar";
import DashboardShell from "@/components/DashboardShell";
import type { Profile } from "@/lib/types";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch profile (best-effort: before migration, profile may not exist)
  let profile: Profile | null = null;
  try {
    const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
    profile = (data as Profile) ?? null;
  } catch {
    // profiles table not yet migrated
  }

  // Badge counts for sidebar (best-effort)
  let counts: { displays: number; media: number; playlists: number; schedules: number; announcer: number } = {
    displays: 0,
    media: 0,
    playlists: 0,
    schedules: 0,
    announcer: 0,
  };
  try {
    const [d, m, p, s, a] = await Promise.all([
      supabase.from("displays").select("id", { count: "exact", head: true }),
      supabase.from("media").select("id", { count: "exact", head: true }),
      supabase.from("playlists").select("id", { count: "exact", head: true }),
      supabase.from("schedules").select("id", { count: "exact", head: true }),
      supabase.from("announcements").select("id", { count: "exact", head: true }),
    ]);
    counts = {
      displays: d.count ?? 0,
      media: m.count ?? 0,
      playlists: p.count ?? 0,
      schedules: s.count ?? 0,
      announcer: a.count ?? 0,
    };
  } catch {
    // ignore — sidebar still renders
  }

  return (
    <DashboardShell email={user.email ?? ""} counts={counts} profile={profile}>
      {children}
    </DashboardShell>
  );
}
