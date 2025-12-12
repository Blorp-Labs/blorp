import { Robot, Shield, ShieldCheckmark } from "../icons";
import { Badge } from "../ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { useMedia } from "@/src/lib/hooks";

export function PostCreatorBadge({
  isMod,
  isBanned,
  isDeleted,
  isAdmin,
  isBot,
}: {
  isMod: boolean | undefined;
  isBanned: boolean | undefined;
  isDeleted: boolean | undefined;
  isAdmin: boolean | undefined;
  isBot: boolean | undefined;
}) {
  const media = useMedia();
  const compact = media.maxMd;

  if (isBanned) {
    return (
      <Badge size="sm" variant="destructive">
        Banned
      </Badge>
    );
  }

  if (isDeleted) {
    return (
      <Badge size="sm" variant="destructive">
        Deleted
      </Badge>
    );
  }

  if (isAdmin) {
    return compact ? (
      <Tooltip>
        <TooltipTrigger>
          <ShieldCheckmark className="text-lg text-brand" />
        </TooltipTrigger>
        <TooltipContent>ADMIN</TooltipContent>
      </Tooltip>
    ) : (
      <div className="flex gap-0.5">
        <ShieldCheckmark className="text-brand text-base" />
        <span className="text-xs text-brand max-md:hidden">ADMIN</span>
      </div>
    );
  }

  if (isBot) {
    return compact ? (
      <Tooltip>
        <TooltipTrigger>
          <Robot className="text-lg text-brand-secondary" />
        </TooltipTrigger>
        <TooltipContent>Bot account</TooltipContent>
      </Tooltip>
    ) : (
      <div className="flex gap-0.5">
        <Robot className="text-brand-secondary text-base -mt-px" />
        <span className="text-xs text-brand-secondary">BOT</span>
      </div>
    );
  }

  if (isMod) {
    return compact ? (
      <Tooltip>
        <TooltipTrigger>
          <Shield className="text-lg text-green-500" />
        </TooltipTrigger>
        <TooltipContent>MOD</TooltipContent>
      </Tooltip>
    ) : (
      <div className="flex gap-0.5">
        <Shield className="text-green-500 text-base" />
        <span className="text-xs text-green-500">MOD</span>
      </div>
    );
  }
}
