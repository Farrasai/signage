import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const isProd = process.env.NODE_ENV === "production";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  // Cookie defaults for CSRF/session protection
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  if (isProd) {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=63072000; includeSubDomains; preload"
    );
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    {
      cookieOptions: {
        path: "/",
        sameSite: "strict",
        secure: isProd,
        httpOnly: true,
        maxAge: 60 * 60 * 24 * 7,
      },
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, {
              ...options,
              sameSite: "strict",
              secure: isProd,
              httpOnly: true,
              path: "/",
            })
          );
        },
      },
    }
  );

  const { data } = await supabase.auth.getUser();
  const user = data.user;

  const path = request.nextUrl.pathname;
  const isDashboard = path.startsWith("/dashboard");
  const isLogin = path.startsWith("/login");

  if (isDashboard && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (isLogin && user) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  // Role guard: Operator Bidang tidak boleh akses Announcer / Emergency / Users
  if (isDashboard && user) {
    const adminOnlyPrefixes = ["/dashboard/announcer", "/dashboard/emergency", "/dashboard/users"];
    const isAdminOnlyPath = adminOnlyPrefixes.some((p) => path === p || path.startsWith(p + "/"));
    if (isAdminOnlyPath) {
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
      const role = (profile as { role?: string } | null)?.role;
      // Jika profile belum ada (belum migrasi) atau admin, izinkan. Hanya operator_bidang yang di-redirect
      if (role === "operator_bidang") {
        const url = request.nextUrl.clone();
        url.pathname = "/dashboard";
        return NextResponse.redirect(url);
      }
    }
  }

  return response;
}

export const config = {
  matcher: ["/dashboard/:path*", "/login"],
};

