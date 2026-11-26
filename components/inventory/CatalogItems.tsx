"use client";

import { useState, type FormEvent } from "react";
import { usePost } from "@/components/usePost";
import { money } from "@/lib/utils";

export type CatalogRow = {
  id: string;
  sku: string;
  name: string;
  genericName: string;
  form: string;
  strength: string;
  unit: string;
  sellingPrice: number;
  offered: boolean;
};

function ItemFields({ item }: { item?: CatalogRow }) {
  return (
    <>
      <div>
        <label>Stock code</label>
        <input name="sku" required defaultValue={item?.sku} />
      </div>
      <div className="sm:col-span-2">
        <label>Item name</label>
        <input name="name" required defaultValue={item?.name} />
      </div>
      <div>
        <label>Generic name</label>
        <input name="genericName" defaultValue={item?.genericName} />
      </div>
      <div>
        <label>Form</label>
        <input name="form" placeholder="tablet, syrup…" defaultValue={item?.form} />
      </div>
      <div>
        <label>Strength</label>
        <input name="strength" defaultValue={item?.strength} />
      </div>
      <div>
        <label>Pack</label>
        <input name="unit" required placeholder="box of 100" defaultValue={item?.unit ?? "pack"} />
      </div>
      <div>
        <label>Your list price (ZMW, private)</label>
        <input name="sellingPrice" type="number" min={0} step="0.01" required defaultValue={item?.sellingPrice ?? 0} />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="offered" defaultChecked={item?.offered ?? true} className="w-auto" />
        Show to connected buyers
      </label>
    </>
  );
}

function bodyOf(form: FormData) {
  return {
    sku: form.get("sku"),
    name: form.get("name"),
    genericName: form.get("genericName"),
    form: form.get("form"),
    strength: form.get("strength"),
    unit: form.get("unit"),
    sellingPrice: Number(form.get("sellingPrice")) || 0,
    offered: form.get("offered") === "on",
  };
}

export function AddCatalogItem() {
  const { post, error, saving } = usePost();
  const [open, setOpen] = useState(false);
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (await post("/api/items", bodyOf(new FormData(event.currentTarget)))) setOpen(false);
  }
  if (!open) {
    return (
      <button type="button" className="btn btn-primary" onClick={() => setOpen(true)}>
        Add item
      </button>
    );
  }
  return (
    <form onSubmit={onSubmit} className="mb-6 grid gap-3 rounded-2xl border border-pine-900/10 bg-white p-5 shadow-panel sm:grid-cols-3">
      <ItemFields />
      {error ? <p className="text-sm text-rust sm:col-span-3">{error}</p> : null}
      <div className="flex gap-2 sm:col-span-3">
        <button className="btn btn-primary" disabled={saving}>
          {saving ? "Saving…" : "Add item"}
        </button>
        <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
    </form>
  );
}

export function CatalogItemRow({ item, readOnly }: { item: CatalogRow; readOnly: boolean }) {
  const { post, error, saving } = usePost();
  const [editing, setEditing] = useState(false);
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (await post(`/api/items/${item.id}`, bodyOf(new FormData(event.currentTarget)))) setEditing(false);
  }
  if (editing) {
    return (
      <tr>
        <td colSpan={6}>
          <form onSubmit={onSubmit} className="grid gap-3 py-2 sm:grid-cols-3">
            <ItemFields item={item} />
            {error ? <p className="text-sm text-rust sm:col-span-3">{error}</p> : null}
            <div className="flex gap-2 sm:col-span-3">
              <button className="btn btn-primary" disabled={saving}>
                Save
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => setEditing(false)}>
                Cancel
              </button>
            </div>
          </form>
        </td>
      </tr>
    );
  }
  return (
    <tr>
      <td className="font-mono text-xs">{item.sku}</td>
      <td>
        {[item.name, item.strength].filter(Boolean).join(" ")}
        <span className="block text-xs text-ink/60">{[item.genericName, item.form].filter(Boolean).join(" · ")}</span>
      </td>
      <td>{item.unit}</td>
      <td>{money(item.sellingPrice)}</td>
      <td>
        {readOnly ? (
          item.offered ? "Shown" : "Hidden"
        ) : (
          <OfferedToggle id={item.id} offered={item.offered} />
        )}
      </td>
      <td>
        {readOnly ? null : (
          <button type="button" className="btn btn-ghost" onClick={() => setEditing(true)}>
            Edit
          </button>
        )}
      </td>
    </tr>
  );
}

/** Show or hide an item from connected buyers' view of your list. */
export function OfferedToggle({ id, offered }: { id: string; offered: boolean }) {
  const { post, saving, error } = usePost();
  return (
    <label className="inline-flex items-center gap-2 text-sm" title={error || undefined}>
      <input
        type="checkbox"
        className="w-auto"
        checked={offered}
        disabled={saving}
        onChange={(event) => post(`/api/items/${id}`, { offered: event.target.checked })}
      />
      {offered ? "Shown to buyers" : "Hidden"}
    </label>
  );
}
