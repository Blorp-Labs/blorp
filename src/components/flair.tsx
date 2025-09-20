import { Schemas } from "../lib/api/adapters/api-blueprint";
import { Badge } from "./ui/badge";

export function Flair({
  flair,
  size,
}: {
  flair: Schemas.Flair;
  size?: "default" | "sm";
}) {
  return (
    <Badge
      className="rounded-full"
      style={{
        backgroundColor: flair.backgroundColor ?? undefined,
        color: flair.color ?? undefined,
      }}
      size={size}
    >
      {flair?.title}
    </Badge>
  );
}
