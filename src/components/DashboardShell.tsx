"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import RoleNav from "./RoleNav";
import Footer from "./Footer";
import { normalizeRole, type Role } from "./navConfig";

interface DashboardShellProps {
  role: Role;
  children: React.ReactNode;
}

/**
 * Wraps every dashboard route with the role-aware hamburger nav and a
 * lightweight client-side route guard. Unauthenticated users, or users whose
 * profile role does not match this dashboard, are redirected to /login.
 */
export default function DashboardShell({ role, children }: DashboardShellProps) {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    let active = true;

    async function verify() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("user_id", user.id)
        .single();

      if (!active) return;

      if (normalizeRole(profile?.role) !== role) {
        router.replace("/login");
        return;
      }

      setAuthorized(true);
    }

    verify();

    return () => {
      active = false;
    };
  }, [role, router]);

  if (!authorized) {
    return (
      <div className="shell-loading">
        <Loader2 className="button-spinner" size={28} />
      </div>
    );
  }

  return (
    <div className="app-shell">
      <RoleNav role={role} />
      <main className="shell-main">{children}</main>
      <Footer />
    </div>
  );
}
