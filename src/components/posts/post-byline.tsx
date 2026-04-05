import { useLinkContext } from "@/src/hooks/navigation-hooks";
import { useRequireAuth } from "../auth-context";
import { useShowPostReportModal } from "./post-report";
import { useAuth, getAccountActorId, useIsAdmin } from "@/src/stores/auth";
import { useShouldBlurNsfw } from "@/src/hooks/nsfw";
import { useNsfwRevealedPostsStore } from "@/src/stores/nsfw-revealed-posts";
import { COMMUNITY_NSFW_ICON_BLUR_CLASS } from "@/src/components/communities/utils";
import { Link, resolveRoute } from "@/src/routing/index";
import { RelativeTime } from "../relative-time";
import { ActionMenuProps, EllipsisActionMenu } from "../adaptable/action-menu";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/src/components/ui/avatar";
import { BsFillPinAngleFill } from "react-icons/bs";
import { useIonRouter } from "@ionic/react";
import { encodeApId } from "@/src/api/utils";
import { CommunityHoverCard } from "../communities/community-hover-card";
import { PersonHoverCard } from "../person/person-hover-card";
import { postToDraft, useCreatePostStore } from "@/src/stores/create-post";
import { cn } from "@/src/lib/utils";
import { Schemas } from "@/src/api-blueprint";
import { useProfileFromStore } from "@/src/stores/profiles";
import { useCommunityFromStore } from "@/src/stores/communities";
import { CakeDay } from "../cake-day";
import { useCommunityActions } from "@/src/components/communities/community-sidebar";
import { useTagUserStore } from "@/src/stores/user-tags";
import { Badge } from "../ui/badge";
import { useFlairs } from "@/src/stores/flairs";
import { useShowPostRemoveModal } from "./post-remove";
import { PostCreatorBadge } from "./post-creator-badge";
import { Bookmark, Lock } from "../icons";
import {
  useDeletePost,
  useFeaturePost,
  useLockPost,
  useSavePost,
  useAddPostReactionEmoji,
} from "@/src/api/post-mutations";
import { ABOVE_LINK_OVERLAY } from "./config";
import { useSoftware } from "@/src/api/index";
import { getPostMyVote, getPostSaved } from "@/src/lib/api";
import { useInputAlert } from "@/src/hooks/index";
import { QUICK_REACTION_EMOJIS } from "@/src/components/comments/post-comment";
import { usePersonActions } from "../person/person-action-menu";
import { useShareActions } from "@/src/components/adaptable/action-menu/hooks";

