import {
  useAvailableSorts,
  useListCommunities,
  useModeratingCommunities,
  useSoftware,
  useSubscribedCommunities,
} from "@/src/lib/api/index";
import { useListFeeds } from "@/src/lib/api/index";
import { CommunityCard } from "../components/communities/community-card";
import { useMemo, useRef, useState } from "react";
import { useFiltersStore } from "@/src/stores/filters";
import { ContentGutters } from "@/src/components/gutters";
import { useElementHasFocus, useMedia } from "../lib/hooks";
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
import { ChevronLeft, ChevronRight, Search } from "../components/icons";
import { ToolbarButtons } from "../components/toolbar/toolbar-buttons";
import { SearchBar } from "./search/search-bar";
import { Schemas } from "../lib/api/adapters/api-blueprint";
import _ from "lodash";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { cn } from "../lib/utils";
import { abbriviateNumber } from "../lib/format";
import { useLinkContext } from "../routing/link-context";
import { Swiper, SwiperRef, SwiperSlide } from "swiper/react";
import { Mousewheel, Virtual } from "swiper/modules";
import "swiper/css";
import "swiper/css/virtual";
import {
  useCommunitiesFromStore,
  useCommunityFromStore,
} from "../stores/communities";
import { CommunityHoverCard } from "../components/communities/community-hover-card";
import { Button } from "../components/ui/button";
import { Skeleton } from "../components/ui/skeleton";
import { removeMd } from "../components/markdown/remove-md";

function useNumCols() {
  const media = useMedia();
  if (media.md) {
    return 3;
  } else if (media.sm) {
    return 2;
  }
  return 1.05;
}

function SectionSkeleton() {
  const numCols = useNumCols();

  return (
    <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-2">
      {Array.from({ length: _.toInteger(numCols) * 3 })
        .fill(0)
        .map((_i, index) => (
          <div
            key={index}
            className="border py-3 px-2 rounded-lg h-24 flex flex-col gap-2"
          >
            <div className="flex flex-row gap-2">
              <Skeleton className="h-8 w-8 rounded-full" />
              <Skeleton className="h-8 flex-1 rounded-md" />
            </div>
            <Skeleton className="w-full flex-1 rounded-md" />
          </div>
        ))}
    </div>
  );
}

function CommunityItem({ communitySlug }: { communitySlug: string }) {
  const community = useCommunityFromStore(communitySlug);
  const description = community?.communityView.description;
  return (
    <div className="border py-1 px-2 rounded-lg h-24">
      <CommunityCard communitySlug={communitySlug} />
      {description && (
        <p className="text-xs line-clamp-2 text-muted-foreground">
          {removeMd(description)}
        </p>
      )}
    </div>
  );
}

