import type { Tenant, Tx } from "./tenant";

/**
 * Leaves a notification for a business (often the other side of an order or connection).
 * Row-level security lets any business add one for another, but only read its own; so this
 * inserts without reading the row back (createMany has no RETURNING, which RLS would refuse).
 */
export async function notify(
  t: Pick<Tenant, "db">,
  orgId: string | null | undefined,
  input: { type: string; title: string; body?: string; link?: string },
  tx?: Tx,
) {
  if (!orgId) return;
  await (tx ?? t.db).notification.createMany({ data: [{ orgId, ...input }] });
}
