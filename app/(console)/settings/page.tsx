import { requireUser, canEditCompany } from "@/lib/auth";
import { getPharmacy } from "@/lib/pharmacy";
import { PageHeader } from "@/components/PageHeader";
import { PharmacyForm } from "@/components/forms/PharmacyForm";

export default async function SettingsPage() {
  const user = await requireUser();
  const pharmacy = await getPharmacy();
  const canEdit = Boolean(user && canEditCompany(user.role));

  return (
    <div>
      <PageHeader
        title="Company details"
        description="Name, licence, and the bank details printed on quotations and invoices."
      />
      {canEdit ? (
        <PharmacyForm
          hasLogo={Boolean(pharmacy?.logoPath)}
          details={{
            name: pharmacy?.name ?? "",
            license: pharmacy?.license ?? "",
            phone: pharmacy?.phone ?? "",
            email: pharmacy?.email ?? "",
            address: pharmacy?.address ?? "",
            website: pharmacy?.website ?? "",
            tpin: pharmacy?.tpin ?? "",
            bankName: pharmacy?.bankName ?? "",
            accountName: pharmacy?.accountName ?? "",
            accountNumber: pharmacy?.accountNumber ?? "",
            bankBranch: pharmacy?.bankBranch ?? "",
            swiftCode: pharmacy?.swiftCode ?? "",
          }}
        />
      ) : (
        <section className="max-w-xl rounded-2xl border border-pine-900/10 bg-white p-6 shadow-panel">
          <dl className="space-y-4 text-sm">
            <div>
              <dt className="text-[11px] uppercase tracking-[0.14em] text-pine-700/70">Trading name</dt>
              <dd className="font-display text-2xl">{pharmacy?.name}</dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-[0.14em] text-pine-700/70">Licence</dt>
              <dd>{pharmacy?.license}</dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-[0.14em] text-pine-700/70">TPIN</dt>
              <dd>{pharmacy?.tpin}</dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-[0.14em] text-pine-700/70">Contact</dt>
              <dd>
                {pharmacy?.phone}
                <br />
                {pharmacy?.email}
              </dd>
            </div>
          </dl>
        </section>
      )}
    </div>
  );
}
