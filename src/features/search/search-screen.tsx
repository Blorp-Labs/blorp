import { useCommunity, useSearch } from "@/src/lib/api";
import {
  PostCard,
  PostCardSkeleton,
  PostProps,
} from "@/src/components/posts/post";
import { CommunitySidebar } from "@/src/components/communities/community-sidebar";
import { ContentGutters } from "@/src/components/gutters";
import { memo, useCallback, useMemo, useState } from "react";
import { VirtualList } from "@/src/components/virtual-list";
import {
  CommunityCard,
  CommunityCardSkeleton,
} from "@/src/components/communities/community-card";
import { useFiltersStore } from "@/src/stores/filters";
import _ from "lodash";
import { ToggleGroup, ToggleGroupItem } from "@/src/components/ui/toggle-group";
import { SearchType } from "lemmy-v3";
import { Link, useParams } from "@/src/routing/index";
import { IonContent, IonHeader, IonPage, IonToolbar } from "@ionic/react";
import { PageTitle } from "@/src/components/page-title";
import { UserDropdown } from "@/src/components/nav";
import {
  useKeyboardShortcut,
  useMedia,
  useUrlSearchState,
} from "@/src/lib/hooks";
import { PostReportProvider } from "@/src/components/posts/post-report";
import z from "zod";
import { PersonCard } from "@/src/components/person/person-card";
import { useLinkContext } from "@/src/routing/link-context";
import { BadgeIcon } from "@/src/components/badge-count";
import { PersonAvatar } from "@/src/components/person/person-avatar";
import { MarkdownRenderer } from "@/src/components/markdown/renderer";
import { RelativeTime } from "@/src/components/relative-time";
import { Message, X } from "@/src/components/icons";
import { Separator } from "@/src/components/ui/separator";
import { ToolbarBackButton } from "@/src/components/toolbar/toolbar-back-button";
import { ToolbarButtons } from "@/src/components/toolbar/toolbar-buttons";
import { SearchBar } from "./search-bar";
import { KeyboardShortcut } from "../keyboard-shortcut";
import { RecentSearchesSidebar } from "./recent-searches-sidebar";
import { useSearchStore } from "@/src/stores/search";
import { Button } from "@/src/components/ui/button";
import { cn } from "@/src/lib/utils";
import { useCommunityFromStore } from "@/src/stores/communities";
import { useCommentsByPaths } from "@/src/stores/comments";
import { encodeApId } from "@/src/lib/api/utils";

const EMPTY_ARR: never[] = [];

const NO_ITEMS = "NO_ITEMS";
type Item = string;

function SearchHistoryItem({
  search,
  onSelect,
}: {
  search: string;
  onSelect: () => void;
}) {
  const removeSearch = useSearchStore((s) => s.removeSearch);
  return (
    <ContentGutters className="py md:hidden">
      <div className="flex flex-row border-t items-center">
        <button
          className="text-start py-2 flex-1 overflow-hidden text-ellipsis whitespace-nowrap"
          onClick={onSelect}
        >
          {search}
        </button>
        <Button
          size="icon"
          variant="ghost"
          aria-label="remove from search"
          onClick={() => removeSearch(search)}
          className="-mr-2"
        >
          <X />
        </Button>
      </div>
    </ContentGutters>
  );
}

const Post = memo((props: PostProps) => (
  <ContentGutters className="max-md:px-0">
    <PostCard {...props} featuredContext="search" />
    <></>
  </ContentGutters>
));

function Comment({ commentPath }: { commentPath: string }) {
  const [comment] = useCommentsByPaths([commentPath]);
  const linkCtx = useLinkContext();

  if (!comment) {
    return null;
  }

  return (
    <ContentGutters className="px-0">
      <div className="flex-1">
        <div className="flex my-2.5 gap-3 items-start max-md:px-3.5">
          <BadgeIcon
            icon={<Message className="h-full w-full text-muted-foreground" />}
          >
            <PersonAvatar actorId={comment.creatorApId} size="sm" />
          </BadgeIcon>
          <div className={"flex-1 text-sm leading-6 block overflow-x-hidden"}>
            <Link
              to={`${linkCtx.root}c/:communityName/posts/:post/comments/:comment`}
              params={{
                communityName: comment.communitySlug,
                post: encodeApId(comment.postApId),
                comment: encodeApId(comment.apId),
              }}
            >
              <div className="flex flex-row flex-wrap">
                <span>
                  <span className="font-bold">{comment.creatorSlug}</span>
                  <span> commented in </span>
                  <span className="font-bold">{comment.postTitle}</span>
                </span>
              </div>
              <MarkdownRenderer
                markdown={comment.body}
                className="pb-2"
                disableLinks
              />
            </Link>
            <div className="flex flex-row justify-end gap-2 text-muted-foreground">
              <RelativeTime time={comment.createdAt} />
            </div>
          </div>
        </div>
        <Separator />
      </div>
      <></>
    </ContentGutters>
  );
}

