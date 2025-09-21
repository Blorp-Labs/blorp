import { useLikePost } from "@/src/lib/api/index";
import { voteHaptics } from "@/src/lib/voting";
import { useRequireAuth } from "../auth-context";
import NumberFlow from "@number-flow/react";

import { Link, resolveRoute } from "@/src/routing/index";

import {
  PiArrowFatUpBold,
  PiArrowFatDownBold,
  PiArrowFatDownFill,
  PiArrowFatUpFill,
} from "react-icons/pi";
import { TbMessageCircle, TbMessageCirclePlus } from "react-icons/tb";
import { cn } from "@/src/lib/utils";
import { Button } from "../ui/button";
import { useCallback, useId } from "react";
import { abbriviateNumber, abbriviateNumberParts } from "@/src/lib/format";
import { useLinkContext } from "../../routing/link-context";
import { getAccountSite, useAuth } from "@/src/stores/auth";
import { FaHeart, FaRegHeart } from "react-icons/fa6";
import { Share } from "../icons";
import { usePostsStore } from "@/src/stores/posts";
import { shareImage, useShareActions, downloadImage } from "@/src/lib/share";
import { ActionMenu, ActionMenuProps } from "../adaptable/action-menu";
import { encodeApId } from "@/src/lib/api/utils";
import { getPostEmbed } from "@/src/lib/post";
import { isWeb } from "@/src/lib/device";
import { Tooltip, TooltipTrigger, TooltipContent } from "../ui/tooltip";
import { useDoubleTap } from "use-double-tap";
import { Schemas } from "@/src/lib/api/adapters/api-blueprint";
import { useMedia } from "@/src/lib/hooks";

export function usePostVoting(apId?: string) {
  const getCachePrefixer = useAuth((s) => s.getCachePrefixer);
  const postView = usePostsStore((s) =>
    apId ? s.posts[getCachePrefixer()(apId)]?.data : null,
  );

  const enableDownvotes =
    useAuth(
      (s) => getAccountSite(s.getSelectedAccount())?.enablePostDownvotes,
    ) ?? true;

  const { mutate: mutateVote } = useLikePost(apId);

  const requireAuth = useRequireAuth();

  const vote = useCallback(
    (form: { postApId: string; postId: number; score: -1 | 0 | 1 }) => {
      requireAuth().then(() => {
        voteHaptics(form.score);
        mutateVote(form);
      });
    },
    [requireAuth, mutateVote],
  );

  if (!postView) return null;

  const diff =
    typeof postView?.optimisticMyVote === "number"
      ? postView.optimisticMyVote - (postView.myVote ?? 0)
      : 0;
  const score = postView.upvotes - postView.downvotes + diff;

  const myVote = postView.optimisticMyVote ?? postView.myVote ?? 0;
  const isUpvoted = myVote > 0;
  const isDownvoted = myVote < 0;

  return {
    score,
    upvotes: postView.upvotes,
    downvotes: postView.downvotes,
    isUpvoted,
    isDownvoted,
    vote,
    enableDownvotes,
    postId: postView.id,
  };
}

export function useDoubleTapPostLike(config?: {
  postApId: string;
  postId: number;
  score: -1 | 0 | 1;
}) {
  const media = useMedia();
  const voting = usePostVoting(config?.postApId);
  return useDoubleTap(() => {
    if (config && media.maxMd) {
      voting?.vote(config);
    }
  });
}

export function PostVoting({
  apId,
  className,
}: {
  apId: string;
  className?: string;
}) {
  const id = useId();

  const voting = usePostVoting(apId);

  if (!voting) {
    return null;
  }

  const { score, isUpvoted, isDownvoted, enableDownvotes, vote, postId } =
    voting;

  const abbriviatedScore = abbriviateNumberParts(score);

  if (!enableDownvotes) {
    return (
      <Button
        size="sm"
        variant="outline"
        onClick={() =>
          vote({
            score: isUpvoted ? 0 : 1,
            postApId: apId,
            postId,
          })
        }
        className={cn("text-md font-normal", isUpvoted && "text-brand")}
      >
        {isUpvoted ? <FaHeart /> : <FaRegHeart />}
        {abbriviateNumber(score)}
      </Button>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-row items-center border-1 rounded-full",
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
      <Tooltip>
        <TooltipTrigger aria-label={`${score} score`}>
          <NumberFlow
            //htmlFor={id}
            className={cn(
              "-mx-px cursor-pointer text-md",
              isUpvoted && "text-brand",
              isDownvoted && "text-brand-secondary",
            )}
            suffix={abbriviatedScore.suffix}
            value={abbriviatedScore.number}
          />
        </TooltipTrigger>
        <TooltipContent>
          {voting.upvotes} upvotes, {voting.downvotes} downvotes
        </TooltipContent>
      </Tooltip>
      <Button
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
  postApId,
  onClick,
  className,
}: {
  postApId: string;
  onClick?: () => void;
  className?: string;
}): React.ReactNode {
  const getCachePrefixer = useAuth((s) => s.getCachePrefixer);
  const postView = usePostsStore(
    (s) => s.posts[getCachePrefixer()(postApId)]?.data,
  );

  const linkCtx = useLinkContext();
  if (!onClick && postView?.communitySlug && postApId) {
    return (
      <Button
        size="sm"
        variant="outline"
        className={cn("text-md font-normal", className)}
        asChild
      >
        <Link
          to={`${linkCtx.root}c/:communityName/posts/:post`}
          params={{
            communityName: postView.communitySlug,
            post: encodeApId(postApId),
          }}
        >
          <TbMessageCircle className="scale-115" />
          {abbriviateNumber(postView.commentsCount)}
          <span className="sr-only">comments</span>
        </Link>
      </Button>
    );
  }
  if (onClick) {
    return (
      <Button
        size="sm"
        variant="outline"
        onClick={onClick}
        className={cn("text-md font-normal", className)}
      >
        <TbMessageCirclePlus className="scale-115" />
        {postView?.commentsCount}
        <span className="sr-only">comments</span>
      </Button>
    );
  }
  return null;
}

function usePostShareActions({
  post,
}: {
  post?: Schemas.Post;
}): ActionMenuProps<string>["actions"] {
  const embed = post ? getPostEmbed(post) : null;

  const linkCtx = useLinkContext();

  const shareActions = useShareActions(
    "post",
    post
      ? resolveRoute(`${linkCtx.root}c/:communityName/posts/:post`, {
          communityName: post.communitySlug,
          post: encodeApId(post.apId),
        })
      : null,
  );

  const thumbnailUrl = embed?.thumbnail;

  return [
    ...(shareActions[0]?.actions ?? []),
    ...(post && thumbnailUrl && embed.type === "image" && !isWeb()
      ? [
          {
            text: "Share image",
            onClick: () => shareImage(post.title, thumbnailUrl),
          },
        ]
      : []),
    ...(post && thumbnailUrl && embed.type === "image" && !isWeb()
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
  postApId,
  className,
}: {
  postApId: string;
  className?: string;
}): React.ReactNode {
  const getCachePrefixer = useAuth((s) => s.getCachePrefixer);
  const post = usePostsStore(
    (s) => s.posts[getCachePrefixer()(postApId)]?.data,
  );

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
