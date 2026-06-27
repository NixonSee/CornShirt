"use client";

import Image from "next/image";
import Link from "next/link";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function RegisterPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

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

      const { error: profileError } = await supabase.from("profiles").insert({
        user_id: userId,
        name: name.trim(),
        email: email.trim(),
        role: "customer",
      });

      if (profileError) {
        setErrorMessage(
          "Your account was created, but the customer profile could not be saved."
        );
        return;
      }

      setSuccessMessage(
        "Account created successfully. Redirecting you to the login page..."
      );

      setTimeout(() => {
        router.push("/login");
      }, 1500);
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

          <button className="button full" type="submit" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="button-spinner" size={18} />
                Creating account...
              </>
            ) : (
              "Create account"
            )}
          </button>
        </form>

        <p className="small-note">
          By signing up, you agree to the CornShirt terms. DICKEN runs in Stripe
          Test Mode.
        </p>

        <p className="auth-footer">
          Already have an account? <Link href="/login">Log in</Link>
        </p>
      </section>
    </main>
  );
}