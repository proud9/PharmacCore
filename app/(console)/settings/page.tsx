import { pageTenant } from "@/lib/tenant";
import { can, ROLE_LABEL } from "@/lib/capabilities";
import { PageHeader } from "@/components/PageHeader";
import { CompanyForm } from "@/components/forms/CompanyForm";

export default async function SettingsPage() {
  const { org } = await pageTenant();

  return (
    <div className="mx-auto w-full max-w-3xl">
      <PageHeader
        eyebrow={ROLE_LABEL[org.kind]}
        title="Business details"
        description="Your name, licence and the bank details printed on your documents."
      />
      <CompanyForm
        orgId={org.id}
        sells={can(org.kind, "sell")}
        hasLogo={Boolean(org.logoPath)}
        details={{
          name: org.name,
          licenceNo: org.licenceNo ?? "",
          town: org.town ?? "",
          listed: org.listed,
          defaultPaymentTerms: org.defaultPaymentTerms,
          creditDays: org.creditDays,
          phone: org.phone ?? "",
          email: org.email ?? "",
          address: org.address ?? "",
          website: org.website ?? "",
          tpin: org.tpin ?? "",
          bankName: org.bankName ?? "",
          accountName: org.accountName ?? "",
          accountNumber: org.accountNumber ?? "",
          bankBranch: org.bankBranch ?? "",
          swiftCode: org.swiftCode ?? "",
        }}
      />
    </div>
  );
}
