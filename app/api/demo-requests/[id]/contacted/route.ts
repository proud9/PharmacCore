import { NextResponse } from "next/server";
import { isPlatformAdmin, requireUser } from "@/lib/auth";
import { adminDb } from "@/lib/db";
import { platformAudit } from "@/lib/audit";

/** Marks a demo request as contacted (or back to new). Parallax team only. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  if (!isPlatformAdmin(user.role)) return NextResponse.json({ error: "Your account can't do that." }, { status: 403 });

  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as { contacted?: boolean };
  const contacted = body.contacted !== false;
  const admin = adminDb();
  const existing = await admin.demoRequest.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Request not found." }, { status: 404 });

  await admin.demoRequest.update({
    where: { id },
    data: contacted ? { contactedAt: new Date(), contactedById: user.id } : { contactedAt: null, contactedById: null },
  });
  await platformAudit({ userId: user.id, action: contacted ? "DEMO_CONTACTED" : "DEMO_REOPENED", details: existing.company });
  return NextResponse.json({ ok: true });
}
