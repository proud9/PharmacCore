import { format } from "date-fns";
import { redirect } from "next/navigation";
import { canSell, requireUser } from "@/lib/auth";
import { homePath } from "@/lib/paths";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/PageHeader";
import { PatientForm } from "@/components/forms/PatientForm";
import { ListSearch } from "@/components/search/ListSearch";
import { Pagination } from "@/components/Pagination";
import { paging, searchText, type ListParams } from "@/lib/paging";
import type { Prisma } from "@prisma/client";

export default async function PatientsPage({ searchParams }: { searchParams: Promise<ListParams> }) {
  const user = await requireUser();
  if (!user || !canSell(user.role)) redirect(homePath(user?.role ?? ""));
  const params = await searchParams;
  const { page, take, skip, pageSize } = paging(params);
  const q = searchText(params);
  const where: Prisma.PatientWhereInput = q
    ? {
        OR: [
          { firstName: { contains: q } },
          { lastName: { contains: q } },
          { phone: { contains: q } },
          { insurance: { contains: q } },
          { allergies: { contains: q } },
        ],
      }
    : {};
  const [patients, total] = await Promise.all([
    db.patient.findMany({
      where,
      include: { _count: { select: { prescriptions: true, sales: true } } },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      take,
      skip,
    }),
    db.patient.count({ where }),
  ]);

  return (
    <div>
      <PageHeader title="Patients" description="Names, contacts, allergies, and linked prescriptions." />
      <div className="grid gap-6 xl:grid-cols-[1.4fr_0.8fr]">
        <section className="overflow-hidden rounded-2xl border border-pine-900/10 bg-white p-4 shadow-panel">
          <div className="mb-3 max-w-md">
            <ListSearch placeholder="Search by name, phone, or insurance" />
          </div>
          <table className="table-grid">
            <thead>
              <tr>
                <th>Name</th>
                <th>Contact</th>
                <th>Allergies</th>
                <th>Rx / sales</th>
              </tr>
            </thead>
            <tbody>
              {patients.map((patient) => (
                <tr key={patient.id}>
                  <td>
                    <p>
                      {patient.lastName}, {patient.firstName}
                    </p>
                    <p className="text-xs text-ink/60">
                      {patient.dateOfBirth ? format(patient.dateOfBirth, "dd MMM yyyy") : "DOB unknown"}
                    </p>
                  </td>
                  <td className="text-sm">
                    {patient.phone}
                    <p className="text-xs text-ink/60">{patient.insurance ?? "Self-pay"}</p>
                  </td>
                  <td>{patient.allergies ?? "—"}</td>
                  <td>
                    {patient._count.prescriptions} / {patient._count.sales}
                  </td>
                </tr>
              ))}
              {patients.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-ink/60">
                    {q ? "No patients match your search." : "No patients yet. Add one with the form."}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
          <Pagination page={page} pageSize={pageSize} total={total} basePath="/patients" params={params} />
        </section>
        <PatientForm />
      </div>
    </div>
  );
}
