import type { User } from "@supabase/supabase-js";
import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export type AppRole = "admin" | "organizer" | "customer" | "user";

interface VerifiedIdentity {
  user: User;
  profile: {
    role: AppRole;
  };
}

type IdentityResult =
  | { status: "authenticated"; identity: VerifiedIdentity }
  | { status: "unauthenticated" }
  | { status: "missing-profile" };

const knownRoles = new Set<AppRole>([
  "admin",
  "organizer",
  "customer",
  "user",
]);

function isAppRole(role: unknown): role is AppRole {
  return typeof role === "string" && knownRoles.has(role as AppRole);
}

function roleHome(role: AppRole) {
  switch (role) {
    case "admin":
      return "/admin";
    case "organizer":
      return "/organizer";
    case "customer":
    case "user":
      return "/customer";
  }
}

export async function getVerifiedRole(): Promise<IdentityResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return { status: "unauthenticated" };

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("user_id", user.id)
    .single();

  if (profileError || !profile || !isAppRole(profile.role)) {
    return { status: "missing-profile" };
  }

  return {
    status: "authenticated",
    identity: {
      user,
      profile: { role: profile.role },
    },
  };
}

export async function requireRole(allowedRoles: readonly AppRole[]) {
  const result = await getVerifiedRole();

  if (result.status === "unauthenticated") redirect("/login");
  if (result.status === "missing-profile") redirect("/visitor");

  if (!allowedRoles.includes(result.identity.profile.role)) {
    redirect(roleHome(result.identity.profile.role));
  }

  return result.identity;
}

export async function authorizeApiRole(allowedRoles: readonly AppRole[]) {
  const result = await getVerifiedRole();

  if (result.status === "unauthenticated") {
    return {
      ok: false as const,
      response: Response.json({ error: "Authentication required" }, { status: 401 }),
    };
  }

  if (
    result.status === "missing-profile" ||
    !allowedRoles.includes(result.identity.profile.role)
  ) {
    return {
      ok: false as const,
      response: Response.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return { ok: true as const, identity: result.identity };
}
