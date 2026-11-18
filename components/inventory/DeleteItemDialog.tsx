"use client";

import { FormEvent, useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { format, addDays } from "date-fns";
import { AlertTriangle } from "lucide-react";

const RETENTION_DAYS = 30;

/**
 * Confirmation modal for deleting an inventory item. The user gives a reason and ticks a
 * box; the item then moves to the delete queue for 30 days before permanent deletion.
 */
export function DeleteItemDialog({
  item,
  onClose,
}: {
  item: { id: string; sku: string; name: string; onHand: number } | null;
  onClose: (deleted: boolean) => void;
}) {
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const uid = useId();
  const [reason, setReason] = useState("");
  const [sure, setSure] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const el = dialog.current;
    if (!el) return;
    if (item) {
      setReason("");
      setSure(false);
      setError("");
      if (!el.open) el.showModal();
    } else if (el.open) {
      el.close();
    }
  }, [item]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!item) return;
    setError("");
    setSaving(true);
    const response = await fetch(`/api/inventory/items/${item.id}/delete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason, confirm: sure }),
    });
    const data = await response.json().catch(() => ({}));
    setSaving(false);
    if (!response.ok) {
      setError(data.error ?? "Could not delete this item");
      return;
    }
    onClose(true);
    router.refresh();
  }

  const purgeOn = format(addDays(new Date(), RETENTION_DAYS), "dd MMM yyyy");

  return (
    <dialog
      ref={dialog}
      className="modal"
      aria-labelledby={`${uid}-title`}
      onCancel={(e) => {
        e.preventDefault();
        if (!saving) onClose(false);
      }}
      onClick={(e) => {
        // Click on the backdrop closes the dialog.
        if (e.target === dialog.current && !saving) onClose(false);
      }}
    >
      {item ? (
        <form onSubmit={onSubmit} className="p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rust/10 text-rust">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h2 id={`${uid}-title`} className="font-display text-xl text-pine-900">
                Delete {item.name}?
              </h2>
              <p className="mt-1 font-mono text-xs text-ink/60">{item.sku}</p>
            </div>
          </div>

          <div className="mt-4 space-y-2 text-sm text-ink/80">
            <p>
              The item moves to the <span className="font-medium">delete queue</span> and disappears from Inventory,
              the sales counter and stock take. You can restore it until <span className="font-medium">{purgeOn}</span>;
              after that it is permanently deleted.
            </p>
            {item.onHand > 0 ? (
              <p className="rounded-lg bg-amber-50 px-3 py-2 text-amber-900">
                {item.onHand} still in stock. It can&apos;t be sold while the item is deleted.
              </p>
            ) : null}
          </div>

          <div className="mt-4">
            <label htmlFor={`${uid}-reason`}>Reason</label>
            <textarea
              id={`${uid}-reason`}
              rows={3}
              required
              minLength={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Discontinued by supplier, entered twice"
            />
          </div>

          <div className="mt-3 flex items-start gap-2">
            <input
              id={`${uid}-sure`}
              type="checkbox"
              checked={sure}
              onChange={(e) => setSure(e.target.checked)}
              className="mt-0.5"
            />
            <label htmlFor={`${uid}-sure`} className="mb-0 cursor-pointer text-sm font-normal normal-case tracking-normal text-ink">
              I&apos;m sure I want to delete this item.
            </label>
          </div>

          {error ? <p className="mt-3 text-sm text-rust">{error}</p> : null}

          <div className="mt-6 flex flex-wrap justify-end gap-2">
            <button type="button" className="btn btn-ghost" onClick={() => onClose(false)} disabled={saving}>
              Cancel
            </button>
            <button className="btn btn-danger" disabled={!sure || reason.trim().length < 3 || saving}>
              {saving ? "Deleting…" : "Delete item"}
            </button>
          </div>
        </form>
      ) : null}
    </dialog>
  );
}