export function usePostActions({
  post,
  canMod,
}: {
  post: Schemas.Post;
  canMod?: boolean;
}): ActionMenuProps["actions"] {
  const showReportModal = useShowPostReportModal();
  const requireAuth = useRequireAuth();
  const deletePost = useDeletePost();
  const featurePost = useFeaturePost();
  const lockPost = useLockPost();
  const showPostRemoveModal = useShowPostRemoveModal();
  const savePost = useSavePost();
  const addReactionEmoji = useAddPostReactionEmoji();
  const inputAlert = useInputAlert();
  const { software } = useSoftware();

  const router = useIonRouter();
  const updateDraft = useCreatePostStore((s) => s.updateDraft);

  const myUserId = useAuth((s) => getAccountActorId(s.getSelectedAccount()));
  const isMyPost = post.creatorApId === myUserId;
  const community = useCommunityFromStore(post.communitySlug);
  const communityActions = useCommunityActions({
    actorId: community?.communityView.apId ?? null,
    communityName: post.communitySlug,
    communityView: community?.communityView,
  });

  const author = useProfileFromStore(post.creatorApId);
  const authorActions = usePersonActions({
    person: author,
    personLabel: "author",
  });

  const linkCtx = useLinkContext();
  const shareActions = useShareActions(
    "post",
    post
      ? {
          type: "post",
          id: post.id,
          apId: post.apId,
          communitySlug: post.communitySlug,
          route: resolveRoute(`${linkCtx.root}c/:communityName/posts/:post`, {
            communityName: post.communitySlug,
            post: encodeApId(post.apId),
          }),
        }
      : null,
  );

  const encodedApId = encodeApId(post.apId);

  const saved = getPostSaved(post);

  const flairs = useFlairs(post.flairs?.map((f) => f.id));

  const locked = post.optimisticLocked ?? post.locked;

  return [
    ...(canMod
      ? [
          {
            text: "Moderation",
            actions: [
              {
                text: post.featuredCommunity
                  ? "Unfeature in community"
                  : "Feature in community",
                onClick: () =>
                  featurePost.mutate({
                    featureType: "Community",
                    postId: post.id,
                    featured: !post.featuredCommunity,
                    postApId: post.apId,
                  }),
              },
              {
                text: post.removed ? "Restore post" : "Remove post",
                onClick: () => showPostRemoveModal(post.apId),
              },
              {
                text: locked ? "Unlock post" : "Lock post",
                onClick: () =>
                  lockPost.mutate({
                    postId: post.id,
                    locked: !locked,
                    postApId: post.apId,
                  }),
              },
            ],
          },
        ]
      : []),
    {
      text: saved ? "Unsave post" : "Save post",
      onClick: () =>
        requireAuth().then(() => {
          savePost.mutateAsync({
            postApId: post.apId,
            postId: post.id,
            save: !saved,
          });
        }),
    },
    ...shareActions,
    ...(software === "piefed"
      ? [
          {
            text: "React",
            actions: [
              ...QUICK_REACTION_EMOJIS.map((emoji) => ({
                text: emoji,
                onClick: () =>
                  requireAuth().then(() =>
                    addReactionEmoji.mutate({
                      postApId: post.apId,
                      postId: post.id,
                      emoji,
                      score: getPostMyVote(post) || undefined,
                    }),
                  ),
              })),
              {
                text: "Other...",
                onClick: async () => {
                  try {
                    await requireAuth();
                    const emoji = await inputAlert({
                      header: "React with emoji",
                      placeholder: "Enter an emoji",
                    });
                    addReactionEmoji.mutate({
                      postApId: post.apId,
                      postId: post.id,
                      emoji,
                    });
                  } catch {}
                },
              },
            ],
          },
        ]
      : []),
    ...(isMyPost
      ? [
          {
            text: "Edit post",
            onClick: () => {
              if (post) {
                updateDraft(post.apId, postToDraft(post, flairs));
                router.push(resolveRoute("/create_post", `?id=${encodedApId}`));
              }
            },
          },
          {
            text: post.deleted ? "Restore post" : "Delete post",
            onClick: () =>
              deletePost.mutate({
                postApId: post.apId,
                postId: post.id,
                deleted: !post.deleted,
              }),
            danger: true,
          },
        ]
      : []),
    ...(!isMyPost && !canMod
      ? [
          {
            text: "Report post",
            onClick: () =>
              requireAuth().then(() => {
                showReportModal(post.apId);
              }),
            danger: true,
          },
        ]
      : []),
    "DIVIDER",
    ...(!isMyPost
      ? [
          {
            text: "Author",
            actions: authorActions,
          },
        ]
      : []),
    ...(communityActions.length > 0
      ? [
          {
            text: "Community",
            actions: communityActions,
          },
        ]
      : []),
  ];
}

export function PostActionButtion({
  post,
  canMod = false,
}: {
  post: Schemas.Post;
  canMod?: boolean;
}) {
  const actions = usePostActions({ post, canMod });
  return (
    <EllipsisActionMenu
      header="Post"
      align="end"
      actions={actions}
      fixRightAlignment
      buttonClassName={ABOVE_LINK_OVERLAY}
      aria-label="Post actions"
    />
  );
}

