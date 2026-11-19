import Link from "next/link";
import { CONTACT } from "@/lib/contact";

/** Shared frame for the public Terms and Privacy pages. */
export function LegalPage({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-shelf">
      <header className="border-b border-rule bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-4">
          <Link href="/" className="inline-flex items-center gap-2.5 rounded-lg hover:opacity-85" aria-label="Parallax home">
            <img src="/brand/parallax-logo-96.png" alt="" width={32} height={32} className="h-8 w-8" />
            <span className="font-display text-xl font-semibold text-pine-800">Parallax</span>
          </Link>
          <nav className="flex gap-5 text-sm text-foil" aria-label="Legal">
            <Link href="/terms" className="hover:text-pine-800">Terms</Link>
            <Link href="/privacy" className="hover:text-pine-800">Privacy</Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-5 py-12">
        <h1 className="font-display text-4xl font-semibold text-ink">{title}</h1>
        <p className="mt-2 text-sm text-foil">Last updated {updated}</p>
        <div className="legal-copy mt-8 space-y-6 rounded-2xl border border-rule bg-white p-6 text-[15px] leading-relaxed text-ink/85 sm:p-8 [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-ink [&_li]:ml-5 [&_li]:list-disc [&_ul]:space-y-1.5">
          {children}
        </div>
        <p className="mt-6 text-sm text-foil">
          Questions? Write to{" "}
          <a className="text-dispensary underline-offset-2 hover:underline" href={`mailto:${CONTACT.email}`}>
            {CONTACT.email}
          </a>
          .
        </p>
      </main>
    </div>
  );
}
