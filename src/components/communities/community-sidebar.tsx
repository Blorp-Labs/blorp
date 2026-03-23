import _ from "lodash";
import {
  useBlockCommunity,
  useBlockInstance,
  useCommunity,
} from "@/src/lib/api/index";
import dayjs from "dayjs";
import localizedFormat from "dayjs/plugin/localizedFormat";
import { MarkdownRenderer } from "../markdown/renderer";
import { CommunityJoinButton } from "./community-join-button";
import { useLinkContext } from "../../routing/link-context";
import {
  useCommunitiesStore,
  useCommunityFromStore,
} from "@/src/stores/communities";
import { LuCakeSlice } from "react-icons/lu";
import { Link, resolveRoute } from "@/src/routing/index";
import {
  useAuth,
  useIsCommunityBlocked,
  useIsInstanceBlocked,
  useShouldBlurNsfw,
} from "@/src/stores/auth";
import { useNsfwRevealedPostsStore } from "@/src/stores/nsfw-revealed-posts";
import {
  COMMUNITY_NSFW_BANNER_BLUR_CLASS,
  COMMUNITY_NSFW_ICON_BLUR_CLASS,
} from "./utils";
import { EllipsisActionMenu, SubAction } from "../adaptable/action-menu";
import { useCommunityCreatePost } from "./community-create-post";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/src/components/ui/avatar";
import { PersonCard } from "../person/person-card";
import { useShareActions } from "@/src/lib/share";
import { Sidebar, SidebarContent } from "../sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../ui/collapsible";
import { ChevronsUpDown } from "lucide-react";
import { Separator } from "../ui/separator";
import { useSidebarStore } from "@/src/stores/sidebars";
import { cn } from "@/src/lib/utils";
import { AggregateBadges } from "../aggregates";
import { useConfirmationAlert } from "@/src/lib/hooks/index";
import { Skeleton } from "../ui/skeleton";
import { Schemas } from "@/src/lib/api/adapters/api-blueprint";
import { Flair } from "../flair";
import { useFlairs } from "@/src/stores/flairs";
import { EasterEggBox } from "@/src/features/easter-eggs/EasterEggBox";
import { DateTime } from "../datetime";

dayjs.extend(localizedFormat);

export function SmallScreenSidebar({
  communityName,
  actorId,
  expanded,
}: {
  communityName: string;
  actorId?: string | null;
  expanded?: boolean;
}) {
  const linkCtx = useLinkContext();

  useCommunity({
    name: communityName,
  });
  const community = useCommunityFromStore(communityName);
  const flairs = useFlairs(community?.flairs?.map((f) => f.id));
  const getCachePrefixer = useAuth((s) => s.getCachePrefixer);
  const data = useCommunitiesStore(
    (s) => s.communities[getCachePrefixer()(communityName)]?.data,
  );
  const communityView = data?.communityView;
  const isBlocked = useIsCommunityBlocked(communityName);
  const blurNsfw = useShouldBlurNsfw();

  const actions = useCommunityActions({
    communityName,
    communityView,
    actorId,
  });

  const createdAt = (
    <div className="flex items-center gap-1.5 text-sm h-5 text-muted-foreground">
      <LuCakeSlice />
      {data ? (
        <span>
          Created <DateTime date={dayjs(data.communityView.createdAt)} />
        </span>
      ) : (
        <Skeleton className="h-5 flex-1 max-w-32" />
      )}
    </div>
  );

  const banner = data?.communityView.banner;

  return (
    <div>
      <div
        className={cn(
          "flex flex-col gap-3.5 pb-2 flex-1 px-3.5",
          !expanded && "md:hidden pt-1.5",
        )}
      >
        {expanded && banner && (
          <div className="max-md:-mx-3.5 overflow-hidden">
            <img
              src={banner}
              className={cn(
                "aspect-[4] object-cover w-full",
                communityView?.nsfw &&
                  blurNsfw &&
                  COMMUNITY_NSFW_BANNER_BLUR_CLASS,
              )}
            />
          </div>
        )}

        <AggregateBadges
          aggregates={{
            ...(expanded
              ? {
                  "users / day": communityView?.usersActiveDayCount,
                  "users / week": communityView?.usersActiveWeekCount,
                  "users / month": communityView?.usersActiveMonthCount,
                  "users / 6 months": communityView?.usersActiveHalfYearCount,
                  "Local subscribers": communityView?.subscribersLocalCount,
                }
              : {}),
            Subscribers: communityView?.subscriberCount,
            Posts: communityView?.postCount,
            Comments: communityView?.commentCount,
          }}
        />

        {!expanded && createdAt}

        <div
          className={cn(
            "flex flex-row items-center flex-1 gap-5",
            !expanded && "-mt-1.5",
          )}
        >
          {expanded ? (
            createdAt
          ) : (
            <Link
              to={`${linkCtx.root}c/:communityName/sidebar`}
              params={{
                communityName,
              }}
              className="text-brand"
            >
              Show more
            </Link>
          )}
          <div className="flex-1" />
          <EllipsisActionMenu
            header="Community"
            align="end"
            actions={actions}
            aria-label="Community actions"
          />

          <CommunityJoinButton communityName={communityName} />
        </div>
      </div>

      <Separator
        className={cn(
          "data-[orientation=horizontal]:h-[0.5px]",
          !expanded && "md:hidden",
        )}
      />

      {expanded && !isBlocked && (
        <>
          <section className="p-3">
            <h2>ABOUT</h2>
            {communityView?.description && (
              <MarkdownRenderer
                markdown={communityView.description}
                dim
                className="pt-3"
              />
            )}
          </section>

          <Separator />

          {flairs && flairs.length > 0 && (
            <section className="p-3">
              <h2>ABOUT</h2>
              <div className="flex flex-wrap gap-1.5 mt-2 mb-1">
                {flairs?.map((flair) => <Flair key={flair.id} flair={flair} />)}
              </div>
            </section>
          )}

          <Separator />

          <section className="p-3 flex flex-col gap-2">
            <h2>MODS</h2>
            {data?.mods?.map((m) => (
              <PersonCard key={m.apId} actorId={m.apId} size="sm" />
            ))}
            <Link
              to={`${linkCtx.root}c/:communityName/modlog`}
              params={{ communityName }}
              className="text-brand text-sm mt-1"
            >
              Modlog
            </Link>
          </section>
        </>
      )}
    </div>
  );
}

