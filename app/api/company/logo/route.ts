import { mkdir, readFile, unlink, writeFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { apiTenant } from "@/lib/tenant";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";

/**
 * Business logos, stored in data/branding/<orgId>/. A logo is printed on that business's
 * documents, so any signed-in user may fetch one (GET ?org=<id>, default: your own).
 */
const TYPES: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };
const CONTENT: Record<string, string> = { png: "image/png", jpg: "image/jpeg", webp: "image/webp" };

function orgDir(orgId: string) {
  if (!/^[a-z0-9]+$/i.test(orgId)) throw new Error("Bad id");
  return path.join(process.cwd(), "data", "branding", orgId);
}

function logoFile(orgId: string, filename: string) {
  const base = path.basename(filename);
  if (!/^logo\.(png|jpg|webp)$/.test(base)) return null;
  return path.join(orgDir(orgId), base);
}

export async function GET(request: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  const orgId = new URL(request.url).searchParams.get("org") ?? user.orgId;
  if (!orgId || !/^[a-z0-9]+$/i.test(orgId)) return NextResponse.json({ error: "No logo" }, { status: 404 });
  const org = await db.organization.findUnique({ where: { id: orgId }, select: { logoPath: true } });
  const file = org?.logoPath ? logoFile(orgId, org.logoPath) : null;
  if (!file) return NextResponse.json({ error: "No logo" }, { status: 404 });
  try {
    const bytes = await readFile(file);
    const ext = path.extname(file).slice(1);
    return new NextResponse(new Uint8Array(bytes), {
      headers: { "Content-Type": CONTENT[ext] ?? "application/octet-stream", "Cache-Control": "private, max-age=60" },
    });
  } catch {
    return NextResponse.json({ error: "No logo" }, { status: 404 });
  }
}

export async function POST(request: Request) {
  const auth = await apiTenant();
  if (!auth.ok) return auth.response;
  const { t } = auth;
  const form = await request.formData().catch(() => null);
  const file = form?.get("logo");
  if (!(file instanceof File)) return NextResponse.json({ error: "Choose a PNG, JPG, or WebP logo." }, { status: 400 });
  const ext = TYPES[file.type];
  if (!ext) return NextResponse.json({ error: "Use a PNG, JPG, or WebP image." }, { status: 400 });
  if (file.size > 1_500_000) return NextResponse.json({ error: "Logo must be under 1.5 MB." }, { status: 400 });

  const dir = orgDir(t.org.id);
  await mkdir(dir, { recursive: true });
  const filename = `logo.${ext}`;
  await writeFile(path.join(dir, filename), Buffer.from(await file.arrayBuffer()));
  for (const other of ["png", "jpg", "webp"]) {
    if (other !== ext) await unlink(path.join(dir, `logo.${other}`)).catch(() => undefined);
  }
  await db.organization.update({ where: { id: t.org.id }, data: { logoPath: filename } });
  await audit(t, { action: "LOGO_UPDATED", entity: "Organization", entityId: t.org.id });
  return NextResponse.json({ logoPath: filename });
}
