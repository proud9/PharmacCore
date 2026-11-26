import { NextResponse } from "next/server";
import { apiTenant } from "@/lib/tenant";
import { db as platform } from "@/lib/db";

/** Marks every notification and announcement read for this business's login. */
export async function POST() {
  const auth = await apiTenant(undefined, { write: false });
  if (!auth.ok) return auth.response;
  const { db, org, user } = auth.t;
  await db.notification.updateMany({ where: { readAt: null }, data: { readAt: new Date() } });
  const unread = await platform.announcement.findMany({
    where: {
      OR: [{ audience: "ALL" }, { audience: "KIND", kind: org.kind }, { audience: "ORG", orgId: org.id }],
      reads: { none: { userId: user.id } },
    },
    select: { id: true },
  });
  if (unread.length) {
    await platform.announcementRead.createMany({
      data: unread.map((a) => ({ announcementId: a.id, userId: user.id })),
      skipDuplicates: true,
    });
  }
  return NextResponse.json({ ok: true });
}
