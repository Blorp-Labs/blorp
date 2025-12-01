import {
  useAvailableSorts,
  useListCommunities,
  useModeratingCommunities,
  useSubscribedCommunities,
} from "@/src/lib/api/index";
import { useListFeeds } from "@/src/lib/api/index";
import {
  CommunityCard,
  CommunityCardSkeleton,
} from "../components/communities/community-card";
import { memo, useMemo, useState } from "react";
import { useFiltersStore } from "@/src/stores/filters";
import { ContentGutters } from "@/src/components/gutters";
import { VirtualList } from "@/src/components/virtual-list";
import { useMedia } from "../lib/hooks";
import {
  IonContent,
  IonHeader,
  IonPage,
  IonToolbar,
  useIonRouter,
} from "@ionic/react";
import { MenuButton, UserDropdown } from "../components/nav";
import { CommunityFilter, CommunitySortSelect } from "../components/lemmy-sort";
import { PageTitle } from "../components/page-title";
import { Link, resolveRoute } from "@/src/routing/index";
import { Search } from "../components/icons";
import { ToolbarButtons } from "../components/toolbar/toolbar-buttons";
import { SearchBar } from "./search/search-bar";
import { Schemas } from "../lib/api/adapters/api-blueprint";
import _ from "lodash";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { cn } from "../lib/utils";
import { abbriviateNumber } from "../lib/format";
import { useLinkContext } from "../routing/link-context";

function FeedCard({ icon, name, communityCount, slug, id }: Schemas.Feed) {
  const ctx = useLinkContext();
  const host = slug?.split("@")?.[1];
  return (
    <ContentGutters className="md:contents">
      <Link
        className="mt-1 flex flex-row gap-2 items-center flex-shrink-0 h-12 max-w-full text-foreground"
        to={`${ctx.root}f/:apId`}
        params={{
          apId: String(id),
        }}
      >
        <Avatar className="h-9 w-9">
          <AvatarImage
            src={icon ?? undefined}
            className="object-cover absolute inset-0"
          />
          <AvatarFallback>{name.substring(0, 1)}</AvatarFallback>
        </Avatar>

        <div
          className={cn(
            "flex flex-col gap-0.5 flex-1 overflow-hidden text-left",
          )}
        >
          <span className={cn("text-sm overflow-hidden overflow-ellipsis")}>
            {name}
            <span className="text-muted-foreground italic">@{host}</span>
          </span>
          {_.isNumber(communityCount) && (
            <span className="text-xs text-muted-foreground">
              {abbriviateNumber(communityCount)} communities
            </span>
          )}
        </div>
      </Link>
    </ContentGutters>
  );
}

const NO_ITEMS = "NO_ITEMS";

const MemoedListItem = memo(function ListItem(props: {
  communitySlug: string;
}) {
  return (
    <ContentGutters className="md:contents">
      <CommunityCard communitySlug={props.communitySlug} className="mt-1" />
    </ContentGutters>
  );
});

export default function Communities() {
  const router = useIonRouter();
  const [search, setSearch] = useState("");

  const { communitySort } = useAvailableSorts();
  const listingType = useFiltersStore((s) => s.communitiesListingType);

  const media = useMedia();

  const moderatesCommunities = useModeratingCommunities();
  const subscribedCommunities = useSubscribedCommunities();

  const communitiesQuery = useListCommunities(
    {
      sort: communitySort,
      type: listingType === "All Feeds" ? undefined : listingType,
    },
    {
      enabled: listingType !== "All Feeds",
    },
  );

  const feeds = useListFeeds({
    enabled: listingType === "All Feeds",
  });

  // const [communities, feedsData] = useMemo(
  //   () =>
  //     [
  //       data?.pages.map((p) => p.communities).flat(),
  //       feeds.data?.pages.flatMap((p) => p.feeds),
  //     ] as const,
  //   [data?.pages, feeds.data?.pages],
  // );

  const { communities } = useMemo(() => {
    const communities = communitiesQuery.data?.pages
      .map((p) => p.communities)
      .flat();

    if (listingType === "Subscribed") {
      return {
        communities: !communities?.length ? subscribedCommunities : communities,
      };
    }

    if (listingType === "ModeratorView") {
      return {
        communities: moderatesCommunities,
      };
    }

    return {
      communities,
    };
  }, [
    listingType,
    moderatesCommunities,
    subscribedCommunities,
    communitiesQuery.data,
  ]);

  const noItems =
    communities?.length === 0 &&
    !communitiesQuery.isRefetching &&
    !communitiesQuery.isPending;

  let numCols = 1;
  if (media.xl && !noItems) {
    numCols = 3;
  } else if (media.sm && !noItems) {
    numCols = 2;
  }

  const vlist = (
    <VirtualList<string | Schemas.Feed>
      key={communitySort + listingType}
      fullscreen
      scrollHost
      numColumns={numCols}
      data={noItems ? [NO_ITEMS] : communities}
      renderItem={({ item }) => {
        if (item === NO_ITEMS) {
          return (
            <div className="flex-1 italic text-muted-foreground p-6 text-center">
              <span>Nothing to see here</span>
            </div>
          );
        }

        if (_.isString(item)) {
          return <MemoedListItem communitySlug={item} />;
        }

        return <FeedCard {...item} />;
      }}
      onEndReached={() => {
        if (
          listingType !== "ModeratorView" &&
          communitiesQuery.hasNextPage &&
          !communitiesQuery.isFetchingNextPage
        ) {
          communitiesQuery.fetchNextPage();
        }
      }}
      estimatedItemSize={52}
      refresh={communitiesQuery.refetch}
      placeholder={
        <ContentGutters className="md:contents">
          <CommunityCardSkeleton className="mt-1" />
        </ContentGutters>
      }
    />
  );

  return (
    <IonPage>
      <PageTitle>Communities</PageTitle>
      <IonHeader>
        <IonToolbar data-tauri-drag-region>
          <ToolbarButtons side="left">
            <MenuButton />
            <CommunityFilter />
          </ToolbarButtons>
          <SearchBar
            value={search}
            onValueChange={setSearch}
            onSubmit={(newVal) => {
              router.push(
                resolveRoute("/communities/s", `?q=${newVal ?? search}`),
              );
            }}
            type="Communities"
            className="max-md:hidden"
          />
          <ToolbarButtons side="right">
            <Link to="/communities/s" className="text-2xl contents md:hidden">
              <Search className="text-muted-foreground scale-110" />
            </Link>
            <CommunitySortSelect />
            <UserDropdown />
          </ToolbarButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent scrollY={false} fullscreen={media.maxMd}>
        {media.md ? (
          <ContentGutters className="h-full">{vlist}</ContentGutters>
        ) : (
          vlist
        )}
      </IonContent>
    </IonPage>
  );
}
