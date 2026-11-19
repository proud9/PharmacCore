import { canSell, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/Badge";
import { SearchScope } from "@/components/search/SearchScope";
import { ManufacturerForm, ManufacturerLoginForm } from "@/components/purchasing/ManufacturerForm";

export default async function ManufacturersPage() {
  const user = await requireUser();
  const allow = Boolean(user && canSell(user.role));
  // A short list (one row per manufacturer), so it is filtered on the page.
  const suppliers = await db.supplier.findMany({
    include: {
      users: { select: { id: true, email: true, name: true, active: true } },
      _count: { select: { purchaseOrders: true } },
    },
    orderBy: { name: "asc" },
  });

  return (
    <div>
      <PageHeader
        eyebrow="Purchases"
        title="Manufacturers"
        description="Companies you buy from. With a login, a manufacturer sees your orders and sends prices, invoices and dispatch notes in Parallax."
      />
      <div className="grid gap-6 xl:grid-cols-[1.3fr_0.9fr]">
        <section className="overflow-hidden rounded-2xl border border-pine-900/10 bg-white p-4 shadow-panel">
          <SearchScope placeholder="Search manufacturer, contact or email">
            <ul className="divide-y divide-pine-900/10">
              {suppliers.map((supplier) => {
                const login = supplier.users[0];
                return (
                  <li
                    key={supplier.id}
                    className="py-4"
                    data-search={`${supplier.name} ${supplier.contact ?? ""} ${supplier.email ?? ""} ${login?.email ?? ""}`.toLowerCase()}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-medium">{supplier.name}</p>
                        <p className="text-sm text-ink/60">
                          {[supplier.contact, supplier.phone, supplier.email].filter(Boolean).join(" · ") || "No contact details"}
                        </p>
                        <p className="text-xs text-ink/50">{supplier._count.purchaseOrders} purchase order(s)</p>
                      </div>
                      {login ? (
                        <Badge tone={login.active ? "good" : "bad"}>
                          {login.active ? `Login: ${login.email}` : "Login switched off"}
                        </Badge>
                      ) : (
                        <Badge>No login</Badge>
                      )}
                    </div>
                    {allow && !login ? <ManufacturerLoginForm supplierId={supplier.id} /> : null}
                  </li>
                );
              })}
              {suppliers.length === 0 ? <li className="py-8 text-center text-ink/60">No manufacturers yet.</li> : null}
            </ul>
          </SearchScope>
        </section>
        {allow ? <ManufacturerForm /> : null}
      </div>
    </div>
  );
}
