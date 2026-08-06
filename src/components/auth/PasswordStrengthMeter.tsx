import {
  getPasswordStrength,
  PASSWORD_MIN_LENGTH,
} from "@/lib/passwordPolicy";

export function PasswordStrengthMeter({
  password,
  className,
}: {
  password: string;
  className?: string;
}) {
  const strength = getPasswordStrength(password);
  const remaining = Math.max(0, PASSWORD_MIN_LENGTH - strength.length);

  return (
    <div
      className={["password-strength", "password-strength-shared", className]
        .filter(Boolean)
        .join(" ")}
      aria-live="polite"
    >
      <div className="password-strength-bars" aria-hidden="true">
        {[1, 2, 3, 4].map((level) => (
          <span
            key={level}
            className={strength.score >= level ? "is-active" : ""}
          />
        ))}
      </div>
      <div className="password-strength-summary">
        <span>{strength.label}</span>
        <small>
          {remaining > 0
            ? `${remaining} more ${remaining === 1 ? "character" : "characters"} needed.`
            : "Length requirement met. Use a unique passphrase."}
        </small>
      </div>
      <small className="password-policy-hint">
        At least {PASSWORD_MIN_LENGTH} characters. Spaces are allowed; numbers
        and symbols are optional.
      </small>
    </div>
  );
}
