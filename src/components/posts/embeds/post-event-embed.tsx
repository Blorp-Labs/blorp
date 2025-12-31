import { Schemas } from "@/src/lib/api/adapters/api-blueprint";
import { DateTime } from "../../datetime";
import dayjs from "dayjs";

export function PostEventEmbed({ event }: { event: Schemas.Post["event"] }) {
  if (!event) {
    return null;
  }

  return (
    <div className="border p-3 rounded-md flex flex-col">
      <div className="flex flex-row gap-1">
        <DateTime date={dayjs(event.start)} />
        {"-"}
        <DateTime date={dayjs(event.end)} />
      </div>

      <span>Max Attendees: {event.maxAttendees}</span>

      <span>
        {event.addressLine1}, {event.city}, {event.country}
      </span>

      <span>{event.cost}</span>
    </div>
  );
}
