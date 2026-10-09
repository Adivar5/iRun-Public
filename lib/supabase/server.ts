import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/lib/database.types";

export async function supabaseServer() {
  const jar = await cookies();
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => jar.getAll(),
        setAll: (list: { name: string; value: string; options: CookieOptions }[], headers: Record<string, string>) => {
          try {
            list.forEach(({ name, value, options }) => jar.set(name, value, options));
            // Server Components cannot set response headers. The proxy refreshes the session
            // and applies the cache headers that must travel with auth cookies.
            void headers;
          } catch {
            /* Server Components cannot set cookies; the proxy refreshes the session */
          }
        },
      },
    },
  );
}
