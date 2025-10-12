import { useListCommunities } from "@/src/lib/api/index";
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
import { Link } from "@/src/routing/index";
import { getAccountSite, useAuth } from "../stores/auth";
import { Search } from "../components/icons";
import { ToolbarButtons } from "../components/toolbar/toolbar-buttons";
import { SearchBar } from "./search/search-bar";

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

  const communitySort = useFiltersStore((s) => s.communitySort);
  const listingType = useFiltersStore((s) => s.communitiesListingType);

  const media = useMedia();

  const moderates = useAuth((s) =>
    getAccountSite(s.getSelectedAccount()),
  )?.moderates;
  const moderatesCommunities = moderates ?? undefined;

  const {
    data,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    // isRefetching,
    refetch,
  } = useListCommunities({
    sort: communitySort,
    type: listingType,
  });

  const communities = useMemo(
    () => data?.pages.map((p) => p.communities).flat(),
    [data?.pages],
  );

  let numCols = 1;
  if (media.xl) {
    numCols = 3;
  } else if (media.sm) {
    numCols = 2;
  }

  const vlist = (
    <VirtualList<string>
      key={communitySort + listingType}
      fullscreen
      scrollHost
      numColumns={numCols}
      data={
        listingType === "ModeratorView" ? moderatesCommunities : communities
      }
      renderItem={({ item }) => <MemoedListItem communitySlug={item} />}
      onEndReached={() => {
        if (
          listingType !== "ModeratorView" &&
          hasNextPage &&
          !isFetchingNextPage
        ) {
          fetchNextPage();
        }
      }}
      estimatedItemSize={52}
      refresh={refetch}
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
              router.push(`/communities/s?q=${newVal ?? search}`);
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
