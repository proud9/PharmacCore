import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { pageTenant } from "@/lib/tenant";
import { db as platform } from "@/lib/db";
import { ROLE_LABEL } from "@/lib/capabilities";
import { termsText } from "@/lib/trade";
import { PageHeader } from "@/components/PageHeader";
import { OrderBuilder } from "@/components/trade/OrderBuilder";

/** A connected supplier's item list (names only): tick items and send an inquiry. */
export default async function SupplierCatalogPage({ params }: { params: Promise<{ orgId: string }> }) {
  const t = await pageTenant("buy");
  const { orgId } = await params;
  const link = await t.db.tradeLink.findFirst({ where: { sellerOrgId: orgId, buyerOrgId: t.org.id, status: "ACTIVE" } });
  if (!link) notFound();
  const seller = await platform.organization.findUnique({
    where: { id: orgId },
    select: { name: true, kind: true, town: true, defaultPaymentTerms: true, creditDays: true },
  });
  if (!seller) notFound();

  return (
    <div>
      <Link href="/suppliers" className="mb-3 inline-flex items-center gap-1.5 text-sm text-pine-700 hover:text-pine-900">
        <ArrowLeft className="h-4 w-4" />
        Suppliers
      </Link>
      <PageHeader
        eyebrow={`${ROLE_LABEL[seller.kind]} · ${seller.town ?? ""}`}
        title={seller.name}
        description={`Choose what you need and send an inquiry. ${termsText(link.paymentTerms ?? seller.defaultPaymentTerms, link.creditDays ?? seller.creditDays)}.`}
      />
      {t.readOnly ? (
        <p className="text-sm text-ink/60">Your account is read-only, so you can't send inquiries.</p>
      ) : (
        <OrderBuilder side="buyer" orgId={orgId} counterpart={seller.name} source="catalog" offline={false} />
      )}
    </div>
  );
}
