import { useBlockCommunity, useCommunity } from "@/src/lib/api/index";
import dayjs from "dayjs";
import localizedFormat from "dayjs/plugin/localizedFormat";
import { MarkdownRenderer } from "../markdown/renderer";
import { CommunityJoinButton } from "./community-join-button";
import { useLinkContext } from "../../routing/link-context";
import { useCommunitiesStore } from "@/src/stores/communities";
import { LuCakeSlice } from "react-icons/lu";
import { Link, resolveRoute } from "@/src/routing/index";
import { useAuth } from "@/src/stores/auth";
import { IoEllipsisHorizontal } from "react-icons/io5";
import { ActionMenu, ActionMenuProps } from "../adaptable/action-menu";
import { openUrl } from "@/src/lib/linking";
import { useMemo, useState } from "react";
import { useCommunityCreatePost } from "./community-create-post";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/src/components/ui/avatar";
import { PersonCard } from "../person/person-card";
import { copyRouteToClipboard, shareRoute } from "@/src/lib/share";
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
  const getCachePrefixer = useAuth((s) => s.getCachePrefixer);
  const data = useCommunitiesStore(
    (s) => s.communities[getCachePrefixer()(communityName)]?.data,
  );
  const communityView = data?.communityView;

  const [openSignal, setOpenSignal] = useState(0);
  const actions = useCommunityActions({
    communityName,
    communityView,
    actorId,
    openSignal,
  });

  const createdAt = (
    <div className="flex items-center gap-1.5 text-sm h-5 text-muted-foreground">
      <LuCakeSlice />
      {data ? (
        <span>Created {dayjs(data.communityView.createdAt).format("ll")}</span>
      ) : (
        <Skeleton className="h-5 flex-1 max-w-32" />
      )}
    </div>
  );

  return (
    <div>
      <div
        className={cn(
          "flex flex-col gap-3.5 pt-1.5 pb-2 flex-1 px-3.5",
          !expanded && "md:hidden",
        )}
      >
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
            onOpen={() => setOpenSignal((s) => s + 1)}
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

      {expanded && (
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
  openSignal,
}: {
  actorId?: string | null;
  communityName: string;
  communityView?: Schemas.Community;
  openSignal: number;
}): ActionMenuProps["actions"] {
  const getConfirmation = useConfirmationAlert();
  const blockCommunity = useBlockCommunity();

  const isLoggedIn = useAuth((s) => s.isLoggedIn());
  const linkCtx = useLinkContext();

  const createPost = useCommunityCreatePost({
    communityName,
  });

  return useMemo(() => {
    const route = resolveRoute(`${linkCtx.root}c/:communityName`, {
      communityName,
    });
    return [
      ...(route
        ? [
            {
              text: "Share",
              actions: [
                {
                  text: "Share link to community",
                  onClick: () => shareRoute(route),
                },
                {
                  text: "Copy link to community",
                  onClick: () => copyRouteToClipboard(route),
                },
              ],
            },
          ]
        : []),
      ...(isLoggedIn
        ? [
            {
              text: "Create post",
              onClick: createPost,
            },
          ]
        : []),
      ...(actorId
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
              text: "Block community",
              danger: true,
              onClick: () =>
                getConfirmation({
                  message: `Block ${communityName}`,
                }).then(() =>
                  blockCommunity.mutate({
                    communityId: communityView?.id,
                    block: true,
                  }),
                ),
            },
          ]
        : []),
    ];
  }, [openSignal]);
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

  const aboutOpen = useSidebarStore((s) => s.communityAboutExpanded);
  const setAboutOpen = useSidebarStore((s) => s.setCommunityAboutExpanded);

  const modsOpen = useSidebarStore((s) => s.communityModsExpanded);
  const setModsOpen = useSidebarStore((s) => s.setCommunityModsExpanded);

  const [openSignal, setOpenSignal] = useState(0);

  const actions = useCommunityActions({
    communityName,
    communityView: data?.communityView,
    actorId,
    openSignal,
  });

  if (!data) {
    return null;
  }

  const communityView = data.communityView;

  return (
    <Sidebar>
      <SidebarContent>
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
              onOpen={() => setOpenSignal((s) => s + 1)}
            />
          </div>

          <span className="font-bold line-clamp-1">{communityView.slug}</span>

          <div className="flex items-center gap-1.5 text-sm text-zinc-500 dark:text-zinc-400">
            <LuCakeSlice />
            <span>Created {dayjs(communityView.createdAt).format("ll")}</span>
          </div>
        </div>

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

        <Separator />

        <Collapsible className="p-4" open={modsOpen} onOpenChange={setModsOpen}>
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
      </SidebarContent>
    </Sidebar>
  );
}
