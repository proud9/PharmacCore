import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { homePath } from "@/lib/paths";
import { BANK_DETAILS_NOTE, isSetUp } from "@/lib/setup";
import { SetupWizard } from "@/components/setup/SetupWizard";

export const metadata = { title: "Set up your wholesale | Parallax" };

/** Wholesale set-up. Open only until the installation has an administrator. */
export default async function SetupPage() {
  if (await isSetUp()) {
    const session = await requireUser();
    redirect(session ? homePath(session.role) : "/login");
  }

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-rule">
        <div className="mx-auto flex h-[72px] max-w-[1160px] items-center justify-between px-5 sm:px-7">
          <Link href="/" className="flex items-center gap-2.5 font-display text-xl font-bold text-pine-800" aria-label="Parallax home">
            <img src="/brand/parallax-logo-96.png" alt="" width={34} height={34} className="h-[34px] w-[34px]" />
            Parallax
          </Link>
          <Link href="/login" className="text-base font-semibold text-pine-800 hover:underline hover:underline-offset-4">
            Sign in
          </Link>
        </div>
      </header>
      <main className="flex justify-center bg-shelf px-5 py-12 sm:py-16">
        <div className="w-full max-w-2xl">
          <h1 className="mb-2 font-display text-4xl font-bold tracking-tight text-pine-800 sm:text-5xl">Set up your wholesale</h1>
          <p className="mb-10 max-w-xl text-lg text-ink/70">
            Four short steps. Your company details go straight onto your documents, so you can start quoting and
            invoicing as soon as you&apos;re done.
          </p>
          <SetupWizard bankNote={BANK_DETAILS_NOTE} />
        </div>
      </main>
    </div>
  );
}
