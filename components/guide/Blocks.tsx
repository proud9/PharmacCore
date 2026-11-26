import type { ReactNode } from "react";
import { AlertTriangle, ChevronDown, Lightbulb } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { cn } from "@/lib/utils";
import { GuideToc } from "./GuideToc";

export type GuideSection = { id: string; title: string; lead?: string; body: ReactNode };

/**
 * A guide page: header, a few quick facts, then numbered sections with a contents list that
 * follows the reader on wide screens (a collapsible list above the sections otherwise).
 */
export function GuideFrame({
  eyebrow,
  title,
  intro,
  facts,
  sections,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  facts: { label: string; value: string }[];
  sections: GuideSection[];
}) {
  const toc = sections.map(({ id, title: t }) => ({ id, title: t }));
  return (
    <div>
      <PageHeader eyebrow={eyebrow} title={title} description={intro} />
      <dl className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {facts.map((fact) => (
          <div key={fact.label} className="rounded-2xl border border-pine-900/10 bg-white px-4 py-3 shadow-panel">
            <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-pine-700/70">{fact.label}</dt>
            <dd className="mt-1 text-sm font-semibold text-pine-900">{fact.value}</dd>
          </div>
        ))}
      </dl>

      <div className="grid gap-8 xl:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="hidden xl:block">
          <GuideToc items={toc} />
        </aside>
        <div className="min-w-0 space-y-6">
          <details className="group rounded-2xl border border-pine-900/10 bg-white px-5 py-3 shadow-panel xl:hidden">
            <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-semibold text-pine-900">
              In this guide
              <ChevronDown className="h-4 w-4 transition group-open:rotate-180" aria-hidden="true" />
            </summary>
            <ol className="mt-2 grid gap-1 pb-1 text-sm sm:grid-cols-2">
              {toc.map((item, i) => (
                <li key={item.id}>
                  <a href={`#${item.id}`} className="text-pine-700 hover:text-pine-900 hover:underline">
                    {i + 1}. {item.title}
                  </a>
                </li>
              ))}
            </ol>
          </details>
          {sections.map((section, i) => (
            <section
              key={section.id}
              id={section.id}
              className="scroll-mt-6 rounded-2xl border border-pine-900/10 bg-white p-5 shadow-panel sm:p-7"
            >
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-dispensary-soft font-display text-sm font-semibold text-dispensary">
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <h2 className="font-display text-2xl text-pine-900">{section.title}</h2>
                  {section.lead ? <p className="mt-1 text-[15px] text-ink/70">{section.lead}</p> : null}
                </div>
              </div>
              <Prose className="mt-4">{section.body}</Prose>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Readable body text for guide sections. */
export function Prose({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "max-w-none text-[15px] leading-relaxed text-ink",
        "[&>p]:mt-3 [&>p]:max-w-[72ch] [&>p:first-child]:mt-0",
        "[&>h3]:mt-6 [&>h3]:font-display [&>h3]:text-lg [&>h3]:text-pine-900",
        "[&>ul]:mt-3 [&>ul]:max-w-[72ch] [&>ul]:list-disc [&>ul]:space-y-1.5 [&>ul]:pl-5 [&_li::marker]:text-sage-500",
        "[&_strong]:font-semibold [&_strong]:text-pine-900",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** A screenshot in a light browser frame. Opens full size in a new tab. */
export function Shot({ src, path, caption }: { src: string; path: string; caption: string }) {
  return (
    <figure className="my-5">
      <a
        href={`/guide/${src}.jpg`}
        target="_blank"
        rel="noreferrer"
        className="group block overflow-hidden rounded-xl border border-rule bg-white shadow-panel"
        title="Open the full-size picture"
      >
        <div className="flex items-center gap-2 border-b border-rule bg-shelf px-3 py-2">
          <span className="flex gap-1" aria-hidden="true">
            <span className="h-2 w-2 rounded-full bg-rule" />
            <span className="h-2 w-2 rounded-full bg-rule" />
            <span className="h-2 w-2 rounded-full bg-rule" />
          </span>
          <span className="truncate rounded-md bg-white px-2 py-0.5 font-mono text-[11px] text-foil">parallax{path}</span>
        </div>
        <img
          src={`/guide/${src}.jpg`}
          alt={caption}
          width={1280}
          height={800}
          loading="lazy"
          className="h-auto w-full transition duration-300 group-hover:scale-[1.01]"
        />
      </a>
      <figcaption className="mt-2 text-xs text-ink/60">{caption}</figcaption>
    </figure>
  );
}

/** Numbered steps. */
export function Steps({ items }: { items: { title: string; text: ReactNode }[] }) {
  return (
    <ol className="mt-4 space-y-3">
      {items.map((item, i) => (
        <li key={item.title} className="flex gap-3">
          <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-pine-800 text-xs font-semibold text-pine-800">
            {i + 1}
          </span>
          <div className="min-w-0">
            <p className="font-semibold text-pine-900">{item.title}</p>
            <div className="mt-0.5 text-ink/85">{item.text}</div>
          </div>
        </li>
      ))}
    </ol>
  );
}

/** A tip (green) or something to watch out for (brass). */
export function Note({ tone = "tip", title, children }: { tone?: "tip" | "watch"; title: string; children: ReactNode }) {
  const Icon = tone === "tip" ? Lightbulb : AlertTriangle;
  return (
    <aside
      className={cn(
        "my-5 flex gap-3 rounded-xl p-4 text-sm",
        tone === "tip" ? "bg-dispensary-soft text-pine-900" : "border border-brass/40 bg-brass/10 text-pine-900",
      )}
    >
      <Icon className={cn("mt-0.5 h-5 w-5 shrink-0", tone === "tip" ? "text-dispensary" : "text-expiry")} aria-hidden="true" />
      <div>
        <p className="font-semibold">{title}</p>
        <div className="mt-1 text-ink/85">{children}</div>
      </div>
    </aside>
  );
}

/** "Menu item → what it is for" as a two-column list. */
export function MenuList({ items }: { items: { name: string; text: string }[] }) {
  return (
    <dl className="mt-4 divide-y divide-rule overflow-hidden rounded-xl border border-rule">
      {items.map((item) => (
        <div key={item.name} className="grid gap-1 px-4 py-2.5 sm:grid-cols-[170px_1fr] sm:gap-4">
          <dt className="font-semibold text-pine-900">{item.name}</dt>
          <dd className="text-ink/80">{item.text}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Two lists side by side, e.g. what others can and can't see. */
export function Compare({ left, right }: { left: { title: string; items: string[] }; right: { title: string; items: string[] } }) {
  return (
    <div className="mt-4 grid gap-3 md:grid-cols-2">
      {[left, right].map((col, i) => (
        <div key={col.title} className={cn("rounded-xl p-4", i === 0 ? "bg-dispensary-soft" : "bg-shelf")}>
          <p className="font-semibold text-pine-900">{col.title}</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-ink/85">
            {col.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

/** Short questions and answers that open on click. */
export function Faq({ items }: { items: { q: string; a: ReactNode }[] }) {
  return (
    <div className="mt-4 divide-y divide-rule overflow-hidden rounded-xl border border-rule">
      {items.map((item) => (
        <details key={item.q} className="group px-4 py-3">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-semibold text-pine-900">
            {item.q}
            <ChevronDown className="h-4 w-4 shrink-0 text-pine-700 transition group-open:rotate-180" aria-hidden="true" />
          </summary>
          <div className="mt-2 text-sm text-ink/85">{item.a}</div>
        </details>
      ))}
    </div>
  );
}
