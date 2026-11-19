/**
 * Shown inside the Shell the moment a link is clicked, while the next page loads on the server.
 * Its outline matches PageHeader plus a panel, so the page settles in without a jump.
 */
export function PageSkeleton() {
  return (
    <div aria-busy="true" aria-live="polite" className="animate-pulse">
      <span className="sr-only">Loading…</span>
      <div className="mb-6">
        <div className="h-8 w-56 rounded-lg bg-pine-900/10" />
        <div className="mt-2 h-4 w-96 max-w-full rounded bg-pine-900/[0.06]" />
      </div>
      <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-24 rounded-2xl border border-pine-900/10 bg-white" />
        ))}
      </div>
      <div className="rounded-2xl border border-pine-900/10 bg-white p-5 shadow-panel">
        <div className="h-9 w-full rounded-lg bg-pine-900/[0.06]" />
        <div className="mt-4 space-y-3">
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-5 rounded bg-pine-900/[0.05]" />
          ))}
        </div>
      </div>
    </div>
  );
}
