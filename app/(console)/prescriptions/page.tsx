import { format } from "date-fns";
import { redirect } from "next/navigation";
import { homePath } from "@/lib/paths";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/Badge";
import { PrescriptionForm } from "@/components/forms/PrescriptionForm";
import { DispenseButton } from "@/components/forms/DispenseButton";
import { canDispense, requireUser } from "@/lib/auth";
import { ListFilter, ListSearch } from "@/components/search/ListSearch";
import { Pagination } from "@/components/Pagination";
import { paging, searchText, type ListParams } from "@/lib/paging";
import type { Prisma } from "@prisma/client";

const PAGE = 20;

export default async function PrescriptionsPage({ searchParams }: { searchParams: Promise<ListParams> }) {
  const user = await requireUser();
  // Prescriptions hold patients' health details, so only roles that dispense see them (as with Patients).
  if (!user || !canDispense(user.role)) redirect(homePath(user?.role ?? ""));
  const params = await searchParams;
  const { page, take, skip, pageSize } = paging(params, PAGE);
  const q = searchText(params);
  const status = params.status === "PENDING" || params.status === "DISPENSED" ? params.status : undefined;
  const where: Prisma.PrescriptionWhereInput = {
    ...(status ? { status } : {}),
    ...(q
      ? {
          OR: [
            { rxNumber: { contains: q } },
            { prescriber: { contains: q } },
            { patient: { firstName: { contains: q } } },
            { patient: { lastName: { contains: q } } },
          ],
        }
      : {}),
  };
  const [prescriptions, total] = await Promise.all([
    db.prescription.findMany({
      where,
      include: { patient: true, items: { include: { product: { select: { name: true } } } } },
      orderBy: { createdAt: "desc" },
      take,
      skip,
    }),
    db.prescription.count({ where }),
  ]);
  const allow = Boolean(user && canDispense(user.role));

  return (
    <div>
      <PageHeader title="Prescriptions" description="Record a prescription and dispense it when the medicines are ready." />
      <div className="grid gap-6 xl:grid-cols-[1.3fr_0.9fr]">
        <div>
        <div className="mb-4 grid gap-3 sm:grid-cols-[1fr_200px]">
          <ListSearch placeholder="Search patient, doctor, or prescription number" />
          <ListFilter
            param="status"
            label="Status"
            options={[
              { value: "", label: "All" },
              { value: "PENDING", label: "Waiting" },
              { value: "DISPENSED", label: "Dispensed" },
            ]}
          />
        </div>
        <div className="space-y-4">
          {prescriptions.map((rx) => (
            <article
              key={rx.id}
              className="rounded-2xl border border-pine-900/10 bg-white p-5 shadow-panel"
            >
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
                <Badge tone={rx.status === "DISPENSED" ? "good" : "warn"}>{rx.status === "DISPENSED" ? "Dispensed" : "Waiting"}</Badge>
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
          {prescriptions.length === 0 ? (
            <p className="rounded-2xl border border-pine-900/10 bg-white p-6 text-center text-sm text-ink/60 shadow-panel">
              {q || status ? "No prescriptions match." : "No prescriptions yet."}
            </p>
          ) : null}
        </div>
        <Pagination page={page} pageSize={pageSize} total={total} basePath="/prescriptions" params={params} />
        </div>
        {allow ? (
          <PrescriptionForm />
        ) : (
          <p className="text-sm text-ink/60">A pharmacist or administrator must sign in to add prescriptions.</p>
        )}
      </div>
    </div>
  );
}
