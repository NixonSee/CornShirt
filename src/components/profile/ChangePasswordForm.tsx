"use client";

import { useState, type FormEvent } from "react";

import { Button } from "@/components/common";
import { PasswordStrengthMeter } from "@/components/auth/PasswordStrengthMeter";
import {
  PASSWORD_MIN_LENGTH,
  passwordPolicyError,
} from "@/lib/passwordPolicy";
import { supabase } from "@/lib/supabaseClient";
import styles from "./ProfilePage.module.css";

export function ChangePasswordForm({ email }: { email: string }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    const policyError = passwordPolicyError(password);
    if (policyError) {
      setError(policyError);
      return;
    }

    if (password !== confirmation) {
      setError("The password confirmation does not match.");
      return;
    }

    setIsSaving(true);
    try {
      const { error: verificationError } = await supabase.auth.signInWithPassword({
        email,
        password: currentPassword,
      });

      if (verificationError) {
        setError("Your current password could not be verified.");
        return;
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password,
        current_password: currentPassword,
      });

      if (updateError) {
        setError(updateError.message || "Your password could not be changed.");
        return;
      }

      setCurrentPassword("");
      setPassword("");
      setConfirmation("");
      setSuccess("Your password has been updated.");
    } catch {
      setError("Your password could not be changed. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSendResetLink() {
    setError("");
    setSuccess("");
    setIsSendingReset(true);

    try {
      const recoveryCallback = new URL("/auth/callback", window.location.origin);
      recoveryCallback.searchParams.set("intent", "recovery");
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email,
        { redirectTo: recoveryCallback.toString() },
      );

      if (resetError) {
        setError(resetError.message || "The reset link could not be sent.");
        return;
      }

      setSuccess("A password reset link has been sent to your account email.");
    } catch {
      setError("The reset link could not be sent. Please try again.");
    } finally {
      setIsSendingReset(false);
    }
  }

  return (
    <section className={styles.card}>
      <div className={styles.cardHeading}>
        <div>
          <h2>Change password</h2>
          <p>
            Choose a unique password with at least {PASSWORD_MIN_LENGTH}{" "}
            characters. Passphrases and spaces are welcome.
          </p>
        </div>
      </div>

      <form className={styles.passwordForm} onSubmit={handleSubmit}>
        <label className={styles.currentPasswordField}>
          <span>Current password</span>
          <input
            type="password"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            autoComplete="current-password"
            required
          />
        </label>
        <label>
          <span>New password</span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            minLength={PASSWORD_MIN_LENGTH}
            autoComplete="new-password"
            required
          />
        </label>
        <label>
          <span>Confirm new password</span>
          <input
            type="password"
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            minLength={PASSWORD_MIN_LENGTH}
            autoComplete="new-password"
            required
          />
        </label>
        <PasswordStrengthMeter
          password={password}
          className={styles.passwordStrength}
        />

        <Button
          type="submit"
          className={styles.passwordButton}
          loading={isSaving}
          disabled={
            isSendingReset || !currentPassword || !password || !confirmation
          }
        >
          Update password
        </Button>
      </form>

      <div className={styles.passwordReset}>
        <div>
          <strong>Forgot your current password?</strong>
          <p>A secure reset link will be sent to your account email.</p>
        </div>
        <Button
          type="button"
          variant="outline"
          loading={isSendingReset}
          disabled={isSaving}
          onClick={handleSendResetLink}
        >
          Send reset link
        </Button>
      </div>

      {error ? (
        <p className={`${styles.formMessage} ${styles.error}`} role="alert">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className={`${styles.formMessage} ${styles.success}`} role="status">
          {success}
        </p>
      ) : null}
    </section>
  );
}
