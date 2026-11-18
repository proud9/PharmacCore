"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/Badge";
import { SheetLineFields, readLineFields } from "@/components/inventory/SheetLineFields";
import { money } from "@/lib/utils";

export type IntakeRow = {
  id: string;
  deliveryNoteNo: string;
  supplierName: string | null;
  receivedOn: string;
  quantity: number;
  unitCost: number;
  product: {
    sku: string;
    name: string;
    categoryNo: string | null;
    type: "OTC" | "DDA";
    unit: string;
    price: number;
  };
};

/** Delivered supplier lines waiting for their sheet details before they join stock. */
export function IntakeQueue({ rows, canEdit }: { rows: IntakeRow[]; canEdit: boolean }) {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <section className="mb-6 rounded-2xl border border-pine-900/10 bg-white p-5 shadow-panel">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display text-xl text-pine-900">Waiting from deliveries</h2>
        <Badge tone="warn">{rows.length} to complete</Badge>
      </div>
      <p className="mt-1 text-sm text-ink/70">
        Received on a supplier delivery note. Enter the missing details to add each item to stock.
      </p>
      <div className="mt-3 overflow-x-auto">
        <table className="table-grid">
          <thead>
            <tr>
              <th>Delivery note</th>
              <th>Supplier</th>
              <th>Stock code</th>
              <th>Description</th>
              <th>Qty</th>
              <th>Cost</th>
              <th>Received</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <IntakeLine
                key={row.id}
                row={row}
                open={openId === row.id}
                canEdit={canEdit}
                onToggle={() => setOpenId((current) => (current === row.id ? null : row.id))}
              />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function IntakeLine({
  row,
  open,
  canEdit,
  onToggle,
}: {
  row: IntakeRow;
  open: boolean;
  canEdit: boolean;
  onToggle: () => void;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSaving(true);
    const fields = readLineFields(new FormData(event.currentTarget));
    const response = await fetch(`/api/inventory/intake/${row.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...fields, quantity: fields.quantity }),
    });
    const data = await response.json().catch(() => ({}));
    setSaving(false);
    if (!response.ok) {
      setError(data.error ?? "Could not add this item to stock");
      return;
    }
    onToggle();
    router.refresh();
  }

  return (
    <>
      <tr>
        <td className="whitespace-nowrap font-mono text-xs">{row.deliveryNoteNo}</td>
        <td>{row.supplierName ?? "—"}</td>
        <td className="whitespace-nowrap font-mono text-xs">{row.product.sku}</td>
        <td>{row.product.name}</td>
        <td>{row.quantity}</td>
        <td>{money(row.unitCost)}</td>
        <td>{row.receivedOn}</td>
        <td className="text-right">
          {canEdit ? (
            <button className="btn btn-ghost" onClick={onToggle}>
              {open ? "Close" : "Enter details"}
            </button>
          ) : null}
        </td>
      </tr>
      {open ? (
        <tr>
          <td colSpan={8} className="bg-sage-100/40">
            <form onSubmit={onSubmit} className="py-2">
              <SheetLineFields
                mode="intake"
                defaults={{
                  stockCode: row.product.sku,
                  categoryNo: row.product.categoryNo,
                  description: row.product.name,
                  type: row.product.type,
                  unit: row.product.unit,
                  price: row.product.price,
                  quantity: row.quantity,
                }}
              />
              {error ? <p className="mt-2 text-sm text-rust">{error}</p> : null}
              <button className="btn btn-primary mt-3" disabled={saving}>
                {saving ? "Adding…" : "Add to stock"}
              </button>
            </form>
          </td>
        </tr>
      ) : null}
    </>
  );
}
