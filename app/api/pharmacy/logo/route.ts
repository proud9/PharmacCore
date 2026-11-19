import { mkdir, readFile, unlink, writeFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { canEditCompany, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

const TYPES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

const CONTENT: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  webp: "image/webp",
};

function brandingDir() {
  return path.join(process.cwd(), "data", "branding");
}

function logoFile(filename: string) {
  const base = path.basename(filename);
  if (!/^logo\.(png|jpg|webp)$/.test(base)) return null;
  return path.join(brandingDir(), base);
}

export async function GET() {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const pharmacy = await db.pharmacy.findUnique({ where: { id: "main" } });
  const file = pharmacy?.logoPath ? logoFile(pharmacy.logoPath) : null;
  if (!file) return NextResponse.json({ error: "No logo" }, { status: 404 });
  try {
    const bytes = await readFile(file);
    const ext = path.extname(file).slice(1);
    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        "Content-Type": CONTENT[ext] ?? "application/octet-stream",
        "Cache-Control": "private, max-age=60",
      },
    });
  } catch {
    return NextResponse.json({ error: "No logo" }, { status: 404 });
  }
}

export async function POST(request: Request) {
  const user = await requireUser();
  if (!user || !canEditCompany(user.role)) {
    return NextResponse.json({ error: "Only administrators and finance staff can change company details." }, { status: 403 });
  }
  const form = await request.formData().catch(() => null);
  const file = form?.get("logo");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Choose a PNG, JPG, or WebP logo." }, { status: 400 });
  }
  const ext = TYPES[file.type];
  if (!ext) {
    return NextResponse.json({ error: "Use a PNG, JPG, or WebP image." }, { status: 400 });
  }
  if (file.size > 1_500_000) {
    return NextResponse.json({ error: "Logo must be under 1.5 MB." }, { status: 400 });
  }

  const dir = brandingDir();
  await mkdir(dir, { recursive: true });
  const filename = `logo.${ext}`;
  await writeFile(path.join(dir, filename), Buffer.from(await file.arrayBuffer()));
  for (const other of ["png", "jpg", "webp"]) {
    if (other === ext) continue;
    await unlink(path.join(dir, `logo.${other}`)).catch(() => undefined);
  }

  await db.pharmacy.update({
    where: { id: "main" },
    data: { logoPath: filename },
  });

  return NextResponse.json({ logoPath: filename });
}
