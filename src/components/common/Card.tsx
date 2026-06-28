"use client";

import { HTMLAttributes, ReactNode } from "react";

type CardVariant = "metric" | "panel" | "table";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  title?: string;
  titleBadge?: ReactNode;
  description?: string;
  icon?: ReactNode;
  value?: string | number;
  titleClassName?: string;
  headerAction?: ReactNode;
}

const variantClass: Record<CardVariant, string> = {
  metric: "metric",
  panel: "panel",
  table: "table-card",
};

export function Card({
  variant = "panel",
  title,
  titleBadge,
  description,
  icon,
  value,
  titleClassName,
  headerAction,
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
        <div
          className="card-header"
          style={
            headerAction
              ? {
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 12,
                }
              : undefined
          }
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <h2 className={titleClassName}>{title}</h2>
            {titleBadge && <div>{titleBadge}</div>}
          </div>
          {description && <p className="muted">{description}</p>}
          {headerAction && <div>{headerAction}</div>}
        </div>
      )}
      {children}
    </div>
  );
}
