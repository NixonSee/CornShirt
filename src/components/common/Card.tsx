type CardProps = {
  title: string;
  value: string | number;
  description?: string;
  className?: string;
  children?: React.ReactNode;
};

export default function Card({ title, value, description, className, children }: CardProps) {
  return (
    <div className={`card-dashboard ${className ?? ""}`}>
      <p className="text-xs font-black uppercase tracking-wider text-slate-500">{title}</p>
      <p className="mt-2 text-3xl font-black text-slate-950">{value}</p>
      {description && <p className="mt-1 text-sm text-slate-600">{description}</p>}
      {children}
    </div>
  );
}
