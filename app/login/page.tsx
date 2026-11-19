import Link from "next/link";
import AccountForm from "@/components/auth/AccountForm";

/** Logo + name, linking back to the landing page. */
function BrandLink({ className, tone }: { className?: string; tone: "light" | "dark" }) {
  return (
    <Link
      href="/"
      aria-label="Parallax home"
      className={`group inline-flex items-center gap-3 rounded-xl transition-opacity hover:opacity-85 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 ${
        tone === "light" ? "focus-visible:outline-white" : "focus-visible:outline-pine-800"
      } ${className ?? ""}`}
    >
      <span
        className={`flex h-11 w-11 items-center justify-center rounded-xl p-1 ${tone === "light" ? "bg-white" : "bg-white ring-1 ring-rule"}`}
      >
        <img src="/brand/parallax-logo-96.png" alt="" width={36} height={36} className="h-9 w-9" />
      </span>
      <span className={`font-display text-2xl font-semibold ${tone === "light" ? "text-parchment" : "text-pine-800"}`}>
        Parallax
      </span>
    </Link>
  );
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ ended?: string }> }) {
  const { ended } = await searchParams;
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <section className="relative hidden overflow-hidden bg-pine-950 p-12 text-parchment lg:flex lg:flex-col lg:justify-between">
        <BrandLink tone="light" className="self-start" />
        <div>
          <h1 className="mt-4 max-w-md font-display text-3xl leading-tight sm:text-4xl">Medicine supply, kept in order.</h1>
          <p className="mt-4 max-w-md text-sage-300">
            Inventory, ordering and dispatch for medical wholesalers, and online ordering for the pharmacies,
            hospitals and clinics they supply.
          </p>
        </div>
        <p className="text-sm text-sage-300">&nbsp;</p>
      </section>
      <section className="flex flex-col items-center justify-center gap-8 p-5 sm:p-8">
        {/* On smaller screens the side panel is hidden, so show the way home above the form. */}
        <BrandLink tone="dark" className="lg:hidden" />
        {ended ? (
          <p className="w-full max-w-md rounded-xl bg-dispensary-soft px-4 py-3 text-sm text-pine-800" role="status">
            Your session has ended. Please sign in again.
          </p>
        ) : null}
        <AccountForm />
      </section>
    </div>
  );
}
