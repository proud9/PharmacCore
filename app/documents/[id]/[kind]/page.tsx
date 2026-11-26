import { notFound } from "next/navigation";
import { getTenant } from "@/lib/tenant";
import { db as platform } from "@/lib/db";
import { loadOrder } from "@/lib/trade-server";
import { DocumentFrame } from "@/components/documents/DocumentFrame";
import { TradeDocument, type DocKind, type Party } from "@/components/documents/TradeDocument";

const KINDS: DocKind[] = ["inquiry", "quotation", "purchase-order", "invoice", "delivery-note"];

const PARTY_SELECT = {
  id: true,
  name: true,
  phone: true,
  email: true,
  address: true,
  website: true,
  tpin: true,
  licenceNo: true,
  logoPath: true,
  bankName: true,
  accountName: true,
  accountNumber: true,
  bankBranch: true,
  swiftCode: true,
} as const;

/** Printable order documents. Only the two businesses on the order can open them. */
export default async function TradeDocumentPage({ params }: { params: Promise<{ id: string; kind: string }> }) {
  const t = await getTenant();
  if (!t) notFound();
  const { id, kind } = await params;
  if (!KINDS.includes(kind as DocKind)) notFound();
  const loaded = await loadOrder(t, id);
  if (!loaded) notFound();
  const { order, side } = loaded;

  const docKind = kind as DocKind;
  const available =
    docKind === "inquiry" ||
    (docKind === "quotation" && !!order.quoteNo) ||
    (docKind === "purchase-order" && !!order.poNumber) ||
    (docKind === "invoice" && !!order.invoicedAt) ||
    (docKind === "delivery-note" && !!order.dispatchedAt);
  if (!available) notFound();

  async function party(orgId: string | null, contactId: string | null, name: string): Promise<Party> {
    if (orgId) {
      const org = await platform.organization.findUnique({ where: { id: orgId }, select: PARTY_SELECT });
      if (org) return org;
    }
    // A private contact belongs to the business that created the order (which is reading it).
    const contact = contactId ? await t!.db.contact.findFirst({ where: { id: contactId } }) : null;
    return {
      name: contact?.name ?? name,
      phone: contact?.phone ?? null,
      email: contact?.email ?? null,
      address: contact?.address ?? null,
      website: null,
      tpin: contact?.tpin ?? null,
      licenceNo: null,
      logoPath: null,
      bankName: null,
      accountName: null,
      accountNumber: null,
      bankBranch: null,
      swiftCode: null,
    };
  }
  const [seller, buyer] = await Promise.all([
    party(order.sellerOrgId, order.sellerContactId, order.sellerName),
    party(order.buyerOrgId, order.buyerContactId, order.buyerName),
  ]);

  return (
    <DocumentFrame back={side === "seller" ? `/orders/${order.id}` : `/purchases/${order.id}`}>
      <TradeDocument kind={docKind} seller={seller} buyer={buyer} order={order} />
    </DocumentFrame>
  );
}
