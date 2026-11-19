import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { setSessionCookie, signSession } from "@/lib/auth";
import { isSetUp } from "@/lib/setup";

/**
 * Public wholesale set-up. Only works while the installation has no administrator: it creates
 * the owner's ADMIN account and fills in the company details that print on quotations,
 * invoices and delivery notes, then signs the owner in. Logo and bank details are added in
 * the next steps through the normal /api/pharmacy routes.
 */
const optional = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => (value ? value : null));

const schema = z.object({
  owner: z.object({
    name: z.string().trim().min(2, "Enter your name.").max(100),
    email: z.string().trim().email("Enter a valid email address.").max(254).transform((e) => e.toLowerCase()),
    password: z.string().min(8, "Use at least 8 characters for your password."),
  }),
  company: z.object({
    name: z.string().trim().min(2, "Enter your wholesale's trading name.").max(150),
    phone: z.string().trim().min(6, "Enter a phone number for your documents.").max(40),
    address: z.string().trim().min(5, "Enter your business address.").max(300),
    email: z.union([z.string().trim().email("Enter a valid company email."), z.literal("")]).optional().transform((v) => v || null),
    license: optional(80),
    tpin: optional(40),
    website: optional(150),
  }),
});

export async function POST(request: Request) {
  if (await isSetUp()) {
    return NextResponse.json({ error: "This Parallax is already set up. Sign in instead." }, { status: 409 });
  }
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Check the form." }, { status: 400 });
  }
  const { owner, company } = parsed.data;
  if (Buffer.byteLength(owner.password, "utf8") > 72) {
    return NextResponse.json({ error: "Password must be no more than 72 bytes." }, { status: 400 });
  }
  const passwordHash = await bcrypt.hash(owner.password, 10);

  const user = await db.$transaction(async (tx) => {
    // Re-check inside the transaction so two people can't both claim the installation.
    if ((await tx.user.count({ where: { role: "ADMIN" } })) > 0) return null;
    if (await tx.user.findUnique({ where: { email: owner.email } })) throw new Error("email-taken");
    const created = await tx.user.create({
      data: { name: owner.name, email: owner.email, passwordHash, role: "ADMIN", lastLoginAt: new Date() },
    });
    const details = {
      name: company.name,
      phone: company.phone,
      address: company.address,
      email: company.email ?? owner.email,
      license: company.license,
      tpin: company.tpin,
      website: company.website,
    };
    await tx.pharmacy.upsert({
      where: { id: "main" },
      update: details,
      create: { id: "main", currency: "ZMW", ...details },
    });
    return created;
  }).catch((error: unknown) => {
    if (error instanceof Error && error.message === "email-taken") return "email-taken" as const;
    throw error;
  });

  if (user === "email-taken") {
    return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
  }
  if (!user) {
    return NextResponse.json({ error: "This Parallax is already set up. Sign in instead." }, { status: 409 });
  }

  await audit({ userId: user.id, action: "WHOLESALE_SET_UP", entity: "Pharmacy", entityId: "main", details: company.name });
  await setSessionCookie(
    await signSession({ id: user.id, email: user.email, name: user.name, role: "ADMIN", institutionId: null }),
  );
  return NextResponse.json({ ok: true }, { status: 201 });
}
