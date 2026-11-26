import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { requireUser, isPlatformAdmin } from "@/lib/auth";
import { adminDb } from "@/lib/db";
import { forOrg } from "@/lib/tenant";
import { DocumentFrame } from "@/components/documents/DocumentFrame";
import { SubscriptionReceipt } from "@/components/billing/SubscriptionReceipt";

export const metadata: Metadata = { title: "Receipt · Parallax" };

/**
 * A subscription receipt. A business opens only its own (row-level security on
 * SubscriptionPayment); the Parallax team can open any. Anything else answers 404.
 */
export default async function SubscriptionReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  if (!user) redirect("/login");

  if (isPlatformAdmin(user.role)) {
    const admin = adminDb();
    const payment = await admin.subscriptionPayment.findUnique({ where: { id } });
    if (!payment || payment.status !== "PAID") notFound();
    const org = await admin.organization.findUnique({ where: { id: payment.orgId }, select: { town: true } });
    return (
      <DocumentFrame back={`/admin/billing/${payment.orgId}`}>
        <SubscriptionReceipt payment={payment} town={org?.town} />
      </DocumentFrame>
    );
  }

  if (!user.org) notFound();
  const payment = await forOrg(user.org.id).db.subscriptionPayment.findFirst({ where: { id, status: "PAID" } });
  if (!payment) notFound();
  return (
    <DocumentFrame back="/billing">
      <SubscriptionReceipt payment={payment} town={user.org.town} />
    </DocumentFrame>
  );
}
