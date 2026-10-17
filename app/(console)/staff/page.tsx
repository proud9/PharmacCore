import { format } from "date-fns";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/Badge";
import { StaffForm } from "@/components/forms/StaffForm";
import { canManageStaff, requireUser } from "@/lib/auth";
import { ROLE_LABEL } from "@/lib/utils";

export default async function StaffPage() {
  const user = await requireUser();
  const staff = await db.user.findMany({ orderBy: { name: "asc" } });
  const allow = Boolean(user && canManageStaff(user.role));

  return (
    <div>
      <PageHeader
        eyebrow="Access control"
        title="Staff & remote login"
        description="Role-based accounts for administrators, pharmacists, technicians, cashiers, and inventory officers."
      />
      <div className="grid gap-6 xl:grid-cols-[1.4fr_0.8fr]">
        <section className="overflow-hidden rounded-2xl border border-pine-900/10 bg-white shadow-panel">
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
                <tr key={member.id}>
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
        </section>
        {allow ? <StaffForm /> : <p className="text-sm text-ink/60">Only administrators can issue new logins.</p>}
      </div>
    </div>
  );
}
