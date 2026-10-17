export function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-pine-900/10 bg-white p-5 shadow-panel">
      <p className="text-[11px] uppercase tracking-[0.16em] text-pine-700/70">{label}</p>
      <p className="mt-2 font-display text-3xl text-pine-900">{value}</p>
      {hint ? <p className="mt-1 text-xs text-ink/60">{hint}</p> : null}
    </div>
  );
}
