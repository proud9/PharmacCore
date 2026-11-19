"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { LookupPicker, type Picked } from "@/components/search/LookupPicker";

type Product = Picked & { sku?: string; stock?: number };
type Line = { product: Product; quantity: number };

/** Sales: choose a manufacturer and the items to order. The manufacturer replies with a price. */
export function NewPurchaseOrderForm({ suppliers }: { suppliers: { id: string; name: string; hasLogin: boolean }[] }) {
  const router = useRouter();
  const [lines, setLines] = useState<Line[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function add(product: Product | null) {
    if (!product) return;
    setLines((current) => (current.some((line) => line.product.id === product.id) ? current : [...current, { product, quantity: 1 }]));
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!lines.length) {
      setError("Add at least one item.");
      return;
    }
    const form = new FormData(event.currentTarget);
    setSaving(true);
    const response = await fetch("/api/purchases", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        supplierId: form.get("supplierId"),
        notes: String(form.get("notes") ?? "").trim() || undefined,
        lines: lines.map((line) => ({ productId: line.product.id, quantity: line.quantity })),
      }),
    });
    const data = await response.json().catch(() => ({}));
    setSaving(false);
    if (!response.ok) {
      setError(data.error ?? "Could not send the order.");
      return;
    }
    router.refresh();
    router.push(`/purchases/${data.id}`);
  }

  return (
    <form onSubmit={onSubmit} className="rounded-2xl border border-pine-900/10 bg-white p-5 shadow-panel">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="po-supplier">Manufacturer</label>
          <select id="po-supplier" name="supplierId" required defaultValue="">
            <option value="" disabled>
              Choose…
            </option>
            {suppliers.map((supplier) => (
              <option key={supplier.id} value={supplier.id}>
                {supplier.name}
                {supplier.hasLogin ? "" : " (no login)"}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="po-item">Add an item</label>
          <LookupPicker<Product>
            id="po-item"
            kind="products"
            value={null}
            onChange={add}
            placeholder="Type a name, code or barcode…"
            describe={(item) => [item.sku, item.stock != null ? `${item.stock} in stock` : ""].filter(Boolean).join(" · ")}
          />
        </div>
      </div>
      <table className="table-grid mt-4">
        <thead>
          <tr>
            <th>Item</th>
            <th>Quantity</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {lines.map((line) => (
            <tr key={line.product.id}>
              <td>
                {line.product.name}
                {line.product.sku ? <p className="font-mono text-[11px] text-ink/50">{line.product.sku}</p> : null}
              </td>
              <td>
                <input
                  className="w-28"
                  type="number"
                  min={1}
                  required
                  value={line.quantity}
                  onChange={(event) =>
                    setLines((current) =>
                      current.map((row) =>
                        row.product.id === line.product.id ? { ...row, quantity: Math.max(1, Number(event.target.value) || 1) } : row,
                      ),
                    )
                  }
                />
              </td>
              <td>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setLines((current) => current.filter((row) => row.product.id !== line.product.id))}
                >
                  Remove
                </button>
              </td>
            </tr>
          ))}
          {lines.length === 0 ? (
            <tr>
              <td colSpan={3} className="py-6 text-center text-ink/60">
                Search for items above to add them.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
      <div className="mt-4">
        <label htmlFor="po-notes">Notes to the manufacturer</label>
        <textarea id="po-notes" name="notes" rows={2} placeholder="Pack sizes, delivery address, deadline…" />
      </div>
      {error ? <p className="mt-2 text-sm text-rust">{error}</p> : null}
      <button className="btn btn-primary mt-4" disabled={saving}>
        {saving ? "Sending…" : "Send to manufacturer"}
      </button>
    </form>
  );
}
