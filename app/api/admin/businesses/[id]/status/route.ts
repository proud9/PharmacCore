import { NextResponse } from "next/server";
import { z } from "zod";
import { adminDb } from "@/lib/db";
import { apiAdmin } from "@/lib/admin";
import { platformAudit } from "@/lib/audit";

/** Suspend, reactivate or delete a business. Suspending or deleting ends its sessions at once. */
const schema = z.object({ status: z.enum(["ACTIVE", "SUSPENDED", "DELETED"]) });

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await apiAdmin();
  if (!auth.ok) return auth.response;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Choose a status." }, { status: 400 });
  const { id } = await params;
  const admin = adminDb();
  const org = await admin.organization.findUnique({ where: { id }, select: { name: true, status: true } });
  if (!org) return NextResponse.json({ error: "Business not found." }, { status: 404 });
  if (org.name.startsWith("[erased]")) return NextResponse.json({ error: "This business has been erased." }, { status: 400 });
  const { status } = parsed.data;
  await admin.$transaction([
    admin.organization.update({
      where: { id },
      data: { status, deletedAt: status === "DELETED" ? new Date() : null, ...(status === "DELETED" ? { listed: false } : {}) },
    }),
    admin.user.updateMany({ where: { orgId: id }, data: { sessionVersion: { increment: 1 } } }),
  ]);
  await platformAudit({
    userId: auth.user.id,
    action: status === "ACTIVE" ? "BUSINESS_REACTIVATED" : status === "SUSPENDED" ? "BUSINESS_SUSPENDED" : "BUSINESS_DELETED",
    orgId: id,
    details: org.name,
  });
  return NextResponse.json({ ok: true });
}
