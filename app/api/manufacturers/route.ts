import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { canSell, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";

/**
 * Adds a manufacturer (Supplier) and, optionally, its single portal account.
 * With `supplierId`, only the account is added to an existing manufacturer.
 */
const login = z.object({
  loginName: z.string().trim().min(2).max(100),
  loginEmail: z.string().trim().email().max(254).transform((email) => email.toLowerCase()),
  loginPassword: z.string().min(8).max(72),
});
const details = z.object({
  name: z.string().trim().min(2).max(150),
  contact: z.string().trim().max(100).optional(),
  phone: z.string().trim().max(40).optional(),
  email: z.string().trim().max(254).optional(),
  address: z.string().trim().max(300).optional(),
});
const schema = z.union([
  z.object({ supplierId: z.string().min(1) }).merge(login),
  details.merge(login.partial()),
]);

export async function POST(request: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canSell(user.role)) return NextResponse.json({ error: "Only sales staff can add manufacturers." }, { status: 403 });
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    const addingLogin = Boolean(body && typeof body === "object" && "supplierId" in body);
    return NextResponse.json(
      {
        error: addingLogin
          ? "For the login, give a name (2+ letters), a valid email and a password of at least 8 characters."
          : "Enter the manufacturer's name. For a login, give a name, a valid email and a password of at least 8 characters.",
      },
      { status: 400 },
    );
  }
  const data = parsed.data;
  const wantsLogin = Boolean(data.loginEmail || data.loginPassword || data.loginName);
  if (wantsLogin && !(data.loginEmail && data.loginPassword && data.loginName)) {
    return NextResponse.json({ error: "For a login, fill in the name, email and password." }, { status: 400 });
  }
  if (data.loginEmail && (await db.user.findUnique({ where: { email: data.loginEmail } }))) {
    return NextResponse.json({ error: "That email already has an account." }, { status: 409 });
  }

  let supplierId: string;
  let supplierName: string;
  if ("supplierId" in data) {
    const supplier = await db.supplier.findUnique({ where: { id: data.supplierId }, include: { _count: { select: { users: true } } } });
    if (!supplier) return NextResponse.json({ error: "Manufacturer not found." }, { status: 404 });
    if (supplier._count.users > 0) return NextResponse.json({ error: "This manufacturer already has an account." }, { status: 409 });
    supplierId = supplier.id;
    supplierName = supplier.name;
  } else {
    const supplier = await db.supplier.create({
      data: {
        name: data.name,
        contact: data.contact || null,
        phone: data.phone || null,
        email: data.email || null,
        address: data.address || null,
      },
    });
    supplierId = supplier.id;
    supplierName = supplier.name;
  }

  if (data.loginEmail && data.loginPassword && data.loginName) {
    await db.user.create({
      data: {
        name: data.loginName,
        email: data.loginEmail,
        passwordHash: await bcrypt.hash(data.loginPassword, 10),
        role: "MANUFACTURER",
        supplierId,
      },
    });
  }

  await audit({
    userId: user.id,
    action: "supplierId" in data ? "MANUFACTURER_LOGIN_CREATED" : "MANUFACTURER_CREATED",
    entity: "Supplier",
    entityId: supplierId,
    details: `${supplierName}${data.loginEmail ? ` / ${data.loginEmail}` : ""}`,
  });
  return NextResponse.json({ id: supplierId });
}
