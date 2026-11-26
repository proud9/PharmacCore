import Link from "next/link";
import { format } from "date-fns";
import { pageTenant } from "@/lib/tenant";
import { db as platform } from "@/lib/db";
import { PageHeader } from "@/components/PageHeader";
import { MarkAllRead } from "@/components/forms/MarkAllRead";

/** Business events (new inquiry, quote received, dispatched…) and messages from the Parallax team. */
export default async function NotificationsPage() {
  const t = await pageTenant();
  const { db, org, user } = t;
  const [notes, announcements] = await Promise.all([
    db.notification.findMany({ orderBy: { createdAt: "desc" }, take: 60 }),
    platform.announcement.findMany({
      where: {
        OR: [{ audience: "ALL" }, { audience: "KIND", kind: org.kind }, { audience: "ORG", orgId: org.id }],
        createdAt: { gte: org.createdAt },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { reads: { where: { userId: user.id }, select: { id: true } } },
    }),
  ]);
  const unread = notes.some((note) => !note.readAt) || announcements.some((a) => a.reads.length === 0);

  return (
    <div>
      <PageHeader title="Notifications" description="What has happened on your orders and connections." action={unread ? <MarkAllRead /> : null} />
      {announcements.length ? (
        <section className="mb-6 rounded-2xl border border-pine-900/10 bg-white p-5 shadow-panel">
          <h2 className="font-display text-xl text-pine-900">From the Parallax team</h2>
          <ul className="mt-3 divide-y divide-pine-900/10">
            {announcements.map((a) => (
              <li key={a.id} className="py-3">
                <p className={a.reads.length ? "text-sm" : "text-sm font-semibold"}>{a.title}</p>
                <p className="mt-0.5 text-sm text-ink/70">{a.body}</p>
                <p className="mt-1 text-xs text-ink/50">{format(a.createdAt, "dd MMM yyyy")}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <section className="rounded-2xl border border-pine-900/10 bg-white p-5 shadow-panel">
        {notes.length === 0 ? <p className="text-sm text-ink/60">Nothing yet.</p> : null}
        <ul className="divide-y divide-pine-900/10">
          {notes.map((note) => (
            <li key={note.id} className="flex flex-wrap items-baseline justify-between gap-2 py-3">
              <div>
                {note.link ? (
                  <Link href={note.link} className={note.readAt ? "text-sm text-pine-800 hover:underline" : "text-sm font-semibold text-pine-800 hover:underline"}>
                    {note.title}
                  </Link>
                ) : (
                  <p className={note.readAt ? "text-sm" : "text-sm font-semibold"}>{note.title}</p>
                )}
                {note.body ? <p className="text-sm text-ink/70">{note.body}</p> : null}
              </div>
              <span className="text-xs text-ink/50">{format(note.createdAt, "dd MMM yyyy HH:mm")}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
