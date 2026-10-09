import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { routeForAal } from "@/lib/auth/aal";

const PUBLIC = ["/login", "/mfa", "/manifest.webmanifest", "/icons", "/brand"];

type Level = "aal1" | "aal2" | null;

function level(value: string | null | undefined): Level {
  if (value === "aal1" || value === "aal2") return value;
  return null;
}

function carry(next: NextResponse, current: NextResponse) {
  for (const cookie of current.cookies.getAll()) next.cookies.set(cookie);
  for (const key of ["cache-control", "expires", "pragma"]) {
    const value = current.headers.get(key);
    if (value) next.headers.set(key, value);
  }
  return next;
}

export async function proxy(req: NextRequest) {
  let res = NextResponse.next({ request: req });
  const sb = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (list, headers) => {
          list.forEach(({ name, value }) => req.cookies.set(name, value));
          res = NextResponse.next({ request: req });
          list.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
          Object.entries(headers).forEach(([key, value]) => res.headers.set(key, value));
        },
      },
    },
  );
  const {
    data: { user },
  } = await sb.auth.getUser();
  const aal = user ? (await sb.auth.mfa.getAuthenticatorAssuranceLevel()).data : null;
  const target = routeForAal({
    currentLevel: user ? (level(aal?.currentLevel) ?? "aal1") : null,
    nextLevel: level(aal?.nextLevel),
  });
  const path = req.nextUrl.pathname;
  if (target && !PUBLIC.some((p) => path.startsWith(p))) {
    return carry(NextResponse.redirect(new URL(target, req.url)), res);
  }
  if (path === "/") return carry(NextResponse.redirect(new URL("/today", req.url)), res);
  return res;
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
