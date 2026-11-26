import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import type { Tenant } from "@/lib/tenant";
import { db as platform } from "@/lib/db";
import { can, ROLE_LABEL } from "@/lib/capabilities";
import { PageHeader } from "@/components/PageHeader";
import { OrderBuilder } from "@/components/trade/OrderBuilder";

/**
 * Starting an order. Without a counterpart chosen it lists who you can order with (connected
 * businesses and private contacts); with one it shows the order builder.
 */
export async function NewOrderPage({ t, side, params }: { t: Tenant; side: "seller" | "buyer"; params: { org?: string; contact?: string } }) {
  const selling = side === "seller";
  const back = selling ? "/orders" : "/purchases";
  if (t.readOnly) {
    return <p className="text-sm text-ink/60">Your account is read-only, so you can't start orders.</p>;
  }

  if (params.contact) {
    const contact = await t.db.contact.findFirst({ where: { id: params.contact, role: selling ? "CUSTOMER" : "SUPPLIER" } });
    if (!contact) notFound();
    return (
      <div>
        <BackLink href={back} label={selling ? "Orders" : "Purchases"} />
        <PageHeader eyebrow="Not on Parallax" title={selling ? `Quotation for ${contact.name}` : `Inquiry to ${contact.name}`} />
        <OrderBuilder
          side={selling ? "seller" : "buyer"}
          contactId={contact.id}
          counterpart={contact.name}
          source={can(t.org.kind, "catalog") ? "own" : "none"}
          offline
        />
      </div>
    );
  }
  if (params.org && selling) {
    const link = await t.db.tradeLink.findFirst({ where: { sellerOrgId: t.org.id, buyerOrgId: params.org, status: "ACTIVE" } });
    const buyer = link ? await platform.organization.findUnique({ where: { id: params.org }, select: { name: true } }) : null;
    if (!buyer) notFound();
    return (
      <div>
        <BackLink href={back} label="Orders" />
        <PageHeader title={`Quotation for ${buyer.name}`} />
        <OrderBuilder side="seller" orgId={params.org} counterpart={buyer.name} source="own" offline={false} />
      </div>
    );
  }

  const [links, contacts] = await Promise.all([
    t.db.tradeLink.findMany({ where: selling ? { sellerOrgId: t.org.id, status: "ACTIVE" } : { buyerOrgId: t.org.id, status: "ACTIVE" } }),
    t.db.contact.findMany({ where: { role: selling ? "CUSTOMER" : "SUPPLIER" }, orderBy: { name: "asc" } }),
  ]);
  const orgs = await platform.organization.findMany({
    where: { id: { in: links.map((link) => (selling ? link.buyerOrgId : link.sellerOrgId)) }, status: "ACTIVE" },
    select: { id: true, name: true, kind: true, town: true },
    orderBy: { name: "asc" },
  });

  return (
    <div>
      <BackLink href={back} label={selling ? "Orders" : "Purchases"} />
      <PageHeader
        title={selling ? "New quotation" : "New inquiry"}
        description={selling ? "Who is it for?" : "Who do you want prices from?"}
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-pine-900/10 bg-white p-5 shadow-panel">
          <h2 className="font-display text-xl text-pine-900">On Parallax</h2>
          {orgs.length === 0 ? (
            <p className="mt-2 text-sm text-ink/60">
              No connections yet.{" "}
              <Link href="/directory" className="font-semibold text-pine-800 hover:underline">
                Find businesses
              </Link>
            </p>
          ) : null}
          <ul className="mt-2 divide-y divide-pine-900/10">
            {orgs.map((org) => (
              <li key={org.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                <span>
                  <span className="font-semibold">{org.name}</span>
                  <span className="text-ink/60"> · {ROLE_LABEL[org.kind]} · {org.town ?? "—"}</span>
                </span>
                <Link href={selling ? `/orders/new?org=${org.id}` : `/suppliers/${org.id}`} className="btn btn-ghost">
                  Choose
                </Link>
              </li>
            ))}
          </ul>
        </section>
        <section className="rounded-2xl border border-pine-900/10 bg-white p-5 shadow-panel">
          <h2 className="font-display text-xl text-pine-900">Your private list</h2>
          {contacts.length === 0 ? (
            <p className="mt-2 text-sm text-ink/60">
              Add {selling ? "customers" : "suppliers"} who aren&apos;t on Parallax on the{" "}
              <Link href={selling ? "/customers" : "/suppliers"} className="font-semibold text-pine-800 hover:underline">
                {selling ? "Customers" : "Suppliers"}
              </Link>{" "}
              page.
            </p>
          ) : null}
          <ul className="mt-2 divide-y divide-pine-900/10">
            {contacts.map((contact) => (
              <li key={contact.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                <span>
                  <span className="font-semibold">{contact.name}</span>
                  <span className="text-ink/60"> · {contact.town ?? "—"}</span>
                </span>
                <Link href={`${back}/new?contact=${contact.id}`} className="btn btn-ghost">
                  Choose
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="mb-3 inline-flex items-center gap-1.5 text-sm text-pine-700 hover:text-pine-900">
      <ArrowLeft className="h-4 w-4" />
      {label}
    </Link>
  );
}
