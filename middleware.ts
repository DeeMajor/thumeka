import { type NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

import { isSupabaseConfigured } from "@/lib/env";
import { isProtectedPath } from "@/lib/routes";

type CookieToSet = {
  name: string;
  value: string;
  options: CookieOptions;
};

export async function middleware(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        }
      }
    }
  );

  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (!user && isProtectedPath(request.nextUrl.pathname)) {
    // Distinguish "never signed in" from "stale/expired session". The latter
    // happens when the browser has sb-* cookies but Supabase rejects them
    // (access token expired and refresh failed, refresh token revoked,
    // cookie rotation didn't propagate cleanly through Plesk's iisnode).
    // Without this, the symptom looks like "I'm signed in but the site
    // keeps bouncing me to sign-in for no reason" — confusing for users
    // who never explicitly signed out.
    const sbCookies = request.cookies
      .getAll()
      .filter((cookie) => cookie.name.startsWith("sb-"));
    const wasSignedIn = sbCookies.length > 0;

    console.warn(
      "[middleware] redirecting to /auth/sign-in path=%s wasSignedIn=%s sbCookies=%s userError=%s",
      request.nextUrl.pathname,
      wasSignedIn,
      sbCookies.map((cookie) => cookie.name).join(",") || "none",
      userError?.message ?? "n/a"
    );

    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/auth/sign-in";
    redirectUrl.searchParams.set("next", request.nextUrl.pathname);
    if (wasSignedIn) {
      redirectUrl.searchParams.set("expired", "1");
    }

    const redirectResponse = NextResponse.redirect(redirectUrl);

    // Wipe the dead cookies on the way out so the next request starts
    // clean — otherwise the browser keeps sending the same rejected
    // token and every protected URL bounces in the same way.
    if (wasSignedIn) {
      sbCookies.forEach((cookie) => {
        redirectResponse.cookies.set({
          maxAge: 0,
          name: cookie.name,
          path: "/",
          value: ""
        });
      });
    }

    return redirectResponse;
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"]
};