export function PostByline({
  post,
  pinned,
  showCommunity,
  showCreator,
  isMod = false,
  canMod = false,
  showActions = true,
  hideImage,
  className,
  detailView,
}: {
  post: Schemas.Post;
  pinned: boolean;
  showCommunity?: boolean;
  showCreator?: boolean;
  isMod?: boolean;
  canMod?: boolean;
  showActions?: boolean;
  hideImage?: boolean;
  className?: string;
  detailView?: boolean;
}) {
  const linkCtx = useLinkContext();

  const tag = useTagUserStore((s) => s.userTags[post.creatorSlug]);

  const creator = useProfileFromStore(post.creatorApId);
  const community = useCommunityFromStore(post.communitySlug);
  const blurNsfw = useShouldBlurNsfw();
  const isRevealed = useNsfwRevealedPostsStore(
    (s) => !!(detailView && s.isRevealed(post.apId)),
  );

  const isAdmin = useIsAdmin(post.creatorApId);

  const encodedCreatorApId = encodeApId(post.creatorApId);

  const saved = getPostSaved(post);
  const locked = post.optimisticLocked ?? post.locked;

  const [communityName, communityHost] = post.communitySlug.split("@");
  const [creatorName, creatorHost] = post.creatorSlug.split("@");

  const communityPart = (
    <>
      <span className="font-medium text-foreground">c/{communityName}</span>
      <i>@{communityHost}</i>
    </>
  );

  return (
    <div
      className={cn(
        "flex flex-row items-center gap-2 h-7",
        showCommunity && showCreator && "h-9",
        className,
      )}
    >
      {!hideImage && (
        <Avatar
          className={cn(
            "h-6 w-6 text-sm",
            showCommunity && showCreator && "h-8 w-8 text-md",
          )}
          aria-hidden
        >
          <AvatarImage
            src={community?.communityView.icon ?? undefined}
            className={cn(
              "object-cover",
              community?.communityView.nsfw &&
                blurNsfw &&
                !isRevealed &&
                COMMUNITY_NSFW_ICON_BLUR_CLASS,
            )}
          />
          <AvatarFallback>
            {communityName?.substring(0, 1).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      )}

      <div className="flex flex-col text-muted-foreground min-w-0 relative">
        {showCommunity && (
          <div className="text-xs flex flex-row">
            <CommunityHoverCard communityName={post.communitySlug}>
              {communityName ? (
                <Link
                  to={`${linkCtx.root}c/:communityName`}
                  params={{
                    communityName: post.communitySlug,
                  }}
                  className={cn(
                    "hover:underline block truncate",
                    ABOVE_LINK_OVERLAY,
                  )}
                >
                  {communityPart}
                </Link>
              ) : (
                <div className="truncate">{communityPart}</div>
              )}
            </CommunityHoverCard>
            <RelativeTime time={post.createdAt} className="ml-2" />
          </div>
        )}
        {showCreator && (
          <div
            className={cn(
              "flex flex-row text-xs text-muted-foreground gap-2 items-center h-5 relative",
              !showCommunity && "text-foreground",
            )}
          >
            <PersonHoverCard actorId={post.creatorApId} asChild>
              <Link
                to={`${linkCtx.root}u/:userId`}
                params={{
                  userId: encodedCreatorApId,
                }}
                className={cn(
                  "hover:underline min-w-0 truncate",
                  ABOVE_LINK_OVERLAY,
                )}
              >
                <span className="sr-only">u/</span>
                {creatorName}
                {tag ? (
                  <Badge size="sm" variant="brand-secondary" className="ml-2">
                    {tag}
                  </Badge>
                ) : (
                  <i className="text-muted-foreground">@{creatorHost}</i>
                )}
              </Link>
            </PersonHoverCard>
            <PostCreatorBadge
              isMod={isMod}
              isAdmin={isAdmin}
              isBanned={post.isBannedFromCommunity || creator?.isBanned}
              isDeleted={creator?.deleted}
              isBot={creator?.isBot}
            />
            {creator && !creator.deleted && !creator.isBanned && (
              <CakeDay
                date={creator.createdAt}
                className="text-brand"
                isNewAccount={isAdmin ? false : undefined}
              />
            )}
            {!showCommunity && (
              <RelativeTime
                time={post.createdAt}
                className="text-muted-foreground"
              />
            )}
          </div>
        )}
      </div>

      <div className="flex-1" />

      {post.nsfw && (
        <Badge
          variant="brand-secondary"
          size="sm"
          className={ABOVE_LINK_OVERLAY}
        >
          NSFW
        </Badge>
      )}
      {saved && (
        <Bookmark className={cn("text-lg text-brand", ABOVE_LINK_OVERLAY)} />
      )}
      {pinned && (
        <BsFillPinAngleFill
          className={cn("text-xl text-[#17B169]", ABOVE_LINK_OVERLAY)}
        />
      )}
      {locked && (
        <Lock className={cn("text-xl text-yellow-500", ABOVE_LINK_OVERLAY)} />
      )}

      {showActions && <PostActionButtion post={post} canMod={canMod} />}
    </div>
  );
}
