import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { addDays } from "date-fns";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { adminDb } from "@/lib/db";
import { apiAdmin, temporaryPassword } from "@/lib/admin";
import { platformAudit } from "@/lib/audit";
import { ORG_KINDS, ROLE_LABEL } from "@/lib/capabilities";
import { TRIAL_DAYS, pays } from "@/lib/subscription";

/** GET ?q=: active businesses by name for the team's pickers (name, type, town only). */
export async function GET(request: Request) {
  const auth = await apiAdmin();
  if (!auth.ok) return auth.response;
  const q = (new URL(request.url).searchParams.get("q") ?? "").trim().slice(0, 100);
  const orgs = await adminDb().organization.findMany({
    where: { status: "ACTIVE", ...(q ? { name: { contains: q, mode: "insensitive" } } : {}) },
    select: { id: true, name: true, kind: true, town: true },
    orderBy: { name: "asc" },
    take: 10,
  });
  return NextResponse.json({
    results: orgs.map((org) => ({ id: org.id, name: org.name, detail: [ROLE_LABEL[org.kind], org.town].filter(Boolean).join(" · ") })),
  });
}

/** The Parallax team creates a business and its owner's login (temporary password). */
const schema = z.object({
  kind: z.enum(ORG_KINDS),
  businessName: z.string().trim().min(2, "Enter the business name.").max(150),
  town: z.string().trim().max(80).optional(),
  phone: z.string().trim().max(40).optional(),
  name: z.string().trim().min(2, "Enter the owner's name.").max(100),
  email: z.string().trim().email("Enter a valid email.").transform((value) => value.toLowerCase()),
});

export async function POST(request: Request) {
  const auth = await apiAdmin();
  if (!auth.ok) return auth.response;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Check the form." }, { status: 400 });
  const data = parsed.data;
  const password = temporaryPassword();
  const admin = adminDb();
  try {
    const org = await admin.$transaction(async (tx) => {
      const created = await tx.organization.create({
        data: {
          kind: data.kind,
          name: data.businessName,
          town: data.town || null,
          phone: data.phone || null,
          email: data.email,
          listed: data.kind !== "CLIENT",
        },
      });
      if (pays(data.kind)) {
        const end = addDays(new Date(), TRIAL_DAYS);
        await tx.subscription.create({ data: { orgId: created.id, plan: "TRIAL", trialEndsAt: end, periodEnd: end } });
      }
      await tx.user.create({
        data: {
          name: data.name,
          email: data.email,
          passwordHash: await bcrypt.hash(password, 10),
          role: data.kind,
          orgId: created.id,
          mustChangePassword: true,
        },
      });
      return created;
    });
    await platformAudit({ userId: auth.user.id, action: "BUSINESS_CREATED", orgId: org.id, details: `${org.name} (${org.kind})` });
    return NextResponse.json({ ok: true, id: org.id, email: data.email, temporaryPassword: password }, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "A login with this email already exists." }, { status: 409 });
    }
    throw error;
  }
}
