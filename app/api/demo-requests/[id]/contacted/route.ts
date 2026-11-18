import { NextResponse } from "next/server";
import { canManageStaff, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";

/** Marks a demo request as contacted (or back to new). Administrators only. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageStaff(user.role)) return NextResponse.json({ error: "Not allowed" }, { status: 403 });

  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as { contacted?: boolean };
  const contacted = body.contacted !== false;
  const existing = await db.demoRequest.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Request not found." }, { status: 404 });

  await db.demoRequest.update({
    where: { id },
    data: contacted ? { contactedAt: new Date(), contactedById: user.id } : { contactedAt: null, contactedById: null },
  });
  await audit({
    userId: user.id,
    action: contacted ? "DEMO_CONTACTED" : "DEMO_REOPENED",
    entity: "DemoRequest",
    entityId: id,
    details: existing.company,
  });
  return NextResponse.json({ ok: true });
}
