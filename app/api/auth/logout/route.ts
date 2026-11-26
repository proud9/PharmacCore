import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/auth";
import { getTenant } from "@/lib/tenant";
import { audit } from "@/lib/audit";

export async function POST() {
  const t = await getTenant();
  if (t) await audit(t, { action: "LOGOUT", entity: "User", entityId: t.user.id });
  await clearSessionCookie();
  return NextResponse.json({ ok: true });
}
