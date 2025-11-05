import { Schemas } from "@/src/lib/api/adapters/api-blueprint";
import { Robot, Shield, ShieldCheckmark } from "../icons";
import { Badge } from "../ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { useMedia } from "@/src/lib/hooks";
import { getAccountSite, useAuth, useIsAdmin } from "@/src/stores/auth";
import { useProfileFromStore } from "@/src/stores/profiles";
import { cn } from "@/src/lib/utils";

export function CommentCreatorBadge({
  comment,
  isMod,
  className,
}: {
  comment: Schemas.Comment;
  isMod: boolean | undefined;
  className?: string;
}) {
  const media = useMedia();
  const compact = media.maxMd;

  const isAdmin = useIsAdmin(comment.creatorApId);
  const creator = useProfileFromStore(comment.creatorApId);

  const me = useAuth((s) => getAccountSite(s.getSelectedAccount())?.me?.apId);

  if (comment.creatorApId === me) {
    return (
      <Badge size="sm" variant="brand" className={className}>
        Me
      </Badge>
    );
  }

  if (comment.isBannedFromCommunity || creator?.isBanned) {
    return (
      <Badge size="sm" variant="destructive" className={className}>
        Banned
      </Badge>
    );
  }

  if (isAdmin) {
    return compact ? (
      <Tooltip>
        <TooltipTrigger className={className}>
          <ShieldCheckmark className="text-lg text-brand" />
        </TooltipTrigger>
        <TooltipContent>ADMIN</TooltipContent>
      </Tooltip>
    ) : (
      <div className={cn("flex gap-0.5", className)}>
        <ShieldCheckmark className="text-brand text-base" />
        <span className="text-xs text-brand max-md:hidden">ADMIN</span>
      </div>
    );
  }

  if (creator?.isBot) {
    return compact ? (
      <Tooltip>
        <TooltipTrigger className={className}>
          <Robot className="text-lg text-brand-secondary" />
        </TooltipTrigger>
        <TooltipContent>Bot account</TooltipContent>
      </Tooltip>
    ) : (
      <div className={cn("flex gap-0.5", className)}>
        <Robot className="text-brand-secondary text-base -mt-px" />
        <span className="text-xs text-brand-secondary">BOT</span>
      </div>
    );
  }

  if (isMod) {
    return compact ? (
      <Tooltip>
        <TooltipTrigger className={className}>
          <Shield className="text-lg text-green-500" />
        </TooltipTrigger>
        <TooltipContent>MOD</TooltipContent>
      </Tooltip>
    ) : (
      <div className={cn("flex gap-0.5", className)}>
        <Shield className="text-green-500 text-base" />
        <span className="text-xs text-green-500">MOD</span>
      </div>
    );
  }
}
