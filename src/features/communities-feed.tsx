import {
  useAvailableSorts,
  useListCommunities,
  useModeratingCommunities,
  useSubscribedCommunities,
} from "@/src/lib/api/index";
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
      type: listingType,
      sort: communitySort,
    },
    {
      enabled: listingType !== "ModeratorView" && listingType !== "Subscribed",
    },
  );

  const { communities, noItems } = useMemo(() => {
    if (listingType === "Subscribed") {
      return {
        communities: subscribedCommunities,
        noItems: subscribedCommunities.length === 0,
      };
    }

    if (listingType === "ModeratorView") {
      return {
        communities: moderatesCommunities,
        noItems: moderatesCommunities.length === 0,
      };
    }

    const communities = communitiesQuery.data?.pages
      .map((p) => p.communities)
      .flat();
    const noItems =
      communities?.length === 0 &&
      !communitiesQuery.isRefetching &&
      !communitiesQuery.isPending;

    return {
      communities,
      noItems,
    };
  }, [
    listingType,
    moderatesCommunities,
    subscribedCommunities,
    communitiesQuery.isRefetching,
    communitiesQuery.isPending,
    communitiesQuery.data?.pages,
  ]);

  let numCols = 1;
  if (media.xl && !noItems) {
    numCols = 3;
  } else if (media.sm && !noItems) {
    numCols = 2;
  }

  const vlist = (
    <VirtualList<string>
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

        return <MemoedListItem communitySlug={item} />;
      }}
      onEndReached={() => {
        if (
          listingType !== "ModeratorView" &&
          listingType !== "Subscribed" &&
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
