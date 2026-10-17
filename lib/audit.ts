import { db } from "./db";

export async function audit(input: {
  userId?: string | null;
  action: string;
  entity: string;
  entityId?: string;
  details?: string;
}) {
  await db.auditLog.create({
    data: {
      userId: input.userId ?? null,
      action: input.action,
      entity: input.entity,
      entityId: input.entityId,
      details: input.details,
    },
  });
}