export function useCommunityActions({
  actorId,
  communityName,
  communityView,
}: {
  actorId?: string | null;
  communityName: string;
  communityView?: Schemas.Community;
}): SubAction[] {
  const getConfirmation = useConfirmationAlert();
  const blockCommunity = useBlockCommunity({ communitySlug: communityName });
  const blockInstance = useBlockInstance();
  const isBlocked = useIsCommunityBlocked(communityName);
  const communityInstanceId = communityView?.instanceId;
  const communityApId = communityView?.apId;
  const isInstanceBlocked = useIsInstanceBlocked(communityInstanceId);

  const isLoggedIn = useAuth((s) => s.isLoggedIn());
  const linkCtx = useLinkContext();

  const createPost = useCommunityCreatePost({
    communityName,
  });

  const route = resolveRoute(`${linkCtx.root}c/:communityName`, {
    communityName,
  });

  const shareActions = useShareActions(
    "community",
    actorId
      ? {
          type: "community",
          apId: actorId,
          slug: communityName,
          route,
        }
      : null,
  );

  return [
    ...(isLoggedIn && !isBlocked
      ? [
          {
            text: "Create post",
            onClick: createPost,
          },
        ]
      : []),
    ...(!isBlocked ? shareActions : []),
    ...(isLoggedIn && communityView
      ? [
          {
            text: isBlocked ? "Unblock community" : "Block community",
            danger: true,
            onClick: () =>
              getConfirmation({
                message: `${isBlocked ? "Unblock" : "Block"} ${communityName}`,
              }).then(() =>
                blockCommunity.mutate({
                  communityId: communityView?.id,
                  block: !isBlocked,
                }),
              ),
          },
        ]
      : []),
    ...(isLoggedIn && _.isNumber(communityInstanceId) && communityApId
      ? [
          {
            text: isInstanceBlocked ? "Unblock instance" : "Block instance",
            danger: true,
            onClick: () => {
              const domain = new URL(communityApId).hostname;
              getConfirmation({
                message: `${isInstanceBlocked ? "Unblock" : "Block"} ${domain}`,
              }).then(() =>
                blockInstance.mutate({
                  instanceId: communityInstanceId,
                  block: !isInstanceBlocked,
                }),
              );
            },
          },
        ]
      : []),
  ];
}

