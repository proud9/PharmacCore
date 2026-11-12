import { db } from "@/lib/db";
import { PageHeader } from "@/components/PageHeader";
import { SettingsForm } from "@/components/forms/SettingsForm";
import { canEditSettings, requireUser } from "@/lib/auth";

export default async function SettingsPage() {
  const [user, pharmacy] = await Promise.all([
    requireUser(),
    db.pharmacy.findUnique({ where: { id: "main" } }),
  ]);
  const allow = Boolean(user && canEditSettings(user.role));

  return (
    <div>
      <PageHeader title="Pharmacy details" description="Name, licence, and contact information for this branch." />
      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.9fr]">
        <section className="rounded-2xl border border-pine-900/10 bg-white p-6 shadow-panel">
          <dl className="space-y-4 text-sm">
            <div>
              <dt className="text-[11px] uppercase tracking-[0.14em] text-pine-700/70">Trading name</dt>
              <dd className="font-display text-2xl">{pharmacy?.name}</dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-[0.14em] text-pine-700/70">Licence</dt>
              <dd>{pharmacy?.license || "—"}</dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-[0.14em] text-pine-700/70">Contact</dt>
              <dd>
                {pharmacy?.phone || "—"}
                <br />
                {pharmacy?.email}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-[0.14em] text-pine-700/70">Address</dt>
              <dd>{pharmacy?.address || "—"}</dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-[0.14em] text-pine-700/70">Currency</dt>
              <dd>{pharmacy?.currency}</dd>
            </div>
          </dl>
        </section>
        {allow ? (
          <SettingsForm
            pharmacy={{
              name: pharmacy?.name ?? "Pharmacy",
              license: pharmacy?.license ?? null,
              phone: pharmacy?.phone ?? null,
              email: pharmacy?.email ?? null,
              address: pharmacy?.address ?? null,
            }}
          />
        ) : (
          <section className="rounded-2xl border border-pine-900/10 bg-white p-5 text-sm text-ink/70 shadow-panel">
            Only an administrator can change these details.
          </section>
        )}
      </div>
    </div>
  );
}
