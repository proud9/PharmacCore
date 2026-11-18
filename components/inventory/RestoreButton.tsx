"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw } from "lucide-react";

export function RestoreButton({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function restore() {
    setError("");
    setSaving(true);
    const response = await fetch(`/api/inventory/items/${id}/restore`, { method: "POST" });
    const data = await response.json().catch(() => ({}));
    setSaving(false);
    if (!response.ok) {
      setError(data.error ?? "Could not restore");
      return;
    }
    router.refresh();
  }

  return (
    <div className="text-right">
      <button className="btn btn-ghost whitespace-nowrap" onClick={restore} disabled={saving} aria-label={`Restore ${name}`}>
        <RotateCcw className="h-4 w-4" />
        {saving ? "Restoring…" : "Restore"}
      </button>
      {error ? <p className="mt-1 text-xs text-rust">{error}</p> : null}
    </div>
  );
}
