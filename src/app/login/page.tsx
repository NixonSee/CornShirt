"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
  e.preventDefault();

  setLoading(true);
  setErrorMessage("");

  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
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

  if (profile.role === "admin") {
    router.push("/admin");
  } else if (profile.role === "organizer") {
    router.push("/organizer");
  } else {
    router.push("/user");
  }
}

  return (
    <main className="min-h-screen px-4 py-10 text-slate-950 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Blurred background image */}
      <div 
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: 'url(/Background%20Login%20Image.png)',
          filter: 'blur(2px)',
          transform: 'scale(1.1)'
        }}
      />
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/30" />
      
      {/* Content */}
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full items-center justify-center relative z-10">
          <section className="mx-auto w-full max-w-md">
            <div className="rounded-lg border border-white/20 bg-white/95 backdrop-blur-sm p-6 shadow-[0_24px_80px_rgba(0,0,0,0.40)] sm:p-8">
              <div className="mb-8">
                <div className="flex justify-center mb-6">
                  <Image
                    src="/CornShirt-Logo.png"
                    alt="CornShirt Logo"
                    width={200}
                    height={200}
                  />
                </div>
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

                {/* Password */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-800">
                  Password
                </label>

                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    className="h-12 w-full rounded-lg border border-slate-200 bg-white px-4 pr-12 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 transition hover:text-emerald-600"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

                <p className="text-center text-sm text-slate-600">
                  Don&apos;t have an account?{" "}
                  <Link
                    href="/register"
                    className="font-semibold text-emerald-600 hover:text-emerald-700 hover:underline"
                  >
                    Sign up
                  </Link>
                </p>

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
