import { Schemas } from "@/src/lib/api/adapters/api-blueprint";
import { Badge } from "../ui/badge";
import { useIsAdmin } from "@/src/stores/auth";
import { Robot, ShieldCheckmark } from "../icons";

export function PersonBadge({ person }: { person?: Schemas.Person }) {
  const isAdmin = useIsAdmin(person?.apId);

  if (!person) {
    return null;
  }

  if (person.isBanned) {
    return <Badge variant="destructive">Banned</Badge>;
  }

  if (person.deleted) {
    return <Badge variant="destructive">Deleted</Badge>;
  }

  if (isAdmin) {
    return (
      <Badge variant="brand">
        <ShieldCheckmark />
        ADMIN
      </Badge>
    );
  }

  if (person.isBot) {
    return (
      <Badge variant="brand-secondary">
        <Robot />
        Bot
      </Badge>
    );
  }

  return null;
}
