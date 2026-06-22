type CardProps = {
  title: string;
  value: string | number;
  description?: string;
  className?: string;
  children?: React.ReactNode;
  trend?: { value: number; direction: "up" | "down" };
  sparkline?: React.ReactNode;
};

export default function Card({
  title,
  value,
  description,
  className,
  children,
  trend,
  sparkline,
}: CardProps) {
  return (
    <div className={`card-dashboard flex flex-col ${className ?? ""}`}>
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-[0.06em] text-[#94a3b8]">
          {title}
        </span>
        {trend && (
          <span
            className={`flex items-center gap-0.5 text-[11px] font-bold ${
              trend.direction === "up" ? "text-[#16a34a]" : "text-[#dc2626]"
            }`}
          >
            {trend.direction === "up" ? "\u2191" : "\u2193"} {Math.abs(trend.value)}%
          </span>
        )}
      </div>
      <p className="mt-2 text-[36px] font-extrabold leading-none tracking-[-0.02em] text-[#0f172a]">
        {value}
      </p>
      {description && (
        <p className="mt-2 text-[12px] text-[#94a3b8]">{description}</p>
      )}
      {sparkline && <div className="mt-auto pt-3 h-9">{sparkline}</div>}
      {children}
    </div>
  );
}
