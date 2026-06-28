"use client";

import { HTMLAttributes, ReactNode } from "react";

type CardVariant = "metric" | "panel" | "table";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  title?: string;
  description?: string;
  icon?: ReactNode;
  value?: string | number;
  titleClassName?: string;
}

const variantClass: Record<CardVariant, string> = {
  metric: "metric",
  panel: "panel",
  table: "table-card",
};

export function Card({
  variant = "panel",
  title,
  description,
  icon,
  value,
  titleClassName,
  className = "",
  children,
  ...props
}: CardProps) {
  const cls = [variantClass[variant], className].filter(Boolean).join(" ");

  if (variant === "metric") {
    return (
      <div className={cls} {...props}>
        {icon && <div className="card-icon">{icon}</div>}
        {value != null && <strong>{value}</strong>}
        {title && <span className={titleClassName}>{title}</span>}
      </div>
    );
  }

  return (
    <div className={cls} {...props}>
      {title && (
        <div className="card-header">
          <h2 className={titleClassName}>{title}</h2>
          {description && <p className="muted">{description}</p>}
        </div>
      )}
      {children}
    </div>
  );
}
