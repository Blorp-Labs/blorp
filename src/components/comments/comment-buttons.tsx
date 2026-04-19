import { useLikeCommentMutation } from "@/src/queries/index";
import { resolveVoteCounts } from "@/src/lib/voting";
import { useVoteHaptics } from "@/src/hooks/use-vote-haptics";
import { ButtonHTMLAttributes, DetailedHTMLProps, useId } from "react";
import { cn } from "@/src/lib/utils";
import {
  PiArrowBendUpLeftBold,
  PiArrowFatUpBold,
  PiArrowFatDownBold,
  PiArrowFatDownFill,
  PiArrowFatUpFill,
} from "react-icons/pi";
import { FaHeart, FaRegHeart } from "react-icons/fa6";
import { Button } from "../ui/button";
import { abbriviateNumber, abbriviateNumberParts } from "@/src/lib/format";
import { Schemas } from "@/src/apis/api-blueprint";
import { Tooltip, TooltipTrigger, TooltipContent } from "../ui/tooltip";
import { useDoubleTap } from "use-double-tap";
import { useMedia, useRequireAuth } from "@/src/hooks";
import { useSettingsStore } from "@/src/stores/settings";
import { useShouldShowDownvotes, useScoreDisplay } from "@/src/stores/utils";
import { Separator } from "../ui/separator";
import { NumberFlow } from "../number-flow";
import { MAX_REACTIONS } from "../posts/config";
import {
  HoverCard,
  HoverCardTrigger,
  HoverCardContent,
} from "../ui/hover-card";

type Vote = {
  postId: number;
  id: number;
  score: number;
  path: string;
};

function useVoteComment() {
  const requireAuth = useRequireAuth();
  const vote = useLikeCommentMutation();
  const voteHaptics = useVoteHaptics();
  return (config: Vote) => {
    requireAuth().then(() => {
      voteHaptics(config.score);
      vote.mutate(config);
    });
  };
}

export function useDoubleTapLike(config?: Vote) {
  const media = useMedia();
  const vote = useVoteComment();
  return useDoubleTap(() => {
    if (config && media.maxMd) {
      vote(config);
    }
  });
}

