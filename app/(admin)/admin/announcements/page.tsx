import { format } from "date-fns";
import { adminDb } from "@/lib/db";
import { ROLE_LABEL } from "@/lib/capabilities";
import { PageHeader } from "@/components/PageHeader";
import { AnnouncementForm } from "@/components/admin/AnnouncementForm";

/** Messages from the Parallax team to everyone, one account type, or one business. */
export default async function AnnouncementsPage() {
  const admin = adminDb();
  const announcements = await admin.announcement.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { _count: { select: { reads: true } } },
  });
  const orgIds = [...new Set(announcements.map((row) => row.orgId).filter((id): id is string => Boolean(id)))];
  const orgs = orgIds.length ? await admin.organization.findMany({ where: { id: { in: orgIds } }, select: { id: true, name: true } }) : [];
  const orgName = new Map(orgs.map((org) => [org.id, org.name]));

  return (
    <div>
      <PageHeader title="Announcements" description="Shown in each business's notifications. Email delivery comes later." />
      <AnnouncementForm />
      <section className="mt-6 rounded-2xl border border-pine-900/10 bg-white p-5 shadow-panel">
        <table className="table-grid">
          <thead>
            <tr>
              <th>Sent</th>
              <th>To</th>
              <th>Title</th>
              <th>Read by</th>
            </tr>
          </thead>
          <tbody>
            {announcements.map((row) => (
              <tr key={row.id}>
                <td>{format(row.createdAt, "dd MMM yyyy HH:mm")}</td>
                <td>
                  {row.audience === "ALL"
                    ? "Everyone"
                    : row.audience === "KIND"
                      ? `All ${ROLE_LABEL[row.kind ?? ""]?.toLowerCase()}s`
                      : orgName.get(row.orgId ?? "") ?? "One business"}
                </td>
                <td>
                  <p className="font-semibold">{row.title}</p>
                  <p className="text-xs text-ink/60">{row.body}</p>
                </td>
                <td>{row._count.reads}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