function CommunitiesSwiper({
  hasMore,
  sort,
}: {
  hasMore: boolean;
  sort: string;
}) {
  const listingType = useFiltersStore((s) => s.communitiesListingType);
  const communitiesQuery = useListCommunities({
    sort,
    type: listingType,
  });
  const communities = useMemo(
    () => communitiesQuery.data?.pages.flatMap((page) => page.communities),
    [communitiesQuery.data],
  );
  const numCols = useNumCols();
  const ref = useRef<SwiperRef>(null);
  const grouped = useMemo(() => _.chunk(communities, 3), [communities]);
  const [index, setIndex] = useState(0);
  const hasPrev = index > 0;
  const hasNext = hasMore || index < grouped.length - numCols;
  const onReachEnd = () => {
    if (communitiesQuery.hasNextPage && !communitiesQuery.isFetchingNextPage) {
      communitiesQuery.fetchNextPage();
    }
  };
  return (
    <div>
      <h2
        className={cn(
          "font-bold mb-2 capitalize",
          ContentGutters.mobilePadding,
        )}
      >
        {sort.split(/(?=[A-Z])/).join(" ")} Communities
      </h2>

      {!communities?.length && communitiesQuery.isPending ? (
        <SectionSkeleton />
      ) : (
        <Swiper
          className={ContentGutters.mobilePadding}
          ref={ref}
          modules={[Mousewheel, Virtual]}
          spaceBetween={8}
          slidesPerView={numCols}
          mousewheel={{
            enabled: true,
            forceToAxis: true,
          }}
          virtual
          onReachEnd={onReachEnd}
          onActiveIndexChange={(swiper) => setIndex(swiper.activeIndex)}
        >
          {grouped?.map((group) => (
            <SwiperSlide key={group[0]} className="flex! flex-col gap-2">
              {group.map((community) => (
                <CommunityItem key={community} communitySlug={community} />
              ))}
            </SwiperSlide>
          ))}
        </Swiper>
      )}
      <div className="flex flex-row justify-center mt-3 items-center gap-2">
        <Button
          size="icon"
          variant="outline"
          onClick={() => ref.current?.swiper.slideTo(0)}
          disabled={!hasPrev}
        >
          <ChevronLeft />
        </Button>
        <Button
          size="icon"
          variant="outline"
          onClick={() =>
            ref.current?.swiper.slideTo(
              ref.current.swiper.activeIndex - numCols,
            )
          }
          disabled={!hasPrev}
        >
          <ChevronLeft />
        </Button>
        <Button variant="outline">Show more</Button>
        <Button
          size="icon"
          variant="outline"
          onClick={() =>
            ref.current?.swiper.slideTo(
              ref.current.swiper.activeIndex + numCols,
            )
          }
          disabled={!hasNext}
        >
          <ChevronRight />
        </Button>
        <Button
          size="icon"
          variant="outline"
          onClick={() => ref.current?.swiper.slideTo(grouped.length - 1)}
          disabled={!hasNext}
        >
          <ChevronRight />
        </Button>
      </div>
    </div>
  );
}

function FeedCard({
  icon,
  name,
  communityCount,
  slug,
  id,
  communitySlugs,
}: Schemas.Feed) {
  const ref = useRef<HTMLDivElement>(null);
  const hasFocus = useElementHasFocus(ref);
  const ctx = useLinkContext();
  const host = slug?.split("@")?.[1];
  const communityViews = useCommunitiesFromStore(communitySlugs);
  return (
    <div className="flex flex-col gap-2" ref={ref}>
      <Link
        className="flex flex-row gap-2 items-center flex-shrink-0 max-w-full text-foreground"
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

      <div className="flex flex-row overflow-hidden">
        {hasFocus ? (
          communityViews?.map(({ communityView }) => (
            <CommunityHoverCard
              communityName={communityView.slug}
              key={communityView.apId}
            >
              <Avatar className="h-6 w-6 border-2 border-background -mr-2">
                <AvatarImage
                  src={communityView.icon ?? undefined}
                  className="object-cover absolute inset-0"
                />
                <AvatarFallback>
                  {communityView.slug.substring(0, 1)}
                </AvatarFallback>
              </Avatar>
            </CommunityHoverCard>
          ))
        ) : (
          <Skeleton className="h-6 w-full rounded-4xl" />
        )}
      </div>
    </div>
  );
}

