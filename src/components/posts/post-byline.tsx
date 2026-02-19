import { useBlockPerson } from "@/src/lib/api/index";
import { useLinkContext } from "../../routing/link-context";
import { useRequireAuth } from "../auth-context";
import { useShowPostReportModal } from "./post-report";
import {
  useAuth,
  getAccountActorId,
  useIsPersonBlocked,
  useIsAdmin,
} from "@/src/stores/auth";
import { openUrl } from "@/src/lib/linking";
import { Link, resolveRoute } from "@/src/routing/index";
import { RelativeTime } from "../relative-time";
import { ActionMenuProps, EllipsisActionMenu } from "../adaptable/action-menu";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/src/components/ui/avatar";
import { BsFillPinAngleFill } from "react-icons/bs";
import { useIonAlert, useIonRouter } from "@ionic/react";
import { Deferred } from "@/src/lib/deferred";
import { encodeApId } from "@/src/lib/api/utils";
import { CommunityHoverCard } from "../communities/community-hover-card";
import { PersonHoverCard } from "../person/person-hover-card";
import { FaBookmark } from "react-icons/fa";
import { postToDraft, useCreatePostStore } from "@/src/stores/create-post";
import { cn } from "@/src/lib/utils";
import { Schemas } from "@/src/lib/api/adapters/api-blueprint";
import { useProfileFromStore } from "@/src/stores/profiles";
import { useCommunitiesStore } from "@/src/stores/communities";
import { CakeDay } from "../cake-day";
import { useTagUser, useTagUserStore } from "@/src/stores/user-tags";
import { Badge } from "../ui/badge";
import { useFlairs } from "@/src/stores/flairs";
import { useShowPostRemoveModal } from "./post-remove";
import { PostCreatorBadge } from "./post-creator-badge";
import { Lock } from "../icons";
import {
  useDeletePost,
  useFeaturePost,
  useLockPost,
  useSavePost,
} from "@/src/lib/api/post-mutations";
import { ABOVE_LINK_OVERLAY } from "./config";

export function usePostActions({
  post,
  canMod,
  tag,
}: {
  post: Schemas.Post;
  canMod?: boolean;
  tag?: string;
}): ActionMenuProps["actions"] {
  const [alrt] = useIonAlert();

  const showReportModal = useShowPostReportModal();
  const requireAuth = useRequireAuth();
  const blockPerson = useBlockPerson();
  const deletePost = useDeletePost();
  const featurePost = useFeaturePost();
  const lockPost = useLockPost();
  const showPostRemoveModal = useShowPostRemoveModal();
  const savePost = useSavePost();

  const router = useIonRouter();
  const updateDraft = useCreatePostStore((s) => s.updateDraft);

  const myUserId = useAuth((s) => getAccountActorId(s.getSelectedAccount()));
  const isMyPost = post.creatorApId === myUserId;
  const isCreatorBlocked = useIsPersonBlocked(post.creatorApId);

  const encodedApId = encodeApId(post.apId);
  const tagUser = useTagUser();

  const saved = post.optimisticSaved ?? post.saved;

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
    ...(!isMyPost
      ? [
          {
            text: "Author",
            actions: [
              {
                text: "Tag author",
                onClick: async () => {
                  tagUser(post.creatorSlug, tag);
                },
              },
              {
                text: isCreatorBlocked ? "Unblock author" : "Block author",
                onClick: async () => {
                  try {
                    await requireAuth();
                    const deferred = new Deferred();
                    alrt({
                      message: `${isCreatorBlocked ? "Unblock" : "Block"} ${post.creatorSlug}`,
                      buttons: [
                        {
                          text: "Cancel",
                          role: "cancel",
                          handler: () => deferred.reject(),
                        },
                        {
                          text: "OK",
                          role: "confirm",
                          handler: () => deferred.resolve(),
                        },
                      ],
                    });
                    await deferred.promise;
                    blockPerson.mutate({
                      personId: post.creatorId,
                      block: !isCreatorBlocked,
                    });
                  } catch {}
                },
                danger: true,
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
    {
      text: "View post source",
      onClick: async () => {
        try {
          openUrl(post.apId);
        } catch {
          // TODO: handle error
        }
      },
    },
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
  ];
}

export function PostActionButtion({
  post,
  canMod = false,
}: {
  post: Schemas.Post;
  canMod?: boolean;
}) {
  const tag = useTagUserStore((s) => s.userTags[post.creatorSlug]);
  const actions = usePostActions({ post, canMod, tag });
  return (
    <EllipsisActionMenu
      header="Post"
      align="end"
      actions={actions}
      fixRightAlignment
      buttonClassName={ABOVE_LINK_OVERLAY}
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
}) {
  const linkCtx = useLinkContext();

  const tag = useTagUserStore((s) => s.userTags[post.creatorSlug]);

  const getCachePrefixer = useAuth((s) => s.getCachePrefixer);
  const creator = useProfileFromStore(post.creatorApId);
  const community = useCommunitiesStore(
    (s) => s.communities[getCachePrefixer()(post.communitySlug)]?.data,
  );

  const isAdmin = useIsAdmin(post.creatorApId);

  const encodedCreatorApId = encodeApId(post.creatorApId);

  const saved = post.optimisticSaved ?? post.saved;
  const locked = post.optimisticLocked ?? post.locked;

  const [communityName, communityHost] = post.communitySlug.split("@");
  const [creatorName, creatorHost] = post.creatorSlug.split("@");

  const communityPart = (
    <>
      <span className="font-medium text-foreground">c/{communityName}</span>
      <i>@{communityHost}</i>
      <RelativeTime time={post.createdAt} className="ml-2" />
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
            className="object-cover"
          />
          <AvatarFallback>
            {communityName?.substring(0, 1).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      )}

      <div className="flex flex-col text-muted-foreground">
        {showCommunity && (
          <CommunityHoverCard communityName={post.communitySlug}>
            {communityName ? (
              <Link
                to={`${linkCtx.root}c/:communityName`}
                params={{
                  communityName: post.communitySlug,
                }}
                className={cn("text-xs hover:underline", ABOVE_LINK_OVERLAY)}
              >
                {communityPart}
              </Link>
            ) : (
              <div className="text-xs">{communityPart}</div>
            )}
          </CommunityHoverCard>
        )}
        {showCreator && (
          <div
            className={cn(
              "flex flex-row text-xs text-muted-foreground gap-2 items-center h-5",
              !showCommunity && "text-foreground",
            )}
          >
            <PersonHoverCard actorId={post.creatorApId} asChild>
              <Link
                to={`${linkCtx.root}u/:userId`}
                params={{
                  userId: encodedCreatorApId,
                }}
                className={cn("hover:underline", ABOVE_LINK_OVERLAY)}
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

      {saved && <FaBookmark className="text-lg text-brand" />}
      {pinned && <BsFillPinAngleFill className="text-xl text-[#17B169]" />}
      {locked && <Lock className="text-xl text-yellow-500" />}

      {showActions && <PostActionButtion post={post} canMod={canMod} />}
    </div>
  );
}
