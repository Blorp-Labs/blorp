import { resolveVoteCounts } from "@/src/lib/voting";
import { useVoteHaptics } from "@/src/hooks/use-vote-haptics";
import { Link, resolveRoute } from "@/src/routing/index";
import {
  PiArrowFatUpBold,
  PiArrowFatDownBold,
  PiArrowFatDownFill,
  PiArrowFatUpFill,
} from "react-icons/pi";
import { TbMessageCircle, TbMessageCirclePlus } from "react-icons/tb";
import { cn } from "@/src/lib/utils";
import { ThemeComponent } from "../theme-components";
import { Button } from "../ui/button";
import { useCallback, useId } from "react";
import { abbriviateNumber, abbriviateNumberParts } from "@/src/lib/format";
import { useLinkContext } from "@/src/hooks/navigation-hooks";
import { FaHeart, FaRegHeart } from "react-icons/fa6";
import { Share } from "../icons";
import { Schemas } from "@/src/apis/api-blueprint";
import {
  useShareActions,
  useImageShareActions,
} from "@/src/components/adaptable/action-menu/hooks";
import { ActionMenu, ActionMenuProps } from "../adaptable/action-menu";
import {
  encodeApId,
  getPostMyVote,
  getPostEmojiReactions,
} from "@/src/apis/utils";
import { getPostEmbed } from "@/src/apis/post-embed";
import { Tooltip, TooltipTrigger, TooltipContent } from "../ui/tooltip";
import {
  HoverCard,
  HoverCardTrigger,
  HoverCardContent,
} from "../ui/hover-card";
import { useDoubleTap } from "use-double-tap";
import { useMedia, useRequireAuth } from "@/src/hooks";
import {
  useAddPostReactionEmojiMutation,
  useLikePostMutation,
} from "@/src/queries/post-mutations";
import { useShouldShowDownvotes, useScoreDisplay } from "@/src/stores/utils";
import { Separator } from "../ui/separator";
import { NumberFlow } from "../number-flow";
import { MAX_REACTIONS } from "./config";
import { downloadImage, shareImage } from "@/src/hooks/share";

export function usePostVoting(post: Schemas.Post | undefined) {
  const enableDownvotes = useShouldShowDownvotes("enablePostDownvotes");
  const scoreDisplay = useScoreDisplay();

  const { mutate: mutateVote } = useLikePostMutation();

  const requireAuth = useRequireAuth();

  const voteHaptics = useVoteHaptics();
  const vote = useCallback(
    (form: { postApId: string; postId: number; score: -1 | 0 | 1 }) => {
      requireAuth().then(() => {
        voteHaptics(form.score);
        mutateVote(form);
      });
    },
    [requireAuth, mutateVote, voteHaptics],
  );

  if (!post) {
    return null;
  }

  const {
    displayUpvotes,
    displayDownvotes,
    displayScore,
    isUpvoted,
    isDownvoted,
  } = resolveVoteCounts(post);

  return {
    displayScore,
    displayUpvotes,
    displayDownvotes,
    isUpvoted,
    isDownvoted,
    vote,
    enableDownvotes,
    scoreDisplay,
    postId: post.id,
  };
}

export function useDoubleTapPostLike(post: Schemas.Post | undefined) {
  const media = useMedia();
  const voting = usePostVoting(post);
  return useDoubleTap(() => {
    if (post && media.maxMd) {
      voting?.vote({ postApId: post.apId, postId: post.id, score: 1 });
    }
  });
}

