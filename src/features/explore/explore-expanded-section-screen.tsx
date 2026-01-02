import {
  useListCommunities,
  useModeratingCommunities,
  useSubscribedCommunities,
} from "@/src/lib/api/index";
import { useListFeeds } from "@/src/lib/api/index";
import {
  CommunityCard,
  CommunityCardSkeleton,
} from "../../components/communities/community-card";
import { useMemo } from "react";
import { useFiltersStore } from "@/src/stores/filters";
import { ContentGutters } from "@/src/components/gutters";
import { useMedia } from "../../lib/hooks";
import { IonContent, IonHeader, IonPage, IonToolbar } from "@ionic/react";
import { MenuButton, UserDropdown } from "../../components/nav";
import { CommunityFilter } from "../../components/lemmy-sort";
import { PageTitle } from "../../components/page-title";
import { Link, useParams } from "@/src/routing/index";
import { Search } from "../../components/icons";
import { ToolbarButtons } from "../../components/toolbar/toolbar-buttons";
import { Schemas } from "../../lib/api/adapters/api-blueprint";
import _ from "lodash";
import { VirtualList } from "../../components/virtual-list";
import { FeedCard, FEEDS } from "./feed-card";
import { SortControlBar, SortControlBarContent } from "./sort-bar";

const NO_ITEMS = "NO_ITEMS";

export function ExpandedCommunities({ sort }: { sort?: string }) {
  const listingType = useFiltersStore((s) => s.communitiesListingType);

  const media = useMedia();

  const moderatesCommunities = useModeratingCommunities();
  const subscribedCommunities = useSubscribedCommunities();

  const feeds = useListFeeds(
    {
      type: listingType === "ModeratorView" ? undefined : listingType,
    },
    {
      enabled: sort === FEEDS,
    },
  );
  const feedsData = useMemo(
    () => feeds.data?.pages.flatMap((p) => p.feeds),
    [feeds.data?.pages],
  );

  const communitiesQuery = useListCommunities(
    {
      type: listingType,
      sort,
    },
    {
      enabled: listingType !== "ModeratorView" && sort !== FEEDS,
    },
  );

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
      key={listingType}
      fullscreen
      scrollHost
      numColumns={numCols}
      data={noItems ? [NO_ITEMS] : sort === FEEDS ? feedsData : communities}
      renderItem={({ item }) => {
        if (item === NO_ITEMS) {
          return (
            <div className="flex-1 italic text-muted-foreground p-6 text-center">
              <span>Nothing to see here</span>
            </div>
          );
        }

        if (_.isString(item)) {
          return (
            <ContentGutters className="md:contents">
              <CommunityCard communitySlug={item} className="mt-1" />
            </ContentGutters>
          );
        }

        return (
          <ContentGutters className="md:contents">
            <FeedCard {...item} className="mt-1" expand={false} />
          </ContentGutters>
        );
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

  return media.md ? (
    <div className="flex flex-col h-full">
      {listingType !== "Subscribed" && listingType !== "ModeratorView" && (
        <ContentGutters noMobilePadding className="max-md:hidden">
          <SortControlBar selectedSort={sort} />
        </ContentGutters>
      )}
      <ContentGutters className="flex-1 min-h-0">{vlist}</ContentGutters>
    </div>
  ) : (
    vlist
  );
}

export default function ExploreExpandedSectionScreen() {
  const { sort } = useParams("/communities/sort/:sort");
  const media = useMedia();
  return (
    <IonPage>
      <PageTitle>Communities</PageTitle>
      <IonHeader>
        <IonToolbar data-tauri-drag-region>
          <ToolbarButtons side="left">
            <MenuButton />
            <CommunityFilter />
          </ToolbarButtons>
          <ToolbarButtons side="right">
            <Link to="/communities/s" className="text-2xl contents md:hidden">
              <Search className="text-muted-foreground scale-110" />
            </Link>
            <UserDropdown />
          </ToolbarButtons>
        </IonToolbar>
        {media.maxMd && (
          <IonToolbar>
            <ToolbarButtons side="left">
              <SortControlBarContent selectedSort={sort} />
            </ToolbarButtons>
          </IonToolbar>
        )}
      </IonHeader>
      <IonContent fullscreen={media.maxMd} scrollY={false}>
        <ExpandedCommunities sort={sort} />
      </IonContent>
    </IonPage>
  );
}
