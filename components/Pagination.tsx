import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * "Showing 51–100 of 2,503" with previous/next and nearby page numbers. Keeps the page's other
 * URL parameters (search, filters). Renders nothing when everything fits on one page.
 */
export function Pagination({
  page,
  pageSize,
  total,
  basePath,
  params = {},
}: {
  page: number;
  pageSize: number;
  total: number;
  basePath: string;
  params?: Record<string, string | undefined>;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);

  const href = (target: number) => {
    const next = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) if (value && key !== "page") next.set(key, value);
    if (target > 1) next.set("page", String(target));
    const qs = next.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };

  const numbers = Array.from(new Set([1, page - 1, page, page + 1, pages]))
    .filter((n) => n >= 1 && n <= pages)
    .sort((a, b) => a - b);

  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-ink/70">
      <p>
        {total === 0
          ? "No records"
          : from > total
            ? `Page ${page} is past the end · ${total.toLocaleString()} in all`
            : `Showing ${from.toLocaleString()}–${to.toLocaleString()} of ${total.toLocaleString()}`}
      </p>
      {pages > 1 || page > 1 ? (
        <nav className="flex items-center gap-1" aria-label="Pages">
          <PageLink href={href(page - 1)} disabled={page <= 1} label="Previous page">
            <ChevronLeft className="h-4 w-4" />
          </PageLink>
          {numbers.map((n, i) => (
            <span key={n} className="flex items-center gap-1">
              {i > 0 && n - numbers[i - 1] > 1 ? <span className="px-1 text-ink/40">…</span> : null}
              <Link
                href={href(n)}
                aria-current={n === page ? "page" : undefined}
                className={cn(
                  "min-w-9 rounded-lg px-2.5 py-1.5 text-center font-medium transition",
                  n === page ? "bg-pine-800 text-white" : "hover:bg-sage-100",
                )}
              >
                {n}
              </Link>
            </span>
          ))}
          <PageLink href={href(page + 1)} disabled={page >= pages} label="Next page">
            <ChevronRight className="h-4 w-4" />
          </PageLink>
        </nav>
      ) : null}
    </div>
  );
}

function PageLink({ href, disabled, label, children }: { href: string; disabled: boolean; label: string; children: React.ReactNode }) {
  if (disabled) {
    return (
      <span className="rounded-lg p-1.5 text-ink/30" aria-hidden="true">
        {children}
      </span>
    );
  }
  return (
    <Link href={href} aria-label={label} className="rounded-lg p-1.5 transition hover:bg-sage-100">
      {children}
    </Link>
  );
}
