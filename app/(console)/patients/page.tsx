import { format } from "date-fns";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/PageHeader";
import { PatientForm } from "@/components/forms/PatientForm";

export default async function PatientsPage() {
  const patients = await db.patient.findMany({
    include: { _count: { select: { prescriptions: true, sales: true } } },
    orderBy: { lastName: "asc" },
  });

  return (
    <div>
      <PageHeader
        eyebrow="Clinical records"
        title="Patients"
        description="Digital patient cards with allergies, insurance, and linked prescriptions."
      />
      <div className="grid gap-6 xl:grid-cols-[1.4fr_0.8fr]">
        <section className="overflow-hidden rounded-2xl border border-pine-900/10 bg-white shadow-panel">
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
        </section>
        <PatientForm />
      </div>
    </div>
  );
}
