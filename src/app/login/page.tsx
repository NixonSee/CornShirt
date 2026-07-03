"use client";

import Image from "next/image";
import Link from "next/link";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { FormEvent, Suspense, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import {
  getSafeEventReturnTo,
  withEventReturnTo,
} from "@/lib/eventReturnTo";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = getSafeEventReturnTo(searchParams.get("returnTo"));

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const emailInputRef = useRef<HTMLInputElement>(null);

  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [recoverySent, setRecoverySent] = useState(false);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setErrorMessage("");
    setRecoverySent(false);
    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        setErrorMessage(error.message);
        return;
      }

      const userId = data.user?.id;

      if (!userId) {
        setErrorMessage("Unable to find your account. Please try again.");
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("user_id", userId)
        .single();

      if (profileError || !profile) {
        setErrorMessage(
          "Your account was found, but your profile could not be loaded."
        );
        return;
      }

      switch (profile.role) {
        case "admin":
          router.replace("/admin");
          break;

        case "organizer":
          router.replace("/organizer");
          break;

        case "customer":
        case "user":
        default:
          router.replace(returnTo ?? "/customer");
          break;
      }
    } catch {
      setErrorMessage("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleForgotPassword() {
    setErrorMessage("");
    setRecoverySent(false);

    if (!email.trim() || !emailInputRef.current?.checkValidity()) {
      setErrorMessage("Enter a valid email address to reset your password.");
      emailInputRef.current?.focus();
      return;
    }

    setIsResetting(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/auth/set-password`,
      });

      if (error) {
        setErrorMessage(error.message);
        return;
      }

      setRecoverySent(true);
    } catch {
      setErrorMessage("Unable to send the reset email. Please try again.");
    } finally {
      setIsResetting(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="login-title">
        <Link href="/" className="auth-logo">
          <Image
            src="/CornShirt Hub.png"
            alt="CornShirt logo"
            width={300}
            height={100}
            priority
          />
        </Link>

        <h1 id="login-title">Welcome back</h1>
        <p className="muted">
          Please enter your details.
        </p>

        <form className="form" onSubmit={handleLogin}>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              ref={emailInputRef}
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setRecoverySent(false);
              }}
              required
            />
          </div>

          <div className="field">
            <div className="login-password-heading">
              <label htmlFor="password">Password</label>
              <button
                type="button"
                className="login-forgot-password"
                onClick={handleForgotPassword}
                disabled={isLoading || isResetting}
              >
                {isResetting ? "Sending..." : "Forgot password?"}
              </button>
            </div>

            <div className="password-field">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />

              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword((current) => !current)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {recoverySent ? (
            <p className="login-recovery-success" role="status">
              Check your email for a secure password-reset link.
            </p>
          ) : null}

          {errorMessage ? (
            <p className="form-error" role="alert">
              {errorMessage}
            </p>
          ) : null}

          <button className="button full" type="submit" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="button-spinner" size={18} />
                Logging in...
              </>
            ) : (
              "Log in"
            )}
          </button>
        </form>

        <p className="auth-footer">
          No account?{" "}
          <Link href={withEventReturnTo("/register", returnTo)}>Sign up</Link>
        </p>
      </section>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="auth-page">
          <section className="auth-card" aria-live="polite">
            <p className="muted">Loading login...</p>
          </section>
        </main>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
