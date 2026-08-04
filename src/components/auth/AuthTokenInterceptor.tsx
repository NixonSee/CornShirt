"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

const AUTH_FLOW_PATHS = new Set(["/auth/callback", "/auth/set-password"]);

export default function AuthTokenInterceptor() {
  const router = useRouter();
  const pathname = usePathname();
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    if (AUTH_FLOW_PATHS.has(pathname)) return;

    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const type = hashParams.get("type");
    const accessToken = hashParams.get("access_token");
    const refreshToken = hashParams.get("refresh_token");

    if ((type === "invite" || type === "recovery") && accessToken && refreshToken) {
      void (async () => {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (!error) {
          router.replace("/auth/set-password");
        }
      })();
      return;
    }

    const queryParams = new URLSearchParams(window.location.search);
    if (queryParams.get("code")) {
      router.replace(`/auth/callback${window.location.search}`);
    }
  }, [pathname, router]);

  return null;
}
