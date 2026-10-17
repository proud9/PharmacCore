import { NextResponse } from "next/server";
import { clearSessionCookie, readSession } from "@/lib/auth";
import { audit } from "@/lib/audit";

export async function POST() {
  const session = await readSession();
  await clearSessionCookie();
  if (session) {
    await audit({ userId: session.id, action: "LOGOUT", entity: "User", entityId: session.id });
  }
  return NextResponse.json({ ok: true });
}
