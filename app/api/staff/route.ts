import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { canManageStaff, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { ROLES } from "@/lib/utils";

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(ROLES),
});

export async function POST(request: Request) {
  const user = await requireUser();
  if (!user || !canManageStaff(user.role)) {
    return NextResponse.json({ error: "Administrators only." }, { status: 403 });
  }
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Staff details are incomplete." }, { status: 400 });
  }
  const created = await db.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email.toLowerCase(),
      passwordHash: await bcrypt.hash(parsed.data.password, 10),
      role: parsed.data.role,
    },
  });
  await audit({
    userId: user.id,
    action: "STAFF_CREATED",
    entity: "User",
    entityId: created.id,
    details: created.email,
  });
  return NextResponse.json({ id: created.id });
}
