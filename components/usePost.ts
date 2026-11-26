"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/** POST JSON to an API route, show its plain-English error, and refresh the page on success. */
export function usePost() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function post(url: string, body: unknown): Promise<Record<string, unknown> | null> {
    setSaving(true);
    setError("");
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await response.json().catch(() => ({}));
    setSaving(false);
    if (!response.ok) {
      setError(data.error ?? "Could not save. Try again.");
      return null;
    }
    router.refresh();
    return data;
  }

  return { post, error, saving };
}
