import { db } from "@/lib/db";
import { PageHeader } from "@/components/PageHeader";

export default async function SettingsPage() {
  const pharmacy = await db.pharmacy.findUnique({ where: { id: "main" } });

  return (
    <div>
      <PageHeader
        eyebrow="Establishment"
        title="Pharmacy profile"
        description="Identity shown on the console. Production deployments should move this store to PostgreSQL and set AUTH_SECRET."
      />
      <section className="max-w-xl rounded-2xl border border-pine-900/10 bg-white p-6 shadow-panel">
        <dl className="space-y-4 text-sm">
          <div>
            <dt className="text-[11px] uppercase tracking-[0.14em] text-pine-700/70">Trading name</dt>
            <dd className="font-display text-2xl">{pharmacy?.name}</dd>
          </div>
          <div>
            <dt className="text-[11px] uppercase tracking-[0.14em] text-pine-700/70">License</dt>
            <dd>{pharmacy?.license}</dd>
          </div>
          <div>
            <dt className="text-[11px] uppercase tracking-[0.14em] text-pine-700/70">Contact</dt>
            <dd>
              {pharmacy?.phone}
              <br />
              {pharmacy?.email}
            </dd>
          </div>
          <div>
            <dt className="text-[11px] uppercase tracking-[0.14em] text-pine-700/70">Address</dt>
            <dd>{pharmacy?.address}</dd>
          </div>
          <div>
            <dt className="text-[11px] uppercase tracking-[0.14em] text-pine-700/70">Currency</dt>
            <dd>{pharmacy?.currency}</dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
