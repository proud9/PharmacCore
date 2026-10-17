export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow ? (
          <p className="text-[11px] uppercase tracking-[0.18em] text-pine-700/70">{eyebrow}</p>
        ) : null}
        <h1 className="font-display text-3xl text-pine-900">{title}</h1>
        {description ? <p className="mt-1 max-w-2xl text-sm text-ink/70">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}
