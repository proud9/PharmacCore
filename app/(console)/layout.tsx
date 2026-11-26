import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getTenant } from "@/lib/tenant";
import { db } from "@/lib/db";
import { can, ROLE_LABEL, type Capability } from "@/lib/capabilities";
import { subscriptionState } from "@/lib/subscription";
import { Shell } from "@/components/Shell";

const CAPS: Capability[] = ["sell", "buy", "inventory", "counter", "catalog"];

export default async function ConsoleLayout({ children }: { children: React.ReactNode }) {
  const t = await getTenant();
  if (!t) {
    // The Parallax team has its own area; anyone else here has an ended or invalid session.
    const user = await requireUser();
    if (user?.role === "ADMIN") redirect("/admin");
    redirect("/api/auth/signout");
  }
  const { org, user } = t;
  if (user.mustChangePassword) redirect("/account/password");

  const [unreadNotes, unreadAnnouncements] = await Promise.all([
    t.db.notification.count({ where: { readAt: null } }),
    db.announcement.count({
      where: {
        OR: [{ audience: "ALL" }, { audience: "KIND", kind: org.kind }, { audience: "ORG", orgId: org.id }],
        reads: { none: { userId: user.id } },
        createdAt: { gte: org.createdAt },
      },
    }),
  ]);
  const sub = subscriptionState(org.kind, org.subscription);

  return (
    <Shell
      name={user.name}
      orgName={org.name}
      kindLabel={ROLE_LABEL[org.kind] ?? org.kind}
      caps={CAPS.filter((cap) => can(org.kind, cap))}
      unread={unreadNotes + unreadAnnouncements}
      subscription={{
        state: sub.state,
        daysLeft: sub.daysLeft,
        readOnlyOn: sub.readOnlyOn ? sub.readOnlyOn.toISOString() : null,
      }}
    >
      {children}
    </Shell>
  );
}
