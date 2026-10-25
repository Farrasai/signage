import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    {
      cookieOptions: {
        path: "/",
        sameSite: "strict",
        secure: process.env.NODE_ENV === "production",
        httpOnly: true,
        maxAge: 60 * 60 * 24 * 7, // 7 hari
      },
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, {
                ...options,
                sameSite: "strict",
                secure: process.env.NODE_ENV === "production",
                httpOnly: true,
                path: "/",
              })
            );
          } catch {
            // Dipanggil dari Server Component — boleh diabaikan,
            // middleware yang akan menyegarkan sesi.
          }
        },
      },
    }
  );
}
