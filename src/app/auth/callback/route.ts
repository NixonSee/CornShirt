import { NextResponse, type NextRequest } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import type { AppRole } from "@/lib/requireRole";

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

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const type = searchParams.get("type");
  const intent = searchParams.get("intent");

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=no_code`);
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    const message = encodeURIComponent(error.message);
    return NextResponse.redirect(`${origin}/login?error=auth_failed&details=${message}`);
  }

  if (
    intent === "invite" ||
    intent === "recovery" ||
    type === "invite" ||
    type === "recovery"
  ) {
    const flow = intent === "recovery" || type === "recovery"
      ? "recovery"
      : "invite";
    return NextResponse.redirect(
      `${origin}/auth/set-password?flow=${flow}`,
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(`${origin}/login?error=no_session`);
  }

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("role, status")
    .eq("user_id", user.id)
    .single();

  if (!profile || !isAppRole(profile.role)) {
    return NextResponse.redirect(`${origin}/visitor`);
  }

  if (profile.status === "deactivated") {
    return NextResponse.redirect(`${origin}/login?error=deactivated`);
  }

  return NextResponse.redirect(new URL(roleHome(profile.role), origin));
}
