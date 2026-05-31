import { redirect } from "next/navigation";

import type { AppRole } from "@/lib/constants";
import type { ProfileRow } from "@/lib/database.types";
import { ensureProfile } from "@/lib/profile";
import { roleHomePath } from "@/lib/routes";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type SessionProfile = {
  userId: string;
  profile: ProfileRow;
};

export async function getCurrentProfile() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return null;
  }

  return ensureProfile(supabase, user);
}

export async function requireProfile(): Promise<SessionProfile> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/auth/sign-in");
  }

  const profile = await ensureProfile(supabase, user);
  return { userId: user.id, profile };
}

export async function requireRole(roles: AppRole[]): Promise<SessionProfile> {
  const session = await requireProfile();

  if (!roles.includes(session.profile.role)) {
    redirect(roleHomePath(session.profile.role));
  }

  return session;
}
