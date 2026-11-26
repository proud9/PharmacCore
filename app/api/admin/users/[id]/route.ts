import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { adminDb } from "@/lib/db";
import { apiAdmin, temporaryPassword } from "@/lib/admin";
import { platformAudit } from "@/lib/audit";

/**
 * Login actions for the Parallax team: reset the password (temporary one, shown once, must be
 * changed at sign-in), sign out everywhere, or switch the login off/on. Every action ends the
 * login's current sessions.
 */
const schema = z.object({ action: z.enum(["RESET_PASSWORD", "SIGN_OUT", "DEACTIVATE", "ACTIVATE"]) });

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await apiAdmin();
  if (!auth.ok) return auth.response;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Choose an action." }, { status: 400 });
  const { id } = await params;
  const admin = adminDb();
  const user = await admin.user.findUnique({ where: { id }, select: { email: true, orgId: true, role: true } });
  if (!user || user.role === "ADMIN") return NextResponse.json({ error: "Login not found." }, { status: 404 });

  const { action } = parsed.data;
  let temporary: string | null = null;
  if (action === "RESET_PASSWORD") {
    temporary = temporaryPassword();
    await admin.user.update({
      where: { id },
      data: { passwordHash: await bcrypt.hash(temporary, 10), mustChangePassword: true, sessionVersion: { increment: 1 } },
    });
  } else {
    await admin.user.update({
      where: { id },
      data: {
        sessionVersion: { increment: 1 },
        ...(action === "DEACTIVATE" ? { active: false } : action === "ACTIVATE" ? { active: true } : {}),
      },
    });
  }
  await platformAudit({ userId: auth.user.id, action: `LOGIN_${action}`, orgId: user.orgId, details: user.email });
  return NextResponse.json({ ok: true, ...(temporary ? { temporaryPassword: temporary } : {}) });
}
