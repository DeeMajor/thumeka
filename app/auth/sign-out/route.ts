import { NextResponse } from "next/server";

import { getPublicOrigin } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  // Build the redirect off the public origin (X-Forwarded-Host) so iisnode's
  // internal loopback URL doesn't leak into the Location header.
  return NextResponse.redirect(
    new URL("/auth/sign-in", getPublicOrigin(request))
  );
}

export async function GET(request: Request) {
  return POST(request);
}
