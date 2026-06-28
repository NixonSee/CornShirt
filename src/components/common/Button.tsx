"use client";

import { ButtonHTMLAttributes, ReactNode } from "react";
import { Loader2 } from "lucide-react";

type Variant = "primary" | "secondary" | "outline" | "destructive" | "success";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  icon?: ReactNode;
  loading?: boolean;
  fullWidth?: boolean;
}

const variantMap: Record<Variant, string> = {
  primary: "button",
  secondary: "button-secondary",
  outline: "button-outline",
  destructive: "button button-destructive",
  success: "button button-success",
};

export function Button({
  variant = "primary",
  icon,
  loading = false,
  fullWidth = false,
  className = "",
  children,
  disabled,
  ...props
}: ButtonProps) {
  const classes = [
    variantMap[variant],
    fullWidth ? "full" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button className={classes} disabled={disabled || loading} {...props}>
      {loading ? (
        <Loader2 className="button-spinner" size={18} />
      ) : icon ? (
        <span className="button-icon">{icon}</span>
      ) : null}
      {children}
    </button>
  );
}
