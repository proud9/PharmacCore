import { format } from "date-fns";
import { Badge } from "@/components/Badge";
import { STATUS_LABEL, statusTone } from "@/lib/wholesale";

export function OrderTrack({
  events,
}: {
  events: { id: string; status: string; message: string | null; actorName: string | null; createdAt: Date }[];
}) {
  return (
    <ol className="space-y-3">
      {events.map((event) => (
        <li key={event.id} className="border-l-2 border-pine-800/20 pl-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={statusTone(event.status)}>{STATUS_LABEL[event.status] ?? event.status}</Badge>
            <span className="text-xs text-ink/50">{format(event.createdAt, "dd MMM yyyy HH:mm")}</span>
          </div>
          <p className="mt-1 text-sm">{event.message}</p>
          {event.actorName ? <p className="text-xs text-ink/50">{event.actorName}</p> : null}
        </li>
      ))}
    </ol>
  );
}
