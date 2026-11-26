import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { addDays } from "date-fns";
import { z } from "zod";
import { db } from "@/lib/db";
import { PASSWORD_MIN, startSession } from "@/lib/auth";
import { ORG_KINDS, homePath } from "@/lib/capabilities";
import { TRIAL_DAYS, pays } from "@/lib/subscription";

/** PUBLIC: a business signs up. Creates the business, its one login and (if it pays) a trial. */
const schema = z.object({
  kind: z.enum(ORG_KINDS),
  businessName: z.string().trim().min(2, "Enter the business name.").max(150),
  town: z.string().trim().max(80).optional(),
  phone: z.string().trim().max(40).optional(),
  name: z.string().trim().min(2, "Enter your name.").max(100),
  email: z.string().trim().email("Enter a valid email.").max(254).transform((email) => email.toLowerCase()),
  password: z.string().min(PASSWORD_MIN, `Passwords need at least ${PASSWORD_MIN} characters.`),
  website: z.string().max(0).optional(), // honeypot: people leave it empty
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Check the form." }, { status: 400 });
  }
  const data = parsed.data;
  if (Buffer.byteLength(data.password, "utf8") > 72) {
    return NextResponse.json({ error: "Password must be no more than 72 bytes." }, { status: 400 });
  }

  let user;
  try {
    user = await db.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: {
          kind: data.kind,
          name: data.businessName,
          town: data.town || null,
          phone: data.phone || null,
          email: data.email,
          // Clients aren't listed: sellers don't need to find them; they ask to connect.
          listed: data.kind !== "CLIENT",
        },
      });
      if (pays(data.kind)) {
        const end = addDays(new Date(), TRIAL_DAYS);
        await tx.subscription.create({ data: { orgId: org.id, plan: "TRIAL", trialEndsAt: end, periodEnd: end } });
      }
      return tx.user.create({
        data: {
          name: data.name,
          email: data.email,
          passwordHash: await bcrypt.hash(data.password, 10),
          role: data.kind,
          orgId: org.id,
        },
      });
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
    }
    throw error;
  }

  await startSession(user);
  return NextResponse.json({ ok: true, home: homePath(user.role) }, { status: 201 });
}
