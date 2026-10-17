"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function ProductForm({
  categories,
  suppliers,
}: {
  categories: { id: string; name: string }[];
  suppliers: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const body = {
      sku: form.get("sku"),
      barcode: form.get("barcode") || undefined,
      name: form.get("name"),
      genericName: form.get("genericName") || undefined,
      form: form.get("form") || undefined,
      strength: form.get("strength") || undefined,
      manufacturer: form.get("manufacturer") || undefined,
      categoryId: form.get("categoryId") || undefined,
      supplierId: form.get("supplierId") || undefined,
      sellingPrice: Number(form.get("sellingPrice")),
      costPrice: Number(form.get("costPrice")),
      reorderLevel: Number(form.get("reorderLevel") || 20),
      requiresRx: form.get("requiresRx") === "on",
    };
    const response = await fetch("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await response.json();
    setLoading(false);
    if (!response.ok) {
      setError(data.error ?? "Could not save product");
      return;
    }
    event.currentTarget.reset();
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="rounded-2xl border border-pine-900/10 bg-white p-5 shadow-panel">
      <h2 className="font-display text-xl text-pine-900">New SKU</h2>
      <div className="mt-4 grid gap-3">
        <div>
          <label>Name</label>
          <input name="name" required placeholder="Atorvastatin 20 mg" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label>SKU</label>
            <input name="sku" required placeholder="ATV-20-28" />
          </div>
          <div>
            <label>Barcode</label>
            <input name="barcode" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label>Generic</label>
            <input name="genericName" />
          </div>
          <div>
            <label>Strength</label>
            <input name="strength" placeholder="20 mg" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label>Form</label>
            <input name="form" placeholder="tablet" />
          </div>
          <div>
            <label>Manufacturer</label>
            <input name="manufacturer" />
          </div>
        </div>
        <div>
          <label>Category</label>
          <select name="categoryId">
            <option value="">Uncategorised</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label>Preferred supplier</label>
          <select name="supplierId">
            <option value="">None</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label>Cost</label>
            <input name="costPrice" type="number" step="0.01" required />
          </div>
          <div>
            <label>Sell</label>
            <input name="sellingPrice" type="number" step="0.01" required />
          </div>
          <div>
            <label>Reorder</label>
            <input name="reorderLevel" type="number" defaultValue={20} />
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm normal-case tracking-normal">
          <input name="requiresRx" type="checkbox" className="w-auto" />
          Prescription only
        </label>
      </div>
      {error ? <p className="mt-2 text-sm text-rust">{error}</p> : null}
      <button className="btn btn-primary mt-4 w-full" disabled={loading}>
        {loading ? "Saving…" : "Add to catalogue"}
      </button>
    </form>
  );
}
