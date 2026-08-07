export const PASSWORD_MIN_LENGTH = 12;

export type PasswordStrength = {
  score: 0 | 1 | 2 | 3 | 4;
  label: "Enter a password" | "Weak" | "Fair" | "Good" | "Strong";
  length: number;
};

export function passwordLength(password: string): number {
  return Array.from(password).length;
}

export function getPasswordStrength(password: string): PasswordStrength {
  const length = passwordLength(password);

  if (length === 0) return { score: 0, label: "Enter a password", length };
  if (length < 8) return { score: 1, label: "Weak", length };
  if (length < 10) return { score: 2, label: "Fair", length };
  if (length < PASSWORD_MIN_LENGTH) {
    return { score: 3, label: "Good", length };
  }
  return { score: 4, label: "Strong", length };
}

export function passwordPolicyError(password: string): string | null {
  return passwordLength(password) < PASSWORD_MIN_LENGTH
    ? `Use at least ${PASSWORD_MIN_LENGTH} characters. Passphrases and spaces are welcome.`
    : null;
}
