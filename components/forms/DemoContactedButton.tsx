"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function DemoContactedButton({ id, contacted }: { id: string; contacted: boolean }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  async function toggle() {
    setSaving(true);
    await fetch(`/api/demo-requests/${id}/contacted`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contacted: !contacted }),
    });
    setSaving(false);
    router.refresh();
  }

  return (
    <button type="button" className="btn btn-ghost whitespace-nowrap" onClick={toggle} disabled={saving}>
      {saving ? "Saving…" : contacted ? "Mark as new" : "Mark as contacted"}
    </button>
  );
}
