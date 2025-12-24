import { useLikeComment } from "@/src/lib/api/index";
import { voteHaptics } from "@/src/lib/voting";
import { useRequireAuth } from "../auth-context";
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
import { Schemas } from "@/src/lib/api/adapters/api-blueprint";
import _ from "lodash";
import { getAccountSite, useAuth } from "@/src/stores/auth";
import { Tooltip, TooltipTrigger, TooltipContent } from "../ui/tooltip";
import { useDoubleTap } from "use-double-tap";
import { useMedia } from "@/src/lib/hooks";
import { useSettingsStore } from "@/src/stores/settings";
import { NumberFlow } from "../number-flow";

type Vote = {
  postId: number;
  id: number;
  score: number;
  path: string;
};

function usePostVoting() {
  const requireAuth = useRequireAuth();
  const vote = useLikeComment();
  return (config: Vote) => {
    requireAuth().then(() => {
      voteHaptics(config.score);
      vote.mutate(config);
    });
  };
}

export function useDoubleTapLike(config?: Vote) {
  const media = useMedia();
  const vote = usePostVoting();
  return useDoubleTap(() => {
    if (config && media.maxMd) {
      vote(config);
    }
  });
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
  const enableDownvotes =
    useAuth(
      (s) => getAccountSite(s.getSelectedAccount())?.enableCommentDownvotes,
    ) ?? true;

  const id = useId();

  const vote = usePostVoting();

  const myVote = commentView?.optimisticMyVote ?? commentView?.myVote ?? 0;

  const isUpvoted = myVote > 0;
  const isDownvoted = myVote < 0;

  const diff = _.isNumber(commentView?.optimisticMyVote)
    ? commentView?.optimisticMyVote - (commentView?.myVote ?? 0)
    : 0;

  const score = commentView.upvotes - commentView.downvotes + diff;

  const abbriviatedScore = abbriviateNumberParts(score);

  if (!enableDownvotes) {
    return (
      <Button
        size="sm"
        variant="ghost"
        onClick={async () => {
          const newVote = isUpvoted ? 0 : 1;
          vote({
            postId: commentView.postId,
            id: commentView.id,
            score: newVote,
            path: commentView.path,
          });
        }}
        className={cn(
          "text-md font-normal -mr-2",
          isUpvoted && "text-brand",
          fixRightAlignment && "-mr-2",
        )}
      >
        {isUpvoted ? <FaHeart /> : <FaRegHeart />}
        {abbriviateNumber(score)}
      </Button>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-row items-center",
        fixRightAlignment && "-mr-2",
        className,
      )}
    >
      <Button
        id={id}
        size="icon"
        variant="ghost"
        onClick={async () => {
          const newVote = isUpvoted ? 0 : 1;
          vote({
            postId: commentView.postId,
            id: commentView.id,
            score: newVote,
            path: commentView.path,
          });
        }}
        className={cn(
          "hover:text-brand hover:bg-brand/10",
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
      <Tooltip>
        <TooltipTrigger aria-label={`${score} score`}>
          <label htmlFor={id}>
            <NumberFlow
              className={cn(
                "-mx-0.5 cursor-pointer",
                isUpvoted && "text-brand",
                isDownvoted && "text-brand-secondary",
              )}
              suffix={abbriviatedScore.suffix}
              value={abbriviatedScore.number}
            />
          </label>
        </TooltipTrigger>
        <TooltipContent>
          {commentView.upvotes} upvotes, {commentView.downvotes} downvotes
        </TooltipContent>
      </Tooltip>
      <Button
        size="icon"
        variant="ghost"
        onClick={async () => {
          const newVote = isDownvoted ? 0 : -1;
          vote({
            postId: commentView.postId,
            id: commentView.id,
            score: newVote,
            path: commentView.path,
          });
        }}
        className={cn(
          "hover:text-brand-secondary hover:bg-brand-secondary/10",
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
