import { format } from "date-fns";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/PageHeader";
import { PatientForm } from "@/components/forms/PatientForm";
import { SearchScope } from "@/components/search/SearchScope";

export default async function PatientsPage() {
  const patients = await db.patient.findMany({
    include: { _count: { select: { prescriptions: true, sales: true } } },
    orderBy: { lastName: "asc" },
  });

  return (
    <div>
      <PageHeader title="Patients" description="Names, contacts, allergies, and linked prescriptions." />
      <div className="grid gap-6 xl:grid-cols-[1.4fr_0.8fr]">
        <section className="overflow-hidden rounded-2xl border border-pine-900/10 bg-white p-4 shadow-panel">
          <SearchScope placeholder="Search by name, phone, or insurance">
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
                <tr
                  key={patient.id}
                  data-search={`${patient.firstName} ${patient.lastName} ${patient.phone ?? ""} ${patient.insurance ?? ""} ${patient.allergies ?? ""}`.toLowerCase()}
                >
                  <td>
                    <p className="font-medium">
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
            </tbody>
          </table>
          </SearchScope>
        </section>
        <PatientForm />
      </div>
    </div>
  );
}
