"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/common";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

export default function SetPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<"loading" | "form" | "done">("loading");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const queryParams = new URLSearchParams(window.location.search);
    const recoveryCode = queryParams.get("code");
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const accessToken = hashParams.get("access_token");
    const refreshToken = hashParams.get("refresh_token");

    async function establishRecoverySession() {
      if (!recoveryCode && !accessToken && !refreshToken) {
        router.replace("/login?error=no_token");
        return;
      }

      if (!recoveryCode && (!accessToken || !refreshToken)) {
        router.replace("/login?error=no_tokens");
        return;
      }

      if (recoveryCode) {
        const { data, error } = await supabase.auth.getSession();

        if (error || !data.session) {
          router.replace("/login?error=auth_failed");
          return;
        }

        setStep("form");
        return;
      }

      const { error } = await supabase.auth.setSession({
        access_token: accessToken!,
        refresh_token: refreshToken!,
      });

      if (error) {
        router.replace("/login?error=auth_failed");
        return;
      }

      setStep("form");
    }

    void establishRecoverySession();
  }, [router]);

  const passwordChecks = [
    password.length >= 6,
    /[A-Z]/.test(password) && /[a-z]/.test(password),
    /\d/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ];
  const strength = passwordChecks.filter(Boolean).length;
  const passwordsMatch = confirm.length > 0 && password === confirm;
  const strengthLabel = ["Enter a password", "Basic", "Good", "Strong", "Excellent"][strength];

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setPasswordError("");

    if (password.length < 6) {
      setPasswordError("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirm) {
      setPasswordError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    const { error } = await supabase.auth.updateUser({ password });
    setIsSubmitting(false);

    if (error) {
      setPasswordError(error.message);
      return;
    }

    setStep("done");
  }

  async function goToLogin() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  if (step === "loading") {
    return (
      <main className="password-setup-page">
        <section className="password-setup-state-card" aria-live="polite">
          <div className="password-setup-loader">
            <Loader2 className="button-spinner" size={26} />
          </div>
          <span className="password-setup-eyebrow">Secure invitation</span>
          <h1>Preparing your account</h1>
          <p>We&apos;re verifying your invitation and setting up a safe session.</p>
          <div className="password-setup-loading-line" aria-hidden="true"><span /></div>
        </section>
      </main>
    );
  }

  if (step === "done") {
    return (
      <main className="password-setup-page">
        <section className="password-setup-card password-setup-complete-card">
          <div className="password-setup-success-icon" aria-hidden="true">
            <CheckCircle2 size={36} />
          </div>
          <span className="password-setup-eyebrow">Account activated</span>
          <h1>You&apos;re ready to take the stage.</h1>
          <p>
            Your password is set and your organizer account is ready. Sign in
            to start building your next live experience.
          </p>
          <div className="password-setup-ready-list">
            <span><Check size={15} /> Password secured</span>
            <span><Check size={15} /> Organizer access enabled</span>
          </div>
          <Button onClick={goToLogin} fullWidth>
            Go to Login <ArrowRight size={17} />
          </Button>
        </section>
      </main>
    );
  }

  return (
    <>
      <title>Set Your Password — CornShirt</title>
      <main className="password-setup-page">
        <section className="password-setup-card">
          <div className="password-setup-brand">
            <Image
              src="/CornShirt Hub.png"
              alt="CornShirt"
              width={150}
              height={44}
              priority
            />
            <span><ShieldCheck size={14} /> Invitation verified</span>
          </div>

          <header className="password-setup-header">
            <span className="password-setup-eyebrow">
              <Sparkles size={13} /> Application approved
            </span>
            <h1>Welcome to the stage.</h1>
            <p>Create a secure password to activate your organizer account.</p>
          </header>

          {passwordError && (
            <div className="password-setup-alert" role="alert">
              {passwordError}
            </div>
          )}

          <form className="password-setup-form" onSubmit={handleSubmit}>
            <label className="password-setup-field">
              <span>New password</span>
              <div className="password-setup-input-wrap">
                <LockKeyhole size={17} aria-hidden="true" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="At least 6 characters"
                  autoComplete="new-password"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </label>

            <div className="password-strength" aria-live="polite">
              <div className="password-strength-bars" aria-hidden="true">
                {[1, 2, 3, 4].map((level) => (
                  <span key={level} className={strength >= level ? "is-active" : ""} />
                ))}
              </div>
              <div>
                <span>{strengthLabel}</span>
                <small>Use mixed case, a number, and a symbol for extra strength.</small>
              </div>
            </div>

            <label className="password-setup-field">
              <span>Confirm password</span>
              <div className="password-setup-input-wrap">
                <LockKeyhole size={17} aria-hidden="true" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={confirm}
                  onChange={(event) => setConfirm(event.target.value)}
                  placeholder="Re-enter your password"
                  autoComplete="new-password"
                  required
                  minLength={6}
                  aria-describedby="password-match-status"
                />
                {confirm.length > 0 && (
                  <span className={passwordsMatch ? "is-match" : "is-mismatch"} aria-hidden="true">
                    {passwordsMatch ? <Check size={17} /> : null}
                  </span>
                )}
              </div>
              <small
                id="password-match-status"
                className={`password-match-status ${
                  confirm.length === 0 ? "" : passwordsMatch ? "is-match" : "is-mismatch"
                }`}
              >
                {confirm.length === 0
                  ? "Enter the same password again."
                  : passwordsMatch
                    ? "Passwords match."
                    : "Passwords do not match yet."}
              </small>
            </label>

            <Button type="submit" loading={isSubmitting} fullWidth>
              Activate my account <ArrowRight size={17} />
            </Button>
          </form>

          <footer className="password-setup-trust">
            <ShieldCheck size={15} aria-hidden="true" />
            Secure account setup powered by Supabase
          </footer>
        </section>
      </main>
    </>
  );
}
