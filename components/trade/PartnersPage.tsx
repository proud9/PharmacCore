import Link from "next/link";
import { format } from "date-fns";
import type { Tenant } from "@/lib/tenant";
import { db as platform } from "@/lib/db";
import { ROLE_LABEL, customerKinds, supplierKinds } from "@/lib/capabilities";
import { LINK_STATUS_LABEL, termsText } from "@/lib/trade";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/Badge";
import { LinkActions, LinkTerms } from "@/components/trade/ConnectionActions";
import { ContactForm, ContactRow } from "@/components/trade/ContactForm";

/**
 * Customers (side "seller") or suppliers (side "buyer"): connections on Parallax and this
 * business's private contacts. Shared by /customers and /suppliers.
 */
export async function PartnersPage({ t, side }: { t: Tenant; side: "seller" | "buyer" }) {
  const { org } = t;
  const selling = side === "seller";
  const [links, contacts] = await Promise.all([
    t.db.tradeLink.findMany({
      where: selling ? { sellerOrgId: org.id, status: { in: ["ACTIVE", "PENDING"] } } : { buyerOrgId: org.id, status: { in: ["ACTIVE", "PENDING"] } },
      orderBy: { createdAt: "desc" },
    }),
    t.db.contact.findMany({ where: { role: selling ? "CUSTOMER" : "SUPPLIER" }, orderBy: { name: "asc" } }),
  ]);
  const others = await platform.organization.findMany({
    where: { id: { in: links.map((link) => (selling ? link.buyerOrgId : link.sellerOrgId)) } },
    select: { id: true, name: true, kind: true, town: true, status: true },
  });
  const otherById = new Map(others.map((other) => [other.id, other]));
  const incoming = links.filter((link) => link.status === "PENDING" && link.requestedByOrgId !== org.id);
  const outgoing = links.filter((link) => link.status === "PENDING" && link.requestedByOrgId === org.id);
  const active = links.filter((link) => link.status === "ACTIVE");
  const kinds = selling ? customerKinds(org.kind) : supplierKinds(org.kind);

  return (
    <div>
      <PageHeader
        title={selling ? "Customers" : "Suppliers"}
        description={
          selling
            ? "Businesses connected to buy from you, and your private list of customers for documents."
            : "Businesses you buy from on Parallax, and your private list of suppliers for documents."
        }
        action={
          <Link href="/directory" className="btn btn-primary">
            Find businesses
          </Link>
        }
      />

      {incoming.length ? (
        <section className="mb-6 rounded-2xl border border-brass/40 bg-white p-5 shadow-panel">
          <h2 className="font-display text-xl text-pine-900">Asking to connect</h2>
          <ul className="mt-2 divide-y divide-pine-900/10">
            {incoming.map((link) => {
              const other = otherById.get(selling ? link.buyerOrgId : link.sellerOrgId);
              return (
                <li key={link.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div>
                    <p className="font-semibold">{other?.name}</p>
                    <p className="text-sm text-ink/60">
                      {ROLE_LABEL[other?.kind ?? ""]} · {other?.town ?? "—"} · asked {format(link.createdAt, "dd MMM yyyy")}
                    </p>
                  </div>
                  {t.readOnly ? null : <LinkActions linkId={link.id} incoming active={false} />}
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      <section className="rounded-2xl border border-pine-900/10 bg-white p-5 shadow-panel">
        <h2 className="font-display text-xl text-pine-900">On Parallax</h2>
        {active.length === 0 && outgoing.length === 0 ? (
          <p className="mt-2 text-sm text-ink/60">
            No connections yet. Use Find businesses to ask {kinds.map((k) => `${ROLE_LABEL[k].toLowerCase()}s`).join(" or ")} to connect.
          </p>
        ) : null}
        <ul className="mt-2 divide-y divide-pine-900/10">
          {active.map((link) => {
            const otherId = selling ? link.buyerOrgId : link.sellerOrgId;
            const other = otherById.get(otherId);
            return (
              <li key={link.id} className="grid gap-3 py-3 md:grid-cols-[1fr_auto] md:items-center">
                <div>
                  {selling ? (
                    <p className="font-semibold">{other?.name}</p>
                  ) : (
                    <Link href={`/suppliers/${otherId}`} className="font-semibold text-pine-800 hover:underline">
                      {other?.name}
                    </Link>
                  )}
                  <p className="text-sm text-ink/60">
                    {ROLE_LABEL[other?.kind ?? ""]} · {other?.town ?? "—"} ·{" "}
                    {termsText(link.paymentTerms ?? (selling ? org.defaultPaymentTerms : "ON_DELIVERY"), link.creditDays ?? org.creditDays)}
                    {link.paymentTerms ? "" : selling ? " (your default)" : ""}
                  </p>
                  {selling && !t.readOnly ? <div className="mt-2"><LinkTerms linkId={link.id} terms={link.paymentTerms} creditDays={link.creditDays} /></div> : null}
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  {!selling && !t.readOnly ? (
                    <Link href={`/suppliers/${otherId}`} className="btn btn-primary">
                      Send an inquiry
                    </Link>
                  ) : null}
                  {t.readOnly ? null : <LinkActions linkId={link.id} incoming={false} active />}
                </div>
              </li>
            );
          })}
          {outgoing.map((link) => {
            const other = otherById.get(selling ? link.buyerOrgId : link.sellerOrgId);
            return (
              <li key={link.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div>
                  <p className="font-semibold">{other?.name}</p>
                  <p className="text-sm text-ink/60">{ROLE_LABEL[other?.kind ?? ""]} · {other?.town ?? "—"}</p>
                </div>
                <Badge>{LINK_STATUS_LABEL.PENDING}</Badge>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="mt-6 rounded-2xl border border-pine-900/10 bg-white p-5 shadow-panel">
        <h2 className="font-display text-xl text-pine-900">{selling ? "Private customer list" : "Private supplier list"}</h2>
        <p className="mt-1 text-sm text-ink/60">
          Only you see this list. Use it for {selling ? "customers" : "suppliers"} who aren&apos;t on Parallax: you can still make
          {selling ? " quotations, invoices and delivery notes" : " inquiries and purchase orders"} for them and download or print them.
        </p>
        <ul className="mt-3 divide-y divide-pine-900/10">
          {contacts.map((contact) => (
            <ContactRow
              key={contact.id}
              readOnly={t.readOnly}
              contact={{
                id: contact.id,
                role: contact.role,
                kind: contact.kind,
                name: contact.name,
                town: contact.town ?? "",
                address: contact.address ?? "",
                phone: contact.phone ?? "",
                email: contact.email ?? "",
                tpin: contact.tpin ?? "",
                notes: contact.notes ?? "",
              }}
              kinds={kinds}
              newOrderHref={selling ? `/orders/new?contact=${contact.id}` : `/purchases/new?contact=${contact.id}`}
            />
          ))}
        </ul>
        {t.readOnly ? null : <ContactForm role={selling ? "CUSTOMER" : "SUPPLIER"} kinds={kinds} />}
      </section>
    </div>
  );
}
