import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import { setSessionCookie, signSession } from "@/lib/auth";
import { homePath } from "@/lib/paths";
import { isSetUp } from "@/lib/setup";
import { INSTITUTION_KINDS } from "@/lib/wholesale";
import type { Role } from "@/lib/utils";

const schema = z.object({
  name: z.string().trim().min(2).max(100),
  institutionName: z.string().trim().min(2).max(150),
  kind: z.enum(INSTITUTION_KINDS),
  email: z.string().trim().email().max(254).transform((email) => email.toLowerCase()),
  password: z.string().min(8),
});

export async function POST(request: Request) {
  // Customers order from this installation's wholesale, so sign-up waits until one is set up.
  if (!(await isSetUp())) {
    return NextResponse.json({ error: "Customer accounts open once the wholesale has finished setting up." }, { status: 409 });
  }
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter valid account, organization, email, and password details." }, { status: 400 });
  }
  if (Buffer.byteLength(parsed.data.password, "utf8") > 72) {
    return NextResponse.json({ error: "Password must be no more than 72 bytes." }, { status: 400 });
  }

  let user;
  try {
    user = await db.user.create({
      data: {
        name: parsed.data.name,
        email: parsed.data.email,
        passwordHash: await bcrypt.hash(parsed.data.password, 10),
        role: "BUYER",
        institution: {
          create: {
            name: parsed.data.institutionName,
            kind: parsed.data.kind,
            contact: parsed.data.name,
            email: parsed.data.email,
          },
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        institutionId: true,
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
    }
    throw error;
  }

  await audit({
    userId: user.id,
    action: "ACCOUNT_CREATED",
    entity: "User",
    entityId: user.id,
  });
  const token = await signSession({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role as Role,
    institutionId: user.institutionId,
  });
  await setSessionCookie(token);

  return NextResponse.json({ ok: true, home: homePath(user.role) }, { status: 201 });
}
