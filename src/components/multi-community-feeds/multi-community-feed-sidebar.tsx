import dayjs from "dayjs";
import localizedFormat from "dayjs/plugin/localizedFormat";
import { MarkdownRenderer } from "../markdown/renderer";
import { useLinkContext } from "../../routing/link-context";
import { LuCakeSlice } from "react-icons/lu";
import { Link, resolveRoute } from "@/src/routing/index";
import { IoEllipsisHorizontal } from "react-icons/io5";
import { ActionMenu, ActionMenuProps } from "../adaptable/action-menu";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/src/components/ui/avatar";
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
import { Skeleton } from "../ui/skeleton";
import { EasterEggBox } from "@/src/features/easter-eggs/EasterEggBox";
import { DateTime } from "../datetime";
import { useMultiCommunityFeedFromStore } from "@/src/stores/multi-community-feeds";
import { CommunityCard } from "../communities/community-card";
import { encodeApId } from "@/src/lib/api/utils";

dayjs.extend(localizedFormat);

export function SmallScreenSidebar({
  apId,
  expanded,
}: {
  apId: string;
  expanded?: boolean;
}) {
  const linkCtx = useLinkContext();

  const feed = useMultiCommunityFeedFromStore(apId);

  const actions = useCommunityActions({
    apId,
  });

  const createdAt = (
    <div className="flex items-center gap-1.5 text-sm h-5 text-muted-foreground">
      <LuCakeSlice />
      {feed ? (
        <span>
          Created <DateTime date={dayjs(feed.createdAt)} />
        </span>
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
            Subscribers: feed?.subscriberCount,
            Communities: feed?.communityCount,
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
              to={`${linkCtx.root}f/:apId/sidebar`}
              params={{
                apId: encodeApId(apId),
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
            {feed?.description && (
              <MarkdownRenderer
                markdown={feed.description}
                dim
                className="pt-3"
              />
            )}
          </section>

          <Separator />

          <section className="p-3 flex flex-col gap-2">
            <h2>Communities</h2>
            {feed?.communitySlugs?.map((slug) => (
              <CommunityCard key={slug} communitySlug={slug} size="sm" />
            ))}
          </section>
        </>
      )}
    </div>
  );
}

function useCommunityActions({
  apId,
}: {
  apId: string;
}): ActionMenuProps["actions"] {
  const linkCtx = useLinkContext();
  const route = resolveRoute(`${linkCtx.root}f/:apId`, {
    apId,
  });
  const shareActions = useShareActions("community", route);
  return [...shareActions];
}

export function FeedSidebar({
  apId,
  hideDescription = false,
}: {
  apId: string;
  hideDescription?: boolean;
  asPage?: boolean;
}) {
  // useCommunity({
  //   name: communityName,
  // });

  const feed = useMultiCommunityFeedFromStore(apId);

  const aboutOpen = useSidebarStore((s) => s.communityAboutExpanded);
  const setAboutOpen = useSidebarStore((s) => s.setCommunityAboutExpanded);

  const flairsOpen = useSidebarStore((s) => s.communityFlairsExpanded);
  const setFlairsOpen = useSidebarStore((s) => s.setCommunityFlairsExpanded);

  const modsOpen = useSidebarStore((s) => s.communityModsExpanded);
  const setModsOpen = useSidebarStore((s) => s.setCommunityModsExpanded);

  const actions = useCommunityActions({
    apId,
  });

  if (!feed) {
    return null;
  }

  return (
    <Sidebar>
      <SidebarContent className="relative">
        <EasterEggBox seed={feed.name}>
          <div className="p-4 flex flex-col gap-3">
            <div className="flex flex-row items-start justify-between flex-1">
              <Avatar className="h-13 w-13">
                <AvatarImage
                  src={feed.icon ?? undefined}
                  className="object-cover"
                />
                <AvatarFallback className="text-xl">
                  {feed.name.substring(0, 1).toUpperCase()}
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

            <span className="font-bold line-clamp-1">{feed.slug}</span>

            <div className="flex items-center gap-1.5 text-sm text-zinc-500 dark:text-zinc-400">
              <LuCakeSlice />
              <span>
                Created <DateTime date={dayjs(feed.createdAt)} />
              </span>
            </div>
          </div>

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
                {feed.description && !hideDescription && (
                  <MarkdownRenderer
                    markdown={feed.description}
                    dim
                    className="py-3"
                  />
                )}

                <AggregateBadges
                  className="mt-2"
                  aggregates={{
                    Subscribers: feed?.subscriberCount,
                    Communities: feed?.communityCount,
                  }}
                />
              </CollapsibleContent>
            </Collapsible>

            <Separator />
            <Collapsible
              className="p-4"
              open={modsOpen}
              onOpenChange={setModsOpen}
            >
              <CollapsibleTrigger className="uppercase text-xs font-medium text-muted-foreground flex items-center justify-between w-full">
                <span>Communities</span>
                <ChevronsUpDown className="h-4 w-4" />
              </CollapsibleTrigger>

              <CollapsibleContent className="flex flex-col gap-2 pt-3">
                {feed.communitySlugs?.map((slug) => (
                  <CommunityCard key={slug} communitySlug={slug} size="sm" />
                ))}
              </CollapsibleContent>
            </Collapsible>
          </>
        </EasterEggBox>
      </SidebarContent>
    </Sidebar>
  );
}