export function CommentEmojiReactions({
  reactions,
  className,
  onReact,
}: {
  reactions?: { token?: string; count: number; url?: string }[];
  className?: string;
  onReact?: (emoji?: string) => void;
}) {
  const allReactions = reactions ?? [];
  if (allReactions.length === 0) {
    return null;
  }
  const truncated = allReactions.slice(0, MAX_REACTIONS);

  if (truncated.length > 4) {
    return (
      <div className={cn("flex flex-row gap-1.5", className)}>
        <HoverCard>
          <HoverCardTrigger asChild>
            <Button size="sm" variant="outline" className="px-2 gap-0.5">
              {truncated.map((emoji) =>
                emoji.url ? (
                  <img
                    key={emoji.token}
                    src={emoji.url}
                    alt={emoji.token}
                    className="size-4 object-contain"
                  />
                ) : (
                  <span key={emoji.token}>{emoji.token}</span>
                ),
              )}
            </Button>
          </HoverCardTrigger>
          <HoverCardContent className="w-auto p-2">
            <div className="flex flex-col gap-1">
              {allReactions.map((emoji) => (
                <div
                  key={emoji.token}
                  className="flex items-center gap-2 text-sm"
                >
                  {emoji.url ? (
                    <img
                      src={emoji.url}
                      alt={emoji.token}
                      className="size-4 object-contain"
                    />
                  ) : (
                    <span>{emoji.token}</span>
                  )}
                  <span>{emoji.count}</span>
                </div>
              ))}
            </div>
          </HoverCardContent>
        </HoverCard>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-row flex-wrap gap-1.5", className)}>
      {truncated.map((emoji) => (
        <Button
          key={emoji.token}
          size="sm"
          variant="outline"
          className="px-2"
          onClick={() => onReact?.(emoji.token)}
        >
          {emoji.url ? (
            <img
              src={emoji.url}
              alt={emoji.token}
              className="size-4 object-contain"
            />
          ) : (
            emoji.token
          )}
          <span>{emoji.count}</span>
        </Button>
      ))}
    </div>
  );
}

export function CommentVoting({
  commentView,
  className,
  fixRightAlignment,
}: {
  commentView: Schemas.Comment;
  className?: string;
  fixRightAlignment?: boolean;
}) {
  const enableDownvotes = useShouldShowDownvotes("enableCommentDownvotes");
  const scoreDisplay = useScoreDisplay();

  const upvoteId = useId();
  const downvoteId = useId();

  const vote = useVoteComment();

  const {
    displayUpvotes,
    displayDownvotes,
    displayScore,
    isUpvoted,
    isDownvoted,
  } = resolveVoteCounts(commentView);

  const abbrvScore = abbriviateNumberParts(displayScore);
  const abbrvUpvotes = abbriviateNumberParts(displayUpvotes);
  const abbrvDownvotes = abbriviateNumberParts(-displayDownvotes);

  // Heart mode — server has disabled downvotes.
  // Only show a count for score/upvotes display modes; downvotes-only makes no
  // sense when the server doesn't support them.
  if (!enableDownvotes) {
    const showCount = scoreDisplay === "score" || scoreDisplay === "upvotes";
    return (
      <Button
        size="sm"
        variant="ghost"
        onClick={async () => {
          vote({
            postId: commentView.postId,
            id: commentView.id,
            score: isUpvoted ? 0 : 1,
            path: commentView.path,
          });
        }}
        className={cn(
          "text-md font-normal",
          isUpvoted && "text-brand hover:text-brand",
          fixRightAlignment && "-mr-2",
        )}
      >
        {isUpvoted ? <FaHeart /> : <FaRegHeart />}
        {showCount &&
          abbriviateNumber(
            scoreDisplay === "upvotes" ? displayUpvotes : displayScore,
          )}
      </Button>
    );
  }

  const isDownvoteSide = scoreDisplay === "downvotes";
  const countAbbrv = isDownvoteSide
    ? abbrvDownvotes
    : scoreDisplay === "upvotes"
      ? abbrvUpvotes
      : abbrvScore;
  const tooltipText = isDownvoteSide
    ? `${displayDownvotes} downvotes`
    : scoreDisplay === "upvotes"
      ? `${displayUpvotes} upvotes`
      : `${displayUpvotes} upvotes, ${displayDownvotes} downvotes`;

  const countNode = scoreDisplay !== "none" && (
    <Tooltip>
      <TooltipTrigger aria-label={tooltipText}>
        <label htmlFor={isDownvoteSide ? downvoteId : upvoteId}>
          <NumberFlow
            className={cn(
              "-mx-0.5 cursor-pointer",
              isDownvoteSide
                ? isDownvoted && "text-brand-secondary"
                : cn(
                    isUpvoted && "text-brand",
                    isDownvoted && "text-brand-secondary",
                  ),
            )}
            suffix={countAbbrv.suffix}
            value={countAbbrv.number}
          />
        </label>
      </TooltipTrigger>
      <TooltipContent>{tooltipText}</TooltipContent>
    </Tooltip>
  );

  return (
    <div
      className={cn(
        "flex flex-row items-center",
        fixRightAlignment && "-mr-2",
        className,
      )}
    >
      <Button
        id={upvoteId}
        size="icon"
        variant="ghost"
        onClick={async () => {
          vote({
            postId: commentView.postId,
            id: commentView.id,
            score: isUpvoted ? 0 : 1,
            path: commentView.path,
          });
        }}
        className={cn(
          "hover:text-brand hover:bg-brand/10 dark:hover:bg-brand/25",
          isUpvoted && "text-brand",
          isDownvoted && "text-brand-secondary",
        )}
      >
        {isUpvoted ? (
          <PiArrowFatUpFill aria-label="Remove upvote" />
        ) : (
          <PiArrowFatUpBold aria-label="Upvote" />
        )}
      </Button>

      {/* Separator left of count — only in downvotes mode */}
      {isDownvoteSide && <Separator orientation="vertical" className="h-4" />}

      {countNode}

      {/* Separator right of count — only in upvotes mode */}
      {scoreDisplay === "upvotes" && (
        <Separator orientation="vertical" className="h-4" />
      )}

      <Button
        id={downvoteId}
        size="icon"
        variant="ghost"
        onClick={async () => {
          vote({
            postId: commentView.postId,
            id: commentView.id,
            score: isDownvoted ? 0 : -1,
            path: commentView.path,
          });
        }}
        className={cn(
          "hover:text-brand-secondary hover:bg-brand-secondary/10 dark:hover:bg-brand-secondary/30",
          isDownvoted && "text-brand-secondary",
        )}
      >
        {isDownvoted ? (
          <PiArrowFatDownFill aria-label="Remove downvote" />
        ) : (
          <PiArrowFatDownBold aria-label="Downvote" />
        )}
      </Button>
    </div>
  );
}

export function CommentReplyButton(
  props: DetailedHTMLProps<
    ButtonHTMLAttributes<HTMLButtonElement>,
    HTMLButtonElement
  >,
) {
  return (
    <>
      <Button
        {...props}
        size="icon"
        variant="ghost"
        className={cn("md:hidden", props.className)}
      >
        <PiArrowBendUpLeftBold aria-label="Reply" />
      </Button>
      <Button
        {...props}
        size="sm"
        variant="ghost"
        className={cn("max-md:hidden", props.className)}
      >
        <PiArrowBendUpLeftBold />
        <span>Reply</span>
      </Button>
    </>
  );
}

export function CommentButtonBar({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const leftHandedMode = useSettingsStore((s) => s.leftHandedMode);
  return (
    <div
      className={cn(
        "flex flex-row items-center justify-end gap-1",
        leftHandedMode && "flex-row-reverse",
        className,
      )}
    >
      {children}
    </div>
  );
}