function FeedSwiper() {
  const feeds = useListFeeds({});

  const feedsData = useMemo(
    () => feeds.data?.pages.flatMap((p) => p.feeds),
    [feeds.data?.pages],
  );

  const numCols = useNumCols();
  const ref = useRef<SwiperRef>(null);
  const grouped = useMemo(() => _.chunk(feedsData, 3), [feedsData]);
  const [index, setIndex] = useState(0);
  const hasPrev = index > 0;
  const hasNext = feeds.hasNextPage || index < grouped.length - numCols;

  const onReachEnd = () => {
    if (feeds.hasNextPage && !feeds.isFetchingNextPage) {
      feeds.fetchNextPage();
    }
  };

  const software = useSoftware();

  if (software !== "piefed") {
    return null;
  }

  return (
    <div>
      <h2 className={cn("font-bold mb-2", ContentGutters.mobilePadding)}>
        Feeds
      </h2>

      {!feedsData?.length && feeds.isPending && <SectionSkeleton />}

      <Swiper
        className={ContentGutters.mobilePadding}
        ref={ref}
        modules={[Mousewheel, Virtual]}
        spaceBetween={8}
        slidesPerView={numCols}
        mousewheel={{
          enabled: true,
          forceToAxis: true,
        }}
        virtual
        onReachEnd={onReachEnd}
        onActiveIndexChange={(swiper) => setIndex(swiper.activeIndex)}
      >
        {grouped.map((group) => (
          <SwiperSlide key={group[0]?.apId} className="flex! flex-col gap-3">
            {group.map((feed) => (
              <div
                key={feed.apId}
                className="border py-2 px-2 rounded-lg h-[88px]"
              >
                <FeedCard {...feed} />
              </div>
            ))}
          </SwiperSlide>
        ))}
      </Swiper>
      <div className="flex flex-row justify-center mt-3 items-center gap-2">
        <Button
          size="icon"
          variant="outline"
          onClick={() => ref.current?.swiper.slideTo(0)}
          disabled={!hasPrev}
        >
          <ChevronLeft />
        </Button>
        <Button
          size="icon"
          variant="outline"
          onClick={() =>
            ref.current?.swiper.slideTo(
              ref.current.swiper.activeIndex - numCols,
            )
          }
          disabled={!hasPrev}
        >
          <ChevronLeft />
        </Button>
        <Button variant="outline">Show more</Button>
        <Button
          size="icon"
          variant="outline"
          onClick={() =>
            ref.current?.swiper.slideTo(
              ref.current.swiper.activeIndex + numCols,
            )
          }
          disabled={!hasNext}
        >
          <ChevronRight />
        </Button>
        <Button
          size="icon"
          variant="outline"
          onClick={() => ref.current?.swiper.slideTo(grouped.length - 1)}
          disabled={!hasNext}
        >
          <ChevronRight />
        </Button>
      </div>
    </div>
  );
}

const FEEDS = "FEEDS";
const FEATURED_SORTS = ["TopAll", FEEDS, "New"] as const;

export default function Communities() {
  const router = useIonRouter();
  const [search, setSearch] = useState("");

  const { communitySort, communitySorts } = useAvailableSorts();
  const listingType = useFiltersStore((s) => s.communitiesListingType);

  const featuredSorts = FEATURED_SORTS?.filter(
    (sort) => communitySorts?.includes(sort) || sort === FEEDS,
  );

  const media = useMedia();
  const software = useSoftware();

  const moderatesCommunities = useModeratingCommunities();
  const subscribedCommunities = useSubscribedCommunities();

  const communitiesQuery = useListCommunities({
    sort: communitySort,
    type: listingType,
  });

  // const { communities } = useMemo(() => {
  //   const communities = communitiesQuery.data?.pages
  //     .map((p) => p.communities)
  //     .flat();
  //
  //   if (listingType === "Subscribed") {
  //     return {
  //       communities: !communities?.length ? subscribedCommunities : communities,
  //     };
  //   }
  //
  //   if (listingType === "ModeratorView") {
  //     return {
  //       communities: moderatesCommunities,
  //     };
  //   }
  //
  //   return {
  //     communities,
  //   };
  // }, [
  //   listingType,
  //   moderatesCommunities,
  //   subscribedCommunities,
  //   communitiesQuery.data,
  // ]);

  let numCols = 1;
  if (media.xl) {
    numCols = 3;
  } else if (media.sm) {
    numCols = 2;
  }

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
      <IonContent fullscreen={media.maxMd}>
        <ContentGutters noMobilePadding>
          <div className="flex flex-col gap-4 py-6">
            <div className="flex flex-row flex-wrap gap-1.5">
              {communitySorts?.map((sort) => (
                <Button key={sort} size="sm" variant="outline">
                  {_.capitalize(sort)}
                </Button>
              ))}
            </div>

            {featuredSorts?.map((sort) =>
              sort === FEEDS ? (
                <FeedSwiper key={sort} />
              ) : (
                <CommunitiesSwiper
                  key={sort}
                  sort={sort}
                  hasMore={communitiesQuery.hasNextPage}
                />
              ),
            )}
          </div>
        </ContentGutters>
      </IonContent>
    </IonPage>
  );
}