export function PostEmojiReactions({
  post,
  className,
}: {
  post: Schemas.Post;
  className?: string;
}) {
  const addReactionEmoji = useAddPostReactionEmojiMutation();
  const requireAuth = useRequireAuth();

  const allReactions = getPostEmojiReactions(post);
  const reactions = allReactions.slice(0, MAX_REACTIONS);
  if (reactions.length === 0) {
    return null;
  }

  if (reactions.length > 3) {
    return (
      <div className={cn("flex flex-row gap-1.5", className)}>
        <HoverCard>
          <HoverCardTrigger asChild>
            <Button
              size="sm"
              variant="outline"
              className={cn(
                "px-2 bg-transparent gap-1",
                reactions.length > 5 && "gap-0 max-md:text-xs",
              )}
            >
              {reactions.map((emoji) =>
                emoji.url ? (
                  <img
                    key={emoji.token}
                    src={emoji.url}
                    alt={emoji.token}
                    className={cn(
                      "size-4 object-contain",
                      reactions.length > 5 && "max-md:size-3",
                    )}
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
      {reactions.map((emoji) => (
        <Button
          key={emoji.token}
          size="sm"
          variant="outline"
          className="px-2 bg-transparent"
          onClick={() => {
            requireAuth().then(() =>
              addReactionEmoji.mutate({
                postApId: post.apId,
                postId: post.id,
                emoji: emoji.token,
                score: getPostMyVote(post) || undefined,
              }),
            );
          }}
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

export function PostVoting({
  post,
  className,
  variant = "outline",
}: {
  post: Schemas.Post;
  className?: string;
  variant?: "outline" | "ghost";
}) {
  const id = useId();
  const apId = post.apId;

  const voting = usePostVoting(post);

  if (!voting) {
    return null;
  }

  const {
    displayScore,
    displayUpvotes,
    displayDownvotes,
    isUpvoted,
    isDownvoted,
    enableDownvotes,
    scoreDisplay,
    vote,
    postId,
  } = voting;

  const abbrvScore = abbriviateNumberParts(displayScore);
  const abbrvUpvotes = abbriviateNumberParts(displayUpvotes);
  const abbrvDownvotes = abbriviateNumberParts(-displayDownvotes);

  // Heart mode — server has disabled downvotes.
  // Show count for score/upvotes modes; downvotes-only mode shows nothing
  // since the server doesn't support them.
  if (!enableDownvotes) {
    const showCount = scoreDisplay === "score" || scoreDisplay === "upvotes";
    return (
      <Button
        size={!showCount ? "icon" : "sm"}
        variant={variant}
        onClick={() =>
          vote({
            score: isUpvoted ? 0 : 1,
            postApId: apId,
            postId,
          })
        }
        className={cn(
          "text-md bg-transparent font-normal",
          isUpvoted && "text-brand hover:text-brand",
          className,
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
  const downvoteId = `${id}-down`;

  const abbrv = isDownvoteSide
    ? abbrvDownvotes
    : scoreDisplay === "upvotes"
      ? abbrvUpvotes
      : abbrvScore;
  const tooltipText = isDownvoteSide
    ? `${displayDownvotes} downvotes`
    : scoreDisplay === "upvotes"
      ? `${displayUpvotes} upvotes`
      : `${displayUpvotes} upvotes, ${displayDownvotes} downvotes`;

  const scoreNode = scoreDisplay !== "none" && (
    <Tooltip>
      <TooltipTrigger aria-label={tooltipText}>
        <label htmlFor={isDownvoteSide ? downvoteId : id}>
          <NumberFlow
            className={cn(
              "-mx-px cursor-pointer text-md",
              isDownvoteSide
                ? isDownvoted && "text-brand-secondary"
                : cn(
                    isUpvoted && "text-brand",
                    isDownvoted && "text-brand-secondary",
                  ),
            )}
            suffix={abbrv.suffix}
            value={abbrv.number}
          />
        </label>
      </TooltipTrigger>
      <TooltipContent>{tooltipText}</TooltipContent>
    </Tooltip>
  );

  return (
    <div
      data-theme-component={ThemeComponent.Button}
      data-variant={variant}
      className={cn(
        "flex flex-row items-center border-1 rounded-full",
        variant === "ghost" && "border-transparent",
        className,
      )}
    >
      <Button
        id={id}
        size="icon"
        variant="ghost"
        onClick={() =>
          vote({
            score: isUpvoted ? 0 : 1,
            postApId: apId,
            postId,
          })
        }
        className={cn(
          "hover:text-brand hover:bg-brand/10",
          "flex items-center space-x-1 text-left",
          isUpvoted && "text-brand",
        )}
      >
        {isUpvoted ? (
          <PiArrowFatUpFill className="scale-115" aria-label="remove upvote" />
        ) : (
          <PiArrowFatUpBold className="scale-115" aria-label="upvote" />
        )}
      </Button>

      {/* Separator left of score — only in downvotes mode */}
      {isDownvoteSide && <Separator orientation="vertical" className="h-4" />}

      {scoreNode}

      {/* Separator right of score — only in upvotes mode */}
      {scoreDisplay === "upvotes" && (
        <Separator orientation="vertical" className="h-4" />
      )}

      <Button
        id={downvoteId}
        size="icon"
        variant="ghost"
        onClick={() =>
          vote({
            score: isDownvoted ? 0 : -1,
            postApId: apId,
            postId,
          })
        }
        className={cn(
          "hover:text-brand-secondary hover:bg-brand-secondary/10",
          isDownvoted && "text-brand-secondary",
        )}
      >
        {isDownvoted ? (
          <PiArrowFatDownFill
            className="scale-115"
            aria-label="remove downvote"
          />
        ) : (
          <PiArrowFatDownBold className="scale-115" aria-label="downvote" />
        )}
      </Button>
    </div>
  );
}

export function PostCommentsButton({
  post,
  onClick,
  className,
  variant = "outline",
}: {
  post: Schemas.Post;
  onClick?: () => void;
  className?: string;
  variant?: "outline" | "ghost";
}): React.ReactNode {
  const linkCtx = useLinkContext();
  if (!onClick) {
    return (
      <Button
        size="sm"
        variant={variant}
        className={cn("text-md font-normal bg-transparent", className)}
        asChild
      >
        <Link
          to={`${linkCtx.root}posts/:post`}
          params={{
            post: encodeApId(post.apId),
          }}
        >
          <TbMessageCircle className="scale-115" />
          {abbriviateNumber(post.commentsCount)}
          <span className="sr-only">comments</span>
        </Link>
      </Button>
    );
  }
  return (
    <Button
      size="sm"
      variant="outline"
      onClick={onClick}
      className={cn("text-md font-normal bg-transparent", className)}
    >
      <TbMessageCirclePlus className="scale-115" />
      {post.commentsCount}
      <span className="sr-only">comments</span>
    </Button>
  );
}

function usePostShareActions({
  post,
}: {
  post: Schemas.Post;
}): ActionMenuProps<string>["actions"] {
  const embed = getPostEmbed(post);

  const linkCtx = useLinkContext();

  const shareActions = useShareActions("post", {
    type: "post",
    id: post.id,
    apId: post.apId,
    route: resolveRoute(`${linkCtx.root}posts/:post`, {
      post: encodeApId(post.apId),
    }),
    body: post.body,
  });

  const thumbnailUrl = embed.thumbnail;

  return [
    ...(shareActions[0]?.actions ?? []),
    ...(thumbnailUrl && embed.type === "image"
      ? [
          {
            text: "Share image",
            onClick: () => shareImage(post.title, thumbnailUrl),
          },
        ]
      : []),
    ...(thumbnailUrl && embed.type === "image"
      ? [
          {
            text: "Download image",
            onClick: () => downloadImage(post.title, thumbnailUrl),
          },
        ]
      : []),
  ];
}

export function PostShareButton({
  post,
  className,
}: {
  post: Schemas.Post;
  className?: string;
}): React.ReactNode {
  const actions = usePostShareActions({ post });

  return (
    <ActionMenu
      align="start"
      header="Share"
      actions={actions}
      trigger={
        <Button
          size="sm"
          variant="outline"
          className={cn("text-md font-normal bg-transparent", className)}
          asChild
        >
          <div>
            <Share className="scale-110" />
            <span className="max-md:hidden">Share</span>
          </div>
        </Button>
      }
    />
  );
}

export function ImageShareButton({
  imageSrc,
  className,
}: {
  imageSrc?: string;
  className?: string;
}): React.ReactNode {
  const actions = useImageShareActions({ imageSrc });
  return (
    <ActionMenu
      align="start"
      header="Share"
      actions={actions}
      trigger={
        <Button
          size="sm"
          variant="outline"
          className={cn("text-md font-normal", className)}
          asChild
        >
          <div>
            <Share className="scale-110" />
            Share
          </div>
        </Button>
      }
    />
  );
}