export default function SearchFeed({
  scope = "global",
  defaultType = "posts",
}: {
  scope?: "community" | "global";
  defaultType?: "posts" | "communities" | "users";
}) {
  const media = useMedia();

  const linkCtx = useLinkContext();
  const { communityName: communityNameEncoded } = useParams(
    `${linkCtx.root}c/:communityName/s`,
  );
  const communityName = useMemo(
    () =>
      communityNameEncoded
        ? decodeURIComponent(communityNameEncoded)
        : undefined,
    [communityNameEncoded],
  );

  const [searchInput, setSearchInput] = useUrlSearchState("q", "", z.string());
  const [search, setSearch] = useState(searchInput);

  const setDebouncedSearch = useMemo(
    () =>
      _.debounce((newSearch: string) => {
        setSearch(newSearch);
      }, 500),
    [],
  );

  const updateSearch = (newSearch: string, flush?: boolean) => {
    setSearchInput(newSearch);
    setDebouncedSearch(newSearch);
    if (flush) {
      setDebouncedSearch.flush();
    }
  };

  const [type, setType] = useUrlSearchState(
    "type",
    defaultType,
    z.enum(["posts", "communities", "users", "comments"]),
  );

  useKeyboardShortcut(
    useCallback(
      (e) => {
        if (!(e.target instanceof HTMLInputElement)) {
          switch (e.key) {
            case "1":
              setType("posts");
              break;
            case "2":
              setType("comments");
              break;
            case "3":
              setType("communities");
              break;
            case "4":
              setType("users");
              break;
          }
        }
      },
      [setType],
    ),
  );

  const postSort = useFiltersStore((s) => s.postSort);

  useCommunity({
    name: communityName,
  });
  const community = useCommunityFromStore(communityName);

  let type_: SearchType;
  switch (type) {
    case "posts":
      type_ = "Posts";
      break;
    case "communities":
      type_ = "Communities";
      break;
    case "users":
      type_ = "Users";
      break;
    case "comments":
      type_ = "Comments";
      break;
  }

  const searchResults = useSearch({
    q: search ?? "",
    sort: type === "communities" ? "TopAll" : postSort,
    communitySlug:
      scope === "community" || type === "posts" ? communityName : undefined,
    type: type_,
  });

  const { hasNextPage, fetchNextPage, isFetchingNextPage, refetch } =
    searchResults;

  const apiData = useMemo(() => {
    if (type === "users") {
      const users =
        searchResults.data?.pages.map((res) => res.users).flat() ?? EMPTY_ARR;
      return users;
    }

    if (type === "comments") {
      const comments =
        searchResults.data?.pages.map((res) => res.comments).flat() ??
        EMPTY_ARR;
      return comments;
    }

    if (type === "communities") {
      const communities =
        searchResults.data?.pages.map((res) => res.communities).flat() ??
        EMPTY_ARR;
      return communities;
    }

    return searchResults.data?.pages.flatMap((res) => res.posts) ?? EMPTY_ARR;
  }, [searchResults.data?.pages, type]);

  const saveSearch = useSearchStore((s) => s.saveSearch);
  const searchHistory = useSearchStore((s) => s.searchHistory);

  const data =
    searchInput.length === 0
      ? searchHistory
      : apiData.length === 0 &&
          !searchResults.isRefetching &&
          !searchResults.isPending
        ? [NO_ITEMS]
        : apiData;

  return (
    <IonPage>
      <PageTitle>
        {communityName ? `Search ${communityName}` : "Search"}
      </PageTitle>
      <IonHeader>
        <IonToolbar data-tauri-drag-region>
          <ToolbarButtons side="left">
            <ToolbarBackButton />
          </ToolbarButtons>
          <SearchBar
            value={searchInput}
            onValueChange={(value) => updateSearch(value)}
            placeholder={
              communityName && type === "posts"
                ? `Search ${communityName}`
                : undefined
            }
            preventOpen
            className="w-auto max-md:mx-3"
            autoFocus={media.maxMd && searchInput.length === 0}
          />
          <ToolbarButtons side="right">
            <UserDropdown />
          </ToolbarButtons>
        </IonToolbar>
        {media.maxMd && (
          <IonToolbar>
            <ToggleGroup
              slot="start"
              type="single"
              variant="outline"
              size="sm"
              value={type}
              onValueChange={(val) =>
                val &&
                setType(val as "posts" | "communities" | "users" | "comments")
              }
            >
              <ToggleGroupItem value="posts">Posts</ToggleGroupItem>
              <ToggleGroupItem value="comments">Comments</ToggleGroupItem>
              {scope === "global" && (
                <ToggleGroupItem value="communities">
                  Communities
                </ToggleGroupItem>
              )}
              {scope === "global" && (
                <ToggleGroupItem value="users">Users</ToggleGroupItem>
              )}
            </ToggleGroup>
          </IonToolbar>
        )}
      </IonHeader>
      <IonContent scrollY={false} fullscreen={media.maxMd}>
        <PostReportProvider>
          <VirtualList<Item>
            scrollHost
            fullscreen
            data={data}
            header={[
              <ContentGutters
                className="max-md:hidden"
                key="header-type-toggle"
              >
                <div className="flex flex-row h-12 md:border-b md:bg-background flex-1 items-center">
                  <ToggleGroup
                    type="single"
                    variant="outline"
                    size="sm"
                    value={type}
                    onValueChange={(val) =>
                      val &&
                      setType(
                        val as "posts" | "communities" | "users" | "comments",
                      )
                    }
                  >
                    <ToggleGroupItem value="posts">
                      Posts
                      <KeyboardShortcut>1</KeyboardShortcut>
                    </ToggleGroupItem>
                    <ToggleGroupItem value="comments">
                      Comments
                      <KeyboardShortcut>2</KeyboardShortcut>
                    </ToggleGroupItem>
                    {scope === "global" && (
                      <ToggleGroupItem value="communities">
                        Communities
                        <KeyboardShortcut>3</KeyboardShortcut>
                      </ToggleGroupItem>
                    )}
                    {scope === "global" && (
                      <ToggleGroupItem value="users">
                        Users
                        <KeyboardShortcut>4</KeyboardShortcut>
                      </ToggleGroupItem>
                    )}
                  </ToggleGroup>
                </div>
                <></>
              </ContentGutters>,
              <ContentGutters
                key="recent-searches"
                className={cn("md:hidden", searchInput.length > 0 && "hidden")}
              >
                <span className="py-2.5 text-sm text-muted-foreground">
                  RECENT SEARCHES
                </span>
              </ContentGutters>,
            ]}
            renderItem={({ item }) => {
              if (searchInput.length === 0 && _.isString(item)) {
                return (
                  <SearchHistoryItem
                    search={item}
                    onSelect={() => updateSearch(item, true)}
                  />
                );
              }

              if (item === NO_ITEMS) {
                return (
                  <ContentGutters>
                    <div className="flex-1 italic text-muted-foreground p-6 text-center">
                      <span>Nothing to see here</span>
                    </div>
                    <></>
                  </ContentGutters>
                );
              }

              if (type === "comments") {
                return <Comment commentPath={item} />;
              }

              if (type === "posts") {
                return <Post apId={item} />;
              }

              if (type === "users") {
                return (
                  <ContentGutters>
                    <PersonCard
                      actorId={item}
                      disableHover
                      showCounts
                      className="pt-3.5"
                    />
                  </ContentGutters>
                );
              }

              return (
                <ContentGutters>
                  <CommunityCard communitySlug={item} className="pt-3.5" />
                  <></>
                </ContentGutters>
              );
            }}
            onEndReached={() => {
              if (hasNextPage && !isFetchingNextPage) {
                fetchNextPage();
              }
            }}
            estimatedItemSize={type === "posts" ? 475 : 52}
            refresh={refetch}
            placeholder={
              searchInput.length > 0 && (
                <ContentGutters
                  className={type !== "communities" ? "px-0" : undefined}
                >
                  {type === "communities" ? (
                    <CommunityCardSkeleton className="flex-1" />
                  ) : (
                    <PostCardSkeleton />
                  )}
                  <></>
                </ContentGutters>
              )
            }
            stickyIndicies={[0]}
          />
        </PostReportProvider>

        <ContentGutters className="max-md:hidden absolute top-0 right-0 left-0 z-10">
          <div className="flex-1" />
          {communityName ? (
            <CommunitySidebar
              communityName={communityName}
              actorId={community?.communityView.apId}
            />
          ) : (
            <RecentSearchesSidebar
              onSelect={(value) => {
                updateSearch(value, true);
                saveSearch(value);
              }}
            />
          )}
        </ContentGutters>
      </IonContent>
    </IonPage>
  );
}