function CommunitySidebarInner({
  communityName,
  actorId,
  hideDescription = false,
  postApId,
}: {
  communityName: string;
  actorId: string | undefined;
  hideDescription?: boolean;
  asPage?: boolean;
  postApId?: string;
}) {
  useCommunity({
    name: communityName,
  });

  const linkCtx = useLinkContext();
  const getCachePrefixer = useAuth((s) => s.getCachePrefixer);
  const data = useCommunitiesStore(
    (s) => s.communities[getCachePrefixer()(communityName)]?.data,
  );
  const isBlocked = useIsCommunityBlocked(communityName);
  const blurNsfw = useShouldBlurNsfw();
  const isPostRevealed = useNsfwRevealedPostsStore(
    (s) => !!(postApId && s.isRevealed(postApId)),
  );

  const flairs = useFlairs(data?.flairs?.map((f) => f.id));

  const aboutOpen = useSidebarStore((s) => s.communityAboutExpanded);
  const setAboutOpen = useSidebarStore((s) => s.setCommunityAboutExpanded);

  const flairsOpen = useSidebarStore((s) => s.communityFlairsExpanded);
  const setFlairsOpen = useSidebarStore((s) => s.setCommunityFlairsExpanded);

  const modsOpen = useSidebarStore((s) => s.communityModsExpanded);
  const setModsOpen = useSidebarStore((s) => s.setCommunityModsExpanded);

  const actions = useCommunityActions({
    communityName,
    communityView: data?.communityView,
    actorId,
  });

  if (!data) {
    return null;
  }

  const communityView = data.communityView;

  return (
    <SidebarContent className="relative">
      <EasterEggBox seed={communityName}>
        <div className="p-4 flex flex-col gap-3">
          <div className="flex flex-row items-start justify-between flex-1">
            <Avatar className="h-13 w-13">
              <AvatarImage
                src={communityView.icon ?? undefined}
                className={cn(
                  "object-cover",
                  communityView.nsfw &&
                    blurNsfw &&
                    !isPostRevealed &&
                    COMMUNITY_NSFW_ICON_BLUR_CLASS,
                )}
              />
              <AvatarFallback className="text-xl">
                {communityName.substring(0, 1).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <EllipsisActionMenu
              header="Community"
              align="end"
              actions={actions}
            />
          </div>

          <span className="font-bold line-clamp-1">{communityView.slug}</span>

          <div className="flex items-center gap-1.5 text-sm text-zinc-500 dark:text-zinc-400">
            <LuCakeSlice />
            <span>
              Created <DateTime date={dayjs(data.communityView.createdAt)} />
            </span>
          </div>
        </div>

        {!isBlocked && (
          <>
            <Separator />
            <Collapsible
              className="p-4"
              open={aboutOpen}
              onOpenChange={setAboutOpen}
            >
              <CollapsibleTrigger className="uppercase text-xs font-medium text-muted-foreground flex items-center justify-between w-full">
                <span>ABOUT</span>
                <ChevronsUpDown className="h-4 w-4" />
              </CollapsibleTrigger>
              <CollapsibleContent className="py-1">
                {communityView.description && !hideDescription && (
                  <MarkdownRenderer
                    markdown={communityView.description}
                    dim
                    className="py-3"
                  />
                )}

                <AggregateBadges
                  className="mt-2"
                  aggregates={{
                    "users / day": communityView?.usersActiveDayCount,
                    "users / week": communityView?.usersActiveWeekCount,
                    "users / month": communityView?.usersActiveMonthCount,
                    "users / 6 months": communityView?.usersActiveHalfYearCount,
                    "Local subscribers": communityView?.subscribersLocalCount,
                    Subscribers: communityView?.subscriberCount,
                    Posts: communityView?.postCount,
                    Comments: communityView?.commentCount,
                  }}
                />
              </CollapsibleContent>
            </Collapsible>

            {flairs && flairs.length > 0 && (
              <>
                <Separator />

                <Collapsible
                  className="p-4"
                  open={flairsOpen}
                  onOpenChange={setFlairsOpen}
                >
                  <CollapsibleTrigger className="uppercase text-xs font-medium text-muted-foreground flex items-center justify-between w-full">
                    <span>FLAIRS</span>
                    <ChevronsUpDown className="h-4 w-4" />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pb-1 pt-3">
                    <div className="flex flex-wrap gap-1.5">
                      {flairs?.map((flair) => (
                        <Flair key={flair.id} flair={flair} />
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </>
            )}

            <Separator />
            <Collapsible
              className="p-4"
              open={modsOpen}
              onOpenChange={setModsOpen}
            >
              <CollapsibleTrigger className="uppercase text-xs font-medium text-muted-foreground flex items-center justify-between w-full">
                <span>MODS</span>
                <ChevronsUpDown className="h-4 w-4" />
              </CollapsibleTrigger>

              <CollapsibleContent className="flex flex-col gap-2 pt-3">
                {data.mods?.map((m) => (
                  <PersonCard key={m.apId} actorId={m.apId} size="sm" />
                ))}
                <Link
                  to={`${linkCtx.root}c/:communityName/modlog`}
                  params={{ communityName }}
                  className="text-brand text-sm mt-1"
                >
                  Modlog
                </Link>
              </CollapsibleContent>
            </Collapsible>
          </>
        )}
      </EasterEggBox>
    </SidebarContent>
  );
}

export function CommunitySidebar(
  props: Parameters<typeof CommunitySidebarInner>[0],
) {
  return (
    <Sidebar>
      <CommunitySidebarInner {...props} />
    </Sidebar>
  );
}
