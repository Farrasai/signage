import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Sidebar from "@/components/Sidebar";
import SignOutButton from "@/components/SignOutButton";

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

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-60 shrink-0 flex-col border-r border-border bg-surface px-4 py-5">
        <div className="mb-6 flex items-center gap-2.5 px-1">
          <span className="h-2.5 w-2.5 rounded-full bg-signal shadow-[0_0_12px_var(--signal)]" />
          <span className="font-display text-base font-semibold tracking-tight">
            Siaran
          </span>
        </div>
        <Sidebar />
        <div className="mt-auto space-y-2 border-t border-border pt-4">
          <p className="truncate px-1 text-xs text-text-muted">{user.email}</p>
          <SignOutButton />
        </div>
      </aside>
      <main className="min-w-0 flex-1 px-8 py-7">{children}</main>
    </div>
  );
}
