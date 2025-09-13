import { Schemas } from "../lib/api/adapters/api-blueprint";
import { Badge } from "./ui/badge";

export function Flair({ flair }: { flair: Schemas.Flair }) {
  return (
    <Badge
      className="rounded-full"
      style={{
        backgroundColor: flair.backgroundColor ?? undefined,
        color: flair.color ?? undefined,
      }}
    >
      {flair?.title}
    </Badge>
  );
}
