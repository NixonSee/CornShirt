"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setErrorMessage("");

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setErrorMessage(error.message);
      setLoading(false);
      return;
    }

    const userId = data.user?.id;

    if (!userId) {
      setErrorMessage("Login failed. Please try again.");
      setLoading(false);
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("user_id", userId)
      .single();

    if (profileError || !profile) {
      setErrorMessage("Profile not found. Please contact admin.");
      setLoading(false);
      return;
    }

    if (profile.role === "user") {
      router.push("/user");
    } else if (profile.role === "organizer") {
      router.push("/organizer");
    } else if (profile.role === "admin") {
      router.push("/admin");
    } else {
      setErrorMessage("Invalid role. Please contact admin.");
    }

    setLoading(false);
  }

  return (
    <main className="min-h-screen bg-white px-4 py-10 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full items-center justify-center">
          <section className="mx-auto w-full max-w-md">
            <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.10)] sm:p-8">
              <div className="mb-8">
                <h2 className="text-3xl font-bold tracking-tight text-slate-950">
                  Login
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Enter your details to continue to CornShirt.
                </p>
              </div>

              <form onSubmit={handleLogin} className="space-y-5">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-800">
                    Email
                  </label>
                  <input
                    type="email"
                    className="h-12 w-full rounded-lg border border-slate-200 bg-white px-4 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-800">
                    Password
                  </label>
                  <input
                    type="password"
                    className="h-12 w-full rounded-lg border border-slate-200 bg-white px-4 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>

                {errorMessage && (
                  <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                    {errorMessage}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="h-12 w-full rounded-lg bg-slate-950 px-4 text-sm font-bold text-white shadow-lg shadow-slate-950/15 transition hover:-translate-y-0.5 hover:bg-slate-800 focus:outline-none focus:ring-4 focus:ring-slate-200 disabled:translate-y-0 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
                >
                  {loading ? "Logging in..." : "Login"}
                </button>
              </form>
            </div>
          </section>
      </div>
    </main>
  );
}
