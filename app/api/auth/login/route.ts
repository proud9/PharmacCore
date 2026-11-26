import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { startSession } from "@/lib/auth";
import { homePath } from "@/lib/capabilities";
import { forOrg } from "@/lib/tenant";
import { platformAudit } from "@/lib/audit";
import { clientIp, tooMany } from "@/lib/rate-limit";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const WINDOW = 15 * 60 * 1000;

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a valid email and password." }, { status: 400 });
  }
  const email = parsed.data.email.toLowerCase();
  if (tooMany(`ip:${clientIp(request)}`, 30, WINDOW) || tooMany(`email:${email}`, 8, WINDOW)) {
    return NextResponse.json({ error: "Too many sign-in attempts. Wait 15 minutes and try again." }, { status: 429 });
  }

  const user = await db.user.findUnique({ where: { email }, include: { org: true } });
  const ok = !!user && user.active && (await bcrypt.compare(parsed.data.password, user.passwordHash));
  if (!user || !ok) return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
  if (user.role !== "ADMIN" && (!user.org || user.org.status !== "ACTIVE")) {
    return NextResponse.json(
      { error: "This business account is suspended. Contact the Parallax team." },
      { status: 403 },
    );
  }

  await startSession(user);
  await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  if (user.orgId) {
    const { db: orgDb } = forOrg(user.orgId);
    await orgDb.auditLog.create({
      data: { orgId: user.orgId, userId: user.id, userName: user.name, action: "LOGIN", entity: "User", entityId: user.id },
    });
  } else {
    await platformAudit({ userId: user.id, action: "LOGIN" });
  }

  const home = user.mustChangePassword ? "/account/password" : homePath(user.role);
  return NextResponse.json({ ok: true, role: user.role, home });
}
