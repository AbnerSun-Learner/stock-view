"use client";

export function StatCard({
  title,
  value,
  color,
}: {
  title: string;
  value: string;
  color: "indigo" | "green" | "blue" | "slate";
}) {
  const colors = {
    indigo: "border-indigo-500 text-indigo-600",
    green: "border-green-500 text-green-600",
    blue: "border-blue-500 text-blue-600",
    slate: "border-slate-500 text-slate-600",
  };
  return (
    <div
      className={`p-4 rounded-2xl bg-white border-l-4 shadow-sm ${
        colors[color] || colors.slate
      }`}
    >
      <p className="text-[10px] font-black uppercase opacity-50 tracking-widest">
        {title}
      </p>
      <p className="text-xl font-mono font-black mt-1">{value}</p>
    </div>
  );
}

export function InputGroup({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  type?: "text" | "number" | "email" | "password";
}) {
  const displayValue =
    type === "number" &&
    (value === null || value === undefined || Number.isNaN(Number(value)))
      ? ""
      : value;
  return (
    <div className="flex flex-col gap-1 w-full">
      <label className="text-[10px] font-black opacity-40 uppercase tracking-tighter">
        {label}
      </label>
      <input
        type={type}
        value={displayValue}
        onChange={(e) => onChange(e.target.value)}
        step="any"
        className="p-3 rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm font-mono font-bold"
      />
    </div>
  );
}
