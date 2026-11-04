import { NextResponse } from "next/server";
import { z } from "zod";
import { canWholesale, isBuyer, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { adminNextStatuses } from "@/lib/wholesale";

const schema = z.object({
  status: z.string(),
  message: z.string().optional(),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Missing status." }, { status: 400 });
  }
  const { id } = await params;
  const order = await db.consignment.findUnique({ where: { id } });
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const next = parsed.data.status;

  if (isBuyer(user.role)) {
    if (order.institutionId !== user.institutionId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const allowed =
      (order.status === "QUOTED" && next === "ACCEPTED") ||
      (["REQUESTED", "QUOTED"].includes(order.status) && next === "CANCELLED");
    if (!allowed) {
      return NextResponse.json({ error: "You cannot move this order to that state." }, { status: 400 });
    }
  } else if (canWholesale(user.role)) {
    if (!adminNextStatuses(order.status).includes(next)) {
      return NextResponse.json({ error: "That status step is not available." }, { status: 400 });
    }
  } else {
    return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  }

  await db.consignment.update({
    where: { id },
    data: {
      status: next,
      events: {
        create: {
          status: next,
          message: parsed.data.message || `Status set to ${next}`,
          actorName: user.name,
        },
      },
    },
  });

  await audit({
    userId: user.id,
    action: "CONSIGNMENT_STATUS",
    entity: "Consignment",
    entityId: id,
    details: `${order.reference} → ${next}`,
  });

  return NextResponse.json({ ok: true });
}
