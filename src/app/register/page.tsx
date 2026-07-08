"use client";

import Image from "next/image";
import Link from "next/link";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { FormEvent, Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import {
  getSafeEventReturnTo,
  withEventReturnTo,
} from "@/lib/eventReturnTo";

function RegisterContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = getSafeEventReturnTo(searchParams.get("returnTo"));

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isProvisioningWallet, setIsProvisioningWallet] = useState(false);
  const [walletRetryAvailable, setWalletRetryAvailable] = useState(false);

  async function provisionWallet(): Promise<boolean> {
    setIsProvisioningWallet(true);
    setWalletRetryAvailable(false);
    setErrorMessage("");

    try {
      const response = await fetch("/api/customer/wallet/provision", {
        method: "POST",
      });
      const body = (await response.json().catch(() => ({}))) as {
        error?: string;
      };

      if (!response.ok) {
        setErrorMessage(
          body.error ??
            "Your account was created, but wallet setup needs another attempt.",
        );
        setWalletRetryAvailable(true);
        return false;
      }

      return true;
    } catch {
      setErrorMessage(
        "Your account was created, but wallet setup needs another attempt.",
      );
      setWalletRetryAvailable(true);
      return false;
    } finally {
      setIsProvisioningWallet(false);
    }
  }

  function finishRegistration() {
    setSuccessMessage(
      "Account and managed wallet created. Redirecting you to the login page...",
    );

    setTimeout(() => {
      router.push(withEventReturnTo("/login", returnTo));
    }, 1500);
  }

  async function handleRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setErrorMessage("");
    setSuccessMessage("");

    if (password.length < 6) {
      setErrorMessage("Password must contain at least 6 characters.");
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });

      if (error) {
        setErrorMessage(error.message);
        return;
      }

      const userId = data.user?.id;

      if (!userId) {
        setErrorMessage("Account creation failed. Please try again.");
        return;
      }

      //After signup, registration creates the profile with wallet_status "pending" and calls the wallet API
      const { error: profileError } = await supabase.from("profiles").insert({
        user_id: userId,
        name: name.trim(),
        email: email.trim(),
        role: "customer",
        wallet_status: "pending",
      });

      if (profileError) {
        setErrorMessage(
          "Your account was created, but the customer profile could not be saved."
        );
        return;
      }

      const walletReady = await provisionWallet();
      if (!walletReady) return;
      finishRegistration();
    } catch {
      setErrorMessage("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="register-title">
        <Link href="/" className="auth-logo">
          <Image
            src="/CornShirt Hub.png"
            alt="CornShirt logo"
            width={300}
            height={100}
            priority
          />
        </Link>

        <h1 id="register-title">Create your account</h1>
        <p className="muted">
          Please enter your details.
        </p>

        <form className="form" onSubmit={handleRegister}>
          <div className="field">
            <label htmlFor="name">Full name</label>
            <input
              id="name"
              type="text"
              autoComplete="name"
              placeholder="Jane Doe"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
            />
          </div>

          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>

          <div className="field">
            <label htmlFor="password">Password</label>

            <div className="password-field">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                placeholder="Create a password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                minLength={6}
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

          {errorMessage ? (
            <p className="form-error" role="alert">
              {errorMessage}
            </p>
          ) : null}

          {successMessage ? (
            <p className="form-success" role="status">
              {successMessage}
            </p>
          ) : null}

          {isProvisioningWallet ? (
            <p className="form-success" role="status">
              Creating your CornShirt wallet...
            </p>
          ) : null}

          {walletRetryAvailable ? (
            <button
              className="button-secondary full"
              type="button"
              disabled={isProvisioningWallet}
              onClick={async () => {
                if (await provisionWallet()) finishRegistration();
              }}
            >
              Retry wallet setup
            </button>
          ) : null}

          <button
            className="button full"
            type="submit"
            disabled={
              isLoading || isProvisioningWallet || walletRetryAvailable
            }
          >
            {isLoading || isProvisioningWallet ? (
              <>
                <Loader2 className="button-spinner" size={18} />
                {isProvisioningWallet
                  ? "Creating your CornShirt wallet..."
                  : "Creating account..."}
              </>
            ) : (
              "Create account"
            )}
          </button>
        </form>

        <p className="small-note">
          By signing up, you agree to the CornShirt terms. Payments run in
          Stripe Test Mode using Malaysian Ringgit.
        </p>

        <p className="auth-footer">
          Already have an account?{" "}
          <Link href={withEventReturnTo("/login", returnTo)}>Log in</Link>
        </p>
      </section>
    </main>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <main className="auth-page">
          <section className="auth-card" aria-live="polite">
            <p className="muted">Loading registration...</p>
          </section>
        </main>
      }
    >
      <RegisterContent />
    </Suspense>
  );
}
