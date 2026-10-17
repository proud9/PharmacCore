import { format } from "date-fns";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/Badge";
import { PrescriptionForm } from "@/components/forms/PrescriptionForm";
import { DispenseButton } from "@/components/forms/DispenseButton";
import { canDispense, requireUser } from "@/lib/auth";

export default async function PrescriptionsPage() {
  const user = await requireUser();
  const [prescriptions, patients, products] = await Promise.all([
    db.prescription.findMany({
      include: { patient: true, items: { include: { product: true } } },
      orderBy: { createdAt: "desc" },
    }),
    db.patient.findMany({ orderBy: { lastName: "asc" } }),
    db.product.findMany({ where: { requiresRx: true }, orderBy: { name: "asc" } }),
  ]);
  const allow = Boolean(user && canDispense(user.role));

  return (
    <div>
      <PageHeader
        eyebrow="Clinical workflow"
        title="Prescriptions"
        description="File, hold, and dispense. Dispensing deducts stock from the earliest-expiring lots."
      />
      <div className="grid gap-6 xl:grid-cols-[1.3fr_0.9fr]">
        <div className="space-y-4">
          {prescriptions.map((rx) => (
            <article key={rx.id} className="rounded-2xl border border-pine-900/10 bg-white p-5 shadow-panel">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-mono text-xs text-ink/50">{rx.rxNumber}</p>
                  <h2 className="font-display text-xl">
                    {rx.patient.lastName}, {rx.patient.firstName}
                  </h2>
                  <p className="text-sm text-ink/60">
                    {rx.prescriber} · {rx.clinic ?? "clinic not stated"} · {format(rx.createdAt, "dd MMM yyyy")}
                  </p>
                </div>
                <Badge tone={rx.status === "DISPENSED" ? "good" : "warn"}>{rx.status}</Badge>
              </div>
              <ul className="mt-3 space-y-1 text-sm">
                {rx.items.map((item) => (
                  <li key={item.id}>
                    {item.product.name} × {item.quantity}
                    {item.instructions ? ` — ${item.instructions}` : ""}
                  </li>
                ))}
              </ul>
              {rx.patient.allergies ? (
                <p className="mt-2 text-xs text-rust">Allergy alert: {rx.patient.allergies}</p>
              ) : null}
              {allow && rx.status !== "DISPENSED" ? <DispenseButton id={rx.id} /> : null}
            </article>
          ))}
        </div>
        {allow ? (
          <PrescriptionForm
            patients={patients.map((p) => ({
              id: p.id,
              name: `${p.lastName}, ${p.firstName}`,
            }))}
            products={products.map((p) => ({ id: p.id, name: p.name }))}
          />
        ) : (
          <p className="text-sm text-ink/60">Pharmacist or administrator credentials are required to file prescriptions.</p>
        )}
      </div>
    </div>
  );
}
