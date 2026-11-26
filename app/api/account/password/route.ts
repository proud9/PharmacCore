import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { PASSWORD_MIN, requireUser, startSession } from "@/lib/auth";
import { homePath } from "@/lib/capabilities";
import { getTenant } from "@/lib/tenant";
import { audit, platformAudit } from "@/lib/audit";

/** Change your own password. Ends every other session; this one continues. */
const schema = z.object({
  current: z.string().min(1, "Enter your current password."),
  password: z.string().min(PASSWORD_MIN, `New passwords need at least ${PASSWORD_MIN} characters.`).max(72),
});

export async function POST(request: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Check the form." }, { status: 400 });
  const row = await db.user.findUnique({ where: { id: user.id } });
  if (!row || !(await bcrypt.compare(parsed.data.current, row.passwordHash))) {
    return NextResponse.json({ error: "Your current password is not right." }, { status: 400 });
  }
  if (parsed.data.current === parsed.data.password) {
    return NextResponse.json({ error: "Choose a password different from the current one." }, { status: 400 });
  }
  const updated = await db.user.update({
    where: { id: user.id },
    data: { passwordHash: await bcrypt.hash(parsed.data.password, 10), mustChangePassword: false, sessionVersion: { increment: 1 } },
  });
  await startSession(updated);
  const t = await getTenant().catch(() => null);
  if (t) await audit(t, { action: "PASSWORD_CHANGED", entity: "User", entityId: user.id });
  else await platformAudit({ userId: user.id, action: "PASSWORD_CHANGED" });
  return NextResponse.json({ ok: true, home: homePath(user.role) });
}
