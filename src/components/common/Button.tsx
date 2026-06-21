"use client";

type Variant = "primary" | "secondary" | "danger";

type ButtonProps = {
  variant?: Variant;
  disabled?: boolean;
  onClick?: () => void;
  type?: "button" | "submit" | "reset";
  children: React.ReactNode;
  className?: string;
};

const variantStyles: Record<Variant, string> = {
  primary: "btn-primary",
  secondary: "btn-secondary",
  danger: "btn-danger",
};

export default function Button({
  variant = "primary",
  disabled,
  onClick,
  type = "button",
  children,
  className,
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`${variantStyles[variant]} ${className ?? ""}`}
    >
      {children}
    </button>
  );
}
