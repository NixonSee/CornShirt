type QuickStatProps = {
  value: string | number;
  label: string;
};

export default function QuickStat({ value, label }: QuickStatProps) {
  return (
    <div
      className="flex flex-col items-center justify-center rounded-[12px] border border-[#e2e8f0] bg-white p-5 text-center shadow-[0_1px_3px_rgba(0,0,0,.04),0_1px_2px_rgba(0,0,0,.06)]"
    >
      <p className="text-[28px] font-extrabold leading-none text-[#0f172a]">
        {value}
      </p>
      <p className="mt-[6px] text-[11px] font-semibold text-[#94a3b8]">
        {label}
      </p>
    </div>
  );
}
