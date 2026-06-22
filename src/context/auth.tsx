"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";

export type Role = "admin" | "organizer" | "user";

export type Profile = {
  role: Role;
  name: string;
  email: string;
};

type AuthContextValue = {
  user: User | null;
  role: Role | null;
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadProfile(currentUser: User) {
      const { data } = await supabase
        .from("profiles")
        .select("role, name, email")
        .eq("user_id", currentUser.id)
        .single();

      if (active) {
        setProfile(data ?? null);
      }
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!active) return;
      setUser(session?.user ?? null);
      if (session?.user) {
        loadProfile(session.user).finally(() => {
          if (active) setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });

    const { data: subscription } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!active) return;
        setUser(session?.user ?? null);
        if (session?.user) {
          loadProfile(session.user);
        } else {
          setProfile(null);
        }
      }
    );

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    router.push("/login");
  }

  return (
    <AuthContext.Provider
      value={{ user, role: profile?.role ?? null, profile, loading, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
