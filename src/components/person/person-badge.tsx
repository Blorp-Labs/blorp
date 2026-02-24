import { Schemas } from "@/src/lib/api/adapters/api-blueprint";
import { Badge, badgeVariants } from "../ui/badge";
import { useIsAdmin } from "@/src/stores/auth";
import { Robot, ShieldCheckmark } from "../icons";
import { VariantProps } from "class-variance-authority";

type BadgeSize = VariantProps<typeof badgeVariants>["size"];

export function PersonBadge({
  person,
  size,
}: {
  person?: Schemas.Person;
  size?: BadgeSize;
}) {
  const isAdmin = useIsAdmin(person?.apId);

  if (!person) {
    return null;
  }

  if (person.isBanned) {
    return (
      <Badge variant="destructive" size={size}>
        Banned
      </Badge>
    );
  }

  if (person.deleted) {
    return (
      <Badge variant="destructive" size={size}>
        Deleted
      </Badge>
    );
  }

  if (isAdmin) {
    return (
      <Badge variant="brand" size={size}>
        <ShieldCheckmark />
        ADMIN
      </Badge>
    );
  }

  if (person.isBot) {
    return (
      <Badge variant="brand-secondary" size={size}>
        <Robot />
        Bot
      </Badge>
    );
  }

  return null;
}
