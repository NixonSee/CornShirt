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

export function ChangePasswordForm() {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [isSaving, setIsSaving] = useState(false);
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
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setIsSaving(false);

    if (updateError) {
      setError(updateError.message || "Your password could not be changed.");
      return;
    }

    setPassword("");
    setConfirmation("");
    setSuccess("Your password has been updated.");
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
        <PasswordStrengthMeter
          password={password}
          className={styles.passwordStrength}
        />
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

        <Button
          type="submit"
          className={styles.passwordButton}
          loading={isSaving}
          disabled={!password || !confirmation}
        >
          Update password
        </Button>
      </form>
    </section>
  );
}
