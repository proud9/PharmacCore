import { format } from "date-fns";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/Badge";
import { StaffForm } from "@/components/forms/StaffForm";
import { canManageStaff, requireUser } from "@/lib/auth";
import { ROLE_LABEL } from "@/lib/utils";
import { SearchScope } from "@/components/search/SearchScope";

export default async function StaffPage() {
  const user = await requireUser();
  const staff = await db.user.findMany({ orderBy: { name: "asc" } });
  const allow = Boolean(user && canManageStaff(user.role));

  return (
    <div>
      <PageHeader title="Staff" description="People who can sign in, and their job roles." />
      <div className="grid gap-6 xl:grid-cols-[1.4fr_0.8fr]">
        <section className="overflow-hidden rounded-2xl border border-pine-900/10 bg-white p-4 shadow-panel">
          <SearchScope placeholder="Search name, email, or role">
          <table className="table-grid">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Last login</th>
              </tr>
            </thead>
            <tbody>
              {staff.map((member) => (
                <tr
                  key={member.id}
                  data-search={`${member.name} ${member.email} ${member.role} ${ROLE_LABEL[member.role] ?? ""}`.toLowerCase()}
                >
                  <td className="font-medium">{member.name}</td>
                  <td>{member.email}</td>
                  <td>
                    <Badge>{ROLE_LABEL[member.role] ?? member.role}</Badge>
                  </td>
                  <td>{member.lastLoginAt ? format(member.lastLoginAt, "dd MMM HH:mm") : "Never"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </SearchScope>
        </section>
        {allow ? <StaffForm /> : <p className="text-sm text-ink/60">Only an administrator can add staff.</p>}
      </div>
    </div>
  );
}
