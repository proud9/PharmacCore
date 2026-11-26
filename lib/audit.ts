import { adminDb } from "./db";
import type { Tenant, Tx } from "./tenant";

/** Writes to the business's own activity log. Pass `tx` to write inside a transaction. */
export async function audit(
  t: Pick<Tenant, "org" | "user" | "db">,
  input: { action: string; entity: string; entityId?: string; details?: string },
  tx?: Tx,
) {
  await (tx ?? t.db).auditLog.create({
    data: {
      orgId: t.org.id,
      userId: t.user.id,
      userName: t.user.name,
      action: input.action,
      entity: input.entity,
      entityId: input.entityId,
      details: input.details,
    },
  });
}

/** Records an action by the Parallax team (separate from every business's own log). */
export async function platformAudit(input: { userId?: string | null; action: string; orgId?: string | null; details?: string }) {
  await adminDb().platformAudit.create({
    data: { userId: input.userId ?? null, action: input.action, orgId: input.orgId ?? null, details: input.details },
  });
}
