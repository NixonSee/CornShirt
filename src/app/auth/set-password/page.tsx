"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/common";
import { PasswordStrengthMeter } from "@/components/auth/PasswordStrengthMeter";
import {
  PASSWORD_MIN_LENGTH,
  passwordPolicyError,
} from "@/lib/passwordPolicy";
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
    async function confirmSession() {
      const { data, error } = await supabase.auth.getSession();

      if (error || !data.session) {
        router.replace("/login?error=no_session");
        return;
      }

      setStep("form");
    }

    void confirmSession();
  }, [router]);

  const passwordsMatch = confirm.length > 0 && password === confirm;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setPasswordError("");

    const policyError = passwordPolicyError(password);
    if (policyError) {
      setPasswordError(policyError);
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
          <span className="password-setup-eyebrow">Secure password change</span>
          <h1>Preparing your account</h1>
          <p>We&apos;re verifying your link and setting up a safe session.</p>
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
          <span className="password-setup-eyebrow">Password updated</span>
          <h1>Your new password is ready.</h1>
          <p>
            Your password has been securely saved. Sign in with your new
            password to continue.
          </p>
          <div className="password-setup-ready-list">
            <span><Check size={15} /> Password secured</span>
            <span><Check size={15} /> Account access ready</span>
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
            <span><ShieldCheck size={14} /> Secure link verified</span>
          </div>

          <header className="password-setup-header">
            <span className="password-setup-eyebrow">
              <Sparkles size={13} /> Account security
            </span>
            <h1>Set your password.</h1>
            <p>Choose a secure password for your CornShirt account.</p>
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
                  placeholder={`At least ${PASSWORD_MIN_LENGTH} characters`}
                  autoComplete="new-password"
                  required
                  minLength={PASSWORD_MIN_LENGTH}
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

            <PasswordStrengthMeter password={password} />

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
                  minLength={PASSWORD_MIN_LENGTH}
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
              Save password <ArrowRight size={17} />
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
