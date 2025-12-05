import { useBlockCommunity, useCommunity } from "@/src/lib/api/index";
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
import { useAuth, useIsCommunityBlocked } from "@/src/stores/auth";
import { IoEllipsisHorizontal } from "react-icons/io5";
import { ActionMenu, ActionMenuProps } from "../adaptable/action-menu";
import { openUrl } from "@/src/lib/linking";
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
          <div className="max-md:-mx-3.5">
            <img src={banner} className="aspect-[4] object-cover w-full" />
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
          <ActionMenu
            header="Community"
            align="end"
            actions={actions}
            trigger={
              <IoEllipsisHorizontal
                className="text-muted-foreground"
                aria-label="Community actions"
              />
            }
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
          </section>
        </>
      )}
    </div>
  );
}

function useCommunityActions({
  actorId,
  communityName,
  communityView,
}: {
  actorId?: string | null;
  communityName: string;
  communityView?: Schemas.Community;
}): ActionMenuProps["actions"] {
  const getConfirmation = useConfirmationAlert();
  const blockCommunity = useBlockCommunity({ communitySlug: communityName });
  const isBlocked = useIsCommunityBlocked(communityName);

  const isLoggedIn = useAuth((s) => s.isLoggedIn());
  const linkCtx = useLinkContext();

  const createPost = useCommunityCreatePost({
    communityName,
  });

  const route = resolveRoute(`${linkCtx.root}c/:communityName`, {
    communityName,
  });

  const shareActions = useShareActions("community", route);

  return [
    ...(!isBlocked ? shareActions : []),
    ...(isLoggedIn && !isBlocked
      ? [
          {
            text: "Create post",
            onClick: createPost,
          },
        ]
      : []),
    ...(actorId && !isBlocked
      ? [
          {
            text: "View source",
            onClick: async () => {
              try {
                openUrl(actorId);
              } catch {
                // TODO: handle error
              }
            },
          },
        ]
      : []),
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
  ];
}

export function CommunitySidebar({
  communityName,
  actorId,
  hideDescription = false,
}: {
  communityName: string;
  actorId: string | undefined;
  hideDescription?: boolean;
  asPage?: boolean;
}) {
  useCommunity({
    name: communityName,
  });

  const getCachePrefixer = useAuth((s) => s.getCachePrefixer);
  const data = useCommunitiesStore(
    (s) => s.communities[getCachePrefixer()(communityName)]?.data,
  );
  const isBlocked = useIsCommunityBlocked(communityName);

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
    <Sidebar>
      <SidebarContent className="relative">
        <EasterEggBox seed={communityName}>
          <div className="p-4 flex flex-col gap-3">
            <div className="flex flex-row items-start justify-between flex-1">
              <Avatar className="h-13 w-13">
                <AvatarImage
                  src={communityView.icon ?? undefined}
                  className="object-cover"
                />
                <AvatarFallback className="text-xl">
                  {communityName.substring(0, 1).toUpperCase()}
                </AvatarFallback>
              </Avatar>

              <ActionMenu
                header="Community"
                align="end"
                actions={actions}
                trigger={
                  <IoEllipsisHorizontal className="text-muted-foreground mt-0.5" />
                }
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
                      "users / 6 months":
                        communityView?.usersActiveHalfYearCount,
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
                </CollapsibleContent>
              </Collapsible>
            </>
          )}
        </EasterEggBox>
      </SidebarContent>
    </Sidebar>
  );
}
