import { format } from "date-fns";
import { adminDb } from "@/lib/db";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/Badge";
import { DemoContactedButton } from "@/components/forms/DemoContactedButton";

/** "Request a demo" submissions from the landing page. The admin layout limits this to the Parallax team. */
export default async function DemoRequestsPage() {
  const requests = await adminDb().demoRequest.findMany({ orderBy: { createdAt: "desc" } });
  const open = requests.filter((r) => !r.contactedAt).length;

  return (
    <div>
      <PageHeader
        title="Demo requests"
        description={`Businesses that asked for a demo on the website. ${open} still to contact.`}
      />
      <section className="rounded-2xl border border-pine-900/10 bg-white p-5 shadow-panel">
        <div className="overflow-x-auto">
          <table className="table-grid min-w-[900px]">
            <thead>
              <tr>
                <th>Received</th>
                <th>Business</th>
                <th>Name</th>
                <th>Phone</th>
                <th>Email</th>
                <th>Notes</th>
                <th>Status</th>
                <th className="sr-only">Action</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <tr key={r.id}>
                  <td className="whitespace-nowrap">{format(r.createdAt, "dd MMM yyyy HH:mm")}</td>
                  <td className="font-medium">{r.company}</td>
                  <td>{r.name}</td>
                  <td className="whitespace-nowrap">
                    <a href={`tel:${r.phone}`} className="hover:underline">
                      {r.phone}
                    </a>
                  </td>
                  <td>
                    <a href={`mailto:${r.email}`} className="hover:underline">
                      {r.email}
                    </a>
                  </td>
                  <td className="max-w-xs text-ink/70">{r.notes ?? "—"}</td>
                  <td>
                    {r.contactedAt ? (
                      <Badge tone="good">Contacted</Badge>
                    ) : (
                      <Badge tone="warn">New</Badge>
                    )}
                  </td>
                  <td className="text-right">
                    <DemoContactedButton id={r.id} contacted={Boolean(r.contactedAt)} />
                  </td>
                </tr>
              ))}
              {requests.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-ink/60">
                    No demo requests yet. They appear here when someone uses “Request a demo” on the website.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
