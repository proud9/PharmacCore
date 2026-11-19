import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { canSell, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { INSTITUTION_KINDS } from "@/lib/wholesale";

const schema = z.object({
  name: z.string().min(2),
  kind: z.enum(INSTITUTION_KINDS),
  license: z.string().optional(),
  contact: z.string().min(2),
  phone: z.string().optional(),
  email: z.string().optional(),
  address: z.string().optional(),
  buyerName: z.string().min(2),
  buyerEmail: z.string().email(),
  buyerPassword: z.string().min(8),
});

export async function POST(request: Request) {
  const user = await requireUser();
  if (!user || !canSell(user.role)) {
    return NextResponse.json({ error: "Only sales staff can add buyers." }, { status: 403 });
  }
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Institution and buyer login details are incomplete." }, { status: 400 });
  }

  // The institution and its login are created together, so a taken email leaves nothing behind.
  let institution;
  try {
    institution = await db.institution.create({
      data: {
        name: parsed.data.name,
        kind: parsed.data.kind,
        license: parsed.data.license,
        contact: parsed.data.contact,
        phone: parsed.data.phone,
        email: parsed.data.email,
        address: parsed.data.address,
        users: {
          create: {
            name: parsed.data.buyerName,
            email: parsed.data.buyerEmail.toLowerCase(),
            passwordHash: await bcrypt.hash(parsed.data.buyerPassword, 10),
            role: "BUYER",
          },
        },
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "Someone already signs in with this email. Use a different login email." }, { status: 409 });
    }
    throw error;
  }

  await audit({
    userId: user.id,
    action: "BUYER_ACCOUNT_CREATED",
    entity: "Institution",
    entityId: institution.id,
    details: `${institution.name} / ${parsed.data.buyerEmail}`,
  });

  return NextResponse.json(institution);
}
