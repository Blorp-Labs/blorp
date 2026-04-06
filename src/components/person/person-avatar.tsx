import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/src/components/ui/avatar";
import { cn } from "@/src/lib/utils";
import { useProfileFromStore } from "@/src/stores/profiles";
import { Schemas } from "@/src/apis/api-blueprint";

export function PersonAvatar({
  actorId,
  size = "md",
  className,
  person: override,
}: {
  actorId: string;
  person?: Schemas.Person;
  size?: "xs" | "sm" | "md";
  className?: string;
}) {
  const personView = useProfileFromStore(actorId);
  return (
    <Avatar
      className={cn(
        "h-9 w-9",
        size === "sm" && "h-8 w-8",
        size === "xs" && "h-6 w-6",
        className,
      )}
    >
      <AvatarImage
        src={(override ? override.avatar : personView?.avatar) ?? undefined}
        className="object-cover"
      />
      <AvatarFallback>
        {(override?.slug ?? personView?.slug)?.substring(0, 1)}
      </AvatarFallback>
    </Avatar>
  );
}
