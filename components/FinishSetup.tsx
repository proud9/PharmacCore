import Link from "next/link";
import { ImagePlus, Landmark } from "lucide-react";
import { canEditCompany, requireUser } from "@/lib/auth";
import { setupGaps } from "@/lib/setup";

/**
 * Reminder for wholesale administrators whose set-up skipped the logo or bank details.
 * Disappears once both are saved on Company details.
 */
export async function FinishSetup() {
  const user = await requireUser();
  if (!user || !canEditCompany(user.role)) return null;
  const gaps = await setupGaps();
  if (!gaps.logo && !gaps.bank) return null;

  return (
    <section className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-dispensary/25 bg-dispensary-soft px-5 py-4">
      <div>
        <h2 className="font-display text-lg font-semibold text-pine-800">Finish setting up your documents</h2>
        <p className="mt-0.5 text-sm text-pine-800/80">
          {gaps.logo && gaps.bank
            ? "Add your logo and bank details so they print on quotations and invoices."
            : gaps.logo
              ? "Add your logo so it prints on quotations, invoices and delivery notes."
              : "Add your bank details so customers know where to pay your invoices."}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {gaps.logo ? (
          <Link href="/settings#logo" className="btn btn-ghost">
            <ImagePlus className="h-4 w-4" aria-hidden="true" />
            Add logo
          </Link>
        ) : null}
        {gaps.bank ? (
          <Link href="/settings#bank" className="btn btn-primary">
            <Landmark className="h-4 w-4" aria-hidden="true" />
            Add bank details
          </Link>
        ) : null}
      </div>
    </section>
  );
}
