import { NextResponse } from "next/server";
import { z } from "zod";
import { canWholesale, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

const schema = z.object({
  name: z.string().min(1),
  license: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  address: z.string().optional(),
  website: z.string().optional(),
  tpin: z.string().optional(),
  bankName: z.string().optional(),
  accountName: z.string().optional(),
  accountNumber: z.string().optional(),
  bankBranch: z.string().optional(),
  swiftCode: z.string().optional(),
});

function blank(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export async function POST(request: Request) {
  const user = await requireUser();
  if (!user || !canWholesale(user.role)) {
    return NextResponse.json({ error: "Wholesale administrators only." }, { status: 403 });
  }
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter the pharmacy trading name." }, { status: 400 });
  }

  const pharmacy = await db.pharmacy.upsert({
    where: { id: "main" },
    update: {
      name: parsed.data.name.trim(),
      license: blank(parsed.data.license),
      phone: blank(parsed.data.phone),
      email: blank(parsed.data.email),
      address: blank(parsed.data.address),
      website: blank(parsed.data.website),
      tpin: blank(parsed.data.tpin),
      bankName: blank(parsed.data.bankName),
      accountName: blank(parsed.data.accountName),
      accountNumber: blank(parsed.data.accountNumber),
      bankBranch: blank(parsed.data.bankBranch),
      swiftCode: blank(parsed.data.swiftCode),
    },
    create: {
      id: "main",
      name: parsed.data.name.trim(),
      currency: "ZMW",
    },
  });

  return NextResponse.json(pharmacy);
}
