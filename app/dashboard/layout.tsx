import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Sidebar from "@/components/Sidebar";
import SignOutButton from "@/components/SignOutButton";
import SystemClock from "@/components/SystemClock";
import ThemeToggle from "@/components/ThemeToggle";

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
    <div className="flex min-h-screen bg-bg">
      <aside className="flex w-64 shrink-0 flex-col border-r border-border bg-surface px-4 py-5">
        {/* Logo / Nama produk */}
        <div className="mb-6 flex items-center gap-2.5 px-2">
          <span
            className="h-2 w-2 rounded-full bg-signal"
            style={{ boxShadow: "0 0 8px var(--signal)" }}
            aria-hidden
          />
          <span className="text-sm font-semibold tracking-tight text-text">
            Digital Signage
          </span>
        </div>

        {/* Nav */}
        <Sidebar />

        {/* Footer sidebar */}
        <div className="mt-auto space-y-1 border-t border-border pt-4">
          <SystemClock />
          <ThemeToggle />
          <p className="truncate px-2 text-xs text-text-muted">{user.email}</p>
          <SignOutButton />
        </div>
      </aside>

      <main className="min-w-0 flex-1 px-8 py-7">{children}</main>
    </div>
  );
}
