"use client";

import { usePost } from "@/components/usePost";

export function MarkAllRead() {
  const { post, saving } = usePost();
  return (
    <button type="button" className="btn btn-ghost" disabled={saving} onClick={() => post("/api/notifications/read", {})}>
      Mark all as read
    </button>
  );
}
