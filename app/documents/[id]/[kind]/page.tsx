import { notFound } from "next/navigation";
import { DocumentFrame } from "@/components/documents/DocumentFrame";
import { TradeDocument } from "@/components/documents/TradeDocument";
import { isStaff, isBuyer, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getPharmacy } from "@/lib/pharmacy";
import { DELIVERY_STATUSES, QUOTE_STATUSES } from "@/lib/documents";

const KINDS = ["quotation", "invoice", "delivery"] as const;
type Kind = (typeof KINDS)[number];

export default async function DocumentPage({ params }: { params: Promise<{ id: string; kind: string }> }) {
  const user = await requireUser();
  if (!user) notFound();
  const { id, kind } = await params;
  if (!KINDS.includes(kind as Kind)) notFound();
  const documentKind = kind as Kind;

  const order = await db.consignment.findUnique({
    where: { id },
    include: {
      institution: true,
      requestedBy: true,
      quotedBy: true,
      items: { include: { product: true } },
    },
  });
  if (!order) notFound();
  if (isBuyer(user.role) && order.institutionId !== user.institutionId) notFound();
  if (!isBuyer(user.role) && !isStaff(user.role)) notFound();

  if (documentKind === "quotation" && !QUOTE_STATUSES.includes(order.status)) notFound();
  if (documentKind === "invoice" && !order.invoiceNo) notFound();
  if (documentKind === "delivery" && (!order.deliveryNoteNo || !DELIVERY_STATUSES.includes(order.status))) notFound();

  const pharmacy = await getPharmacy();
  if (!pharmacy) notFound();

  const back = isBuyer(user.role) ? `/portal/orders/${order.id}` : `/wholesale/${order.id}`;

  return (
    <DocumentFrame back={back}>
      <TradeDocument kind={documentKind} pharmacy={pharmacy} order={order} />
    </DocumentFrame>
  );
}
