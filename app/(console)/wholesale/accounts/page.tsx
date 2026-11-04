import { redirect } from "next/navigation";
import { canWholesale, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/Badge";
import { AccountForm } from "@/components/wholesale/AccountForm";
import { KIND_LABEL } from "@/lib/wholesale";
import { SearchScope } from "@/components/search/SearchScope";

export default async function BuyerAccountsPage() {
  const user = await requireUser();
  if (!user || !canWholesale(user.role)) redirect("/dashboard");
  const institutions = await db.institution.findMany({
    include: { users: true, _count: { select: { orders: true } } },
    orderBy: { name: "asc" },
  });

  return (
    <div>
      <PageHeader
        title="Buyers"
        description="Hospitals, clinics, and pharmacies that can place wholesale orders."
      />
      <div className="grid gap-6 xl:grid-cols-[1.3fr_0.9fr]">
        <section className="overflow-hidden rounded-2xl border border-pine-900/10 bg-white p-4 shadow-panel">
          <SearchScope placeholder="Search organisation, type, or email">
          <table className="table-grid">
            <thead>
              <tr>
                <th>Organisation</th>
                <th>Type</th>
                <th>Buyers</th>
                <th>Orders</th>
              </tr>
            </thead>
            <tbody>
              {institutions.map((row) => (
                <tr
                  key={row.id}
                  data-search={`${row.name} ${row.kind} ${row.contact ?? ""} ${row.users.map((u) => u.email).join(" ")}`.toLowerCase()}
                >
                  <td>
                    <p className="font-medium">{row.name}</p>
                    <p className="text-xs text-ink/60">{row.contact}</p>
                  </td>
                  <td>
                    <Badge>{KIND_LABEL[row.kind] ?? row.kind}</Badge>
                  </td>
                  <td className="text-sm">
                    {row.users.map((member) => (
                      <div key={member.id}>{member.email}</div>
                    ))}
                  </td>
                  <td>{row._count.orders}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </SearchScope>
        </section>
        <AccountForm />
      </div>
    </div>
  );
}
