"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/common";
import { Loader2, CheckCircle, Eye, EyeOff } from "lucide-react";

export default function SetPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<"loading" | "form" | "done">("loading");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [passwordError, setPasswordError] = useState("");

  useEffect(() => {
    const hash = window.location.hash;
    if (!hash) {
      router.replace("/login?error=no_token");
      return;
    }

    const params = new URLSearchParams(hash.substring(1));
    const access_token = params.get("access_token");
    const refresh_token = params.get("refresh_token");

    if (!access_token || !refresh_token) {
      router.replace("/login?error=no_tokens");
      return;
    }

    supabase.auth
      .setSession({ access_token, refresh_token })
      .then(({ error }) => {
        if (error) {
          router.replace("/login?error=auth_failed");
        } else {
          setStep("form");
        }
      });
  }, [router]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setPasswordError("");

    if (password.length < 6) {
      setPasswordError("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirm) {
      setPasswordError("Passwords do not match.");
      return;
    }

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setPasswordError(error.message);
      return;
    }

    setStep("done");
  }

  if (step === "loading") {
    return (
      <div className="state-page" style={{ gap: 16 }}>
        <Loader2 className="button-spinner" size={28} />
        <p style={{ fontSize: 14, color: "var(--foreground)" }}>
          Setting up your account...
        </p>
      </div>
    );
  }

  if (step === "done") {
    return (
      <div
        className="state-page"
        style={{ textAlign: "center", gap: 16, maxWidth: 420, margin: "0 auto" }}
      >
        <CheckCircle size={48} style={{ color: "var(--success)" }} />
        <h1 style={{ color: "var(--primary)", fontSize: 24, margin: 0 }}>
          Password Set!
        </h1>
        <p style={{ color: "var(--foreground)", margin: 0, lineHeight: 1.5 }}>
          Your account is ready. You can now log in with your email and the
          password you just created.
        </p>
        <Button
          style={{ marginTop: 12 }}
          onClick={() => {
            supabase.auth.signOut();
            router.replace("/login");
          }}
        >
          Go to Login
        </Button>
      </div>
    );
  }

  return (
    <>
      <title>Set Your Password — CornShirt</title>
      <div
        className="state-page"
        style={{ gap: 0, maxWidth: 420, margin: "0 auto" }}
      >
        <div
          className="table-card"
          style={{
            width: "100%",
            padding: 32,
            textAlign: "center",
          }}
        >
          <h1
            style={{
              fontSize: 22,
              color: "var(--primary)",
              margin: "0 0 8px",
            }}
          >
            Welcome to CornShirt!
          </h1>
          <p style={{ fontSize: 14, color: "var(--foreground)", margin: "0 0 24px" }}>
            Your application has been approved. Set your password to get started.
          </p>

          {passwordError && (
            <p
              style={{
                color: "var(--destructive)",
                fontSize: 13,
                margin: "0 0 16px",
                padding: "8px 12px",
                background: "var(--destructive-foreground)",
                borderRadius: 6,
                textAlign: "left",
              }}
            >
              {passwordError}
            </p>
          )}

          <form
            onSubmit={handleSubmit}
            style={{ display: "flex", flexDirection: "column", gap: 16 }}
          >
            <label
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 6,
                fontSize: 13,
                color: "var(--foreground)",
                textAlign: "left",
              }}
            >
              Password
              <div style={{ position: "relative" }}>
                <input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  required
                  minLength={6}
                  style={{
                    width: "100%",
                    padding: "10px 40px 10px 12px",
                    borderRadius: 6,
                    border: "1px solid var(--input)",
                    background: "var(--card)",
                    color: "var(--foreground)",
                    fontSize: 14,
                    boxSizing: "border-box",
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPw((s) => !s)}
                  style={{
                    position: "absolute",
                    right: 10,
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "var(--muted-foreground)",
                    padding: 0,
                  }}
                >
                  {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </label>

            <label
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 6,
                fontSize: 13,
                color: "var(--foreground)",
                textAlign: "left",
              }}
            >
              Confirm password
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Re-enter your password"
                required
                minLength={6}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: 6,
                  border: "1px solid var(--input)",
                  background: "var(--card)",
                  color: "var(--foreground)",
                  fontSize: 14,
                  boxSizing: "border-box",
                }}
              />
            </label>

            <Button variant="primary" type="submit">
              Set Password
            </Button>
          </form>
        </div>
      </div>
    </>
  );
}
