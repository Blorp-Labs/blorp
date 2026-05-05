import {
  PostCard,
  PostCardSkeleton,
  PostProps,
} from "@/src/components/posts/post";
import { ContentGutters } from "../components/gutters";
import { memo, useEffect, useMemo } from "react";
import { VirtualList } from "../components/virtual-list";
import { ToggleGroup, ToggleGroupItem } from "../components/ui/toggle-group";
import { IonContent, IonHeader, IonToolbar } from "@ionic/react";
import { UserDropdown } from "../components/nav";
import { PageTitle } from "../components/page-title";
import { useMedia, useUrlSearchState } from "../hooks";
import z from "zod";
import { ToolbarTitle } from "../components/toolbar/toolbar-title";
import { ToolbarBackButton } from "../components/toolbar/toolbar-back-button";
import { ToolbarButtons } from "../components/toolbar/toolbar-buttons";
import { StickyFilterBar } from "../components/sticky-filter-bar";
import { Page } from "../components/page";
import { useRecentPostsStore, RecentPost } from "../stores/recent-posts";
import {
  useRecentCommunitiesStore,
  RecentCommunity,
} from "../stores/recent-communities";
import { useShouldShowNsfw } from "../hooks/nsfw";
import { useAuth } from "../stores/auth";
import { usePostsStore } from "../stores/posts";
import { useCommunitiesStore } from "../stores/communities";
import { useProfilesStore } from "../stores/profiles";
import { CommunityCard } from "../components/communities/community-card";

function NothingViewedMessage() {
  return (
    <ContentGutters>
      <div className="flex-1 italic text-muted-foreground p-6 text-center">
        <span>Nothing viewed yet</span>
      </div>
      <></>
    </ContentGutters>
  );
}

const Post = memo((props: PostProps) => (
  <ContentGutters className="px-0">
    <PostCard {...props} />
    <></>
  </ContentGutters>
));

/**
 * The Recent page may show posts viewed under accounts other than the one
 * currently selected. Per-account caches for those posts/communities/creators
 * may be cold (TTL eviction) or empty (never visited under this client). Seed
 * each entry's account-scoped cache slot from the snapshot so PostCard's
 * lookup with an `accountUuid` override succeeds.
 *
 * Only seeds when the slot is missing, so live data is never overwritten by
 * a stale snapshot.
 */
function useHydrateRecentPostSnapshots(entries: RecentPost[]) {
  useEffect(() => {
    if (entries.length === 0) {
      return;
    }

    const authState = useAuth.getState();
    const accountFor = (uuid: string | undefined) =>
      uuid ? authState.accounts.find((a) => a.uuid === uuid) : undefined;

    const { posts } = usePostsStore.getState();
    const { communities } = useCommunitiesStore.getState();
    const { profiles } = useProfilesStore.getState();

    const postsByAccount = new Map<string, RecentPost[]>();
    const communitiesByAccount = new Map<string, RecentPost[]>();
    const profilesByAccount = new Map<string, RecentPost[]>();

    for (const entry of entries) {
      const account = accountFor(entry.accountUuid);
      const prefix = authState.getCachePrefixer(account);
      const key = entry.accountUuid ?? "";
      if (!posts[prefix(entry.post.apId)]) {
        const list = postsByAccount.get(key) ?? [];
        list.push(entry);
        postsByAccount.set(key, list);
      }
      if (!communities[prefix(entry.community.handle)]) {
        const list = communitiesByAccount.get(key) ?? [];
        list.push(entry);
        communitiesByAccount.set(key, list);
      }
      if (!profiles[prefix(entry.creator.apId)]) {
        const list = profilesByAccount.get(key) ?? [];
        list.push(entry);
        profilesByAccount.set(key, list);
      }
    }

    for (const [uuid, list] of postsByAccount) {
      usePostsStore.getState().cachePosts(
        authState.getCachePrefixer(accountFor(uuid)),
        list.map((e) => e.post),
      );
    }
    for (const [uuid, list] of communitiesByAccount) {
      useCommunitiesStore.getState().cacheCommunities(
        authState.getCachePrefixer(accountFor(uuid)),
        list.map((e) => ({ communityView: e.community })),
      );
    }
    for (const [uuid, list] of profilesByAccount) {
      useProfilesStore.getState().cacheProfiles(
        authState.getCachePrefixer(accountFor(uuid)),
        list.map((e) => e.creator),
      );
    }
  }, [entries]);
}

function RecentCommunityRow({ community }: { community: RecentCommunity }) {
  const account = useAuth((s) =>
    community.accountUuid
      ? s.accounts.find((a) => a.uuid === community.accountUuid)
      : undefined,
  );
  return (
    <ContentGutters className="px-0">
      <CommunityCard
        communityHandle={community.handle}
        className="px-3.5 md:px-4 py-2 hover:bg-accent"
        account={account}
      />
      <></>
    </ContentGutters>
  );
}

export default function RecentlyViewed() {
  const media = useMedia();

  const typeParam = useUrlSearchState(
    "type",
    "posts",
    z.enum(["posts", "communities"]),
  );
  const type = typeParam.value;

  const showNsfw = useShouldShowNsfw();

  const recentPosts = useRecentPostsStore((s) => s.recentlyVisited);
  const recentCommunities = useRecentCommunitiesStore((s) => s.recentlyVisited);

  const filteredPosts = useMemo(
    () => recentPosts.filter((e) => (showNsfw ? true : !e.post.nsfw)),
    [recentPosts, showNsfw],
  );
  const filteredCommunities = useMemo(
    () => recentCommunities.filter((c) => (showNsfw ? true : !c.nsfw)),
    [recentCommunities, showNsfw],
  );

  useHydrateRecentPostSnapshots(filteredPosts);

  const toggle = (
    <ToggleGroup
      type="single"
      variant="outline"
      size="sm"
      value={type}
      onValueChange={(val) =>
        val && typeParam.set(val as "posts" | "communities")
      }
    >
      <ToggleGroupItem value="posts">Posts</ToggleGroupItem>
      <ToggleGroupItem value="communities">Communities</ToggleGroupItem>
    </ToggleGroup>
  );

  const stickyHeader = (
    <StickyFilterBar key="header-type-select" className="max-md:hidden">
      {toggle}
    </StickyFilterBar>
  );

  return (
    <Page>
      <PageTitle>Recent</PageTitle>
      <IonHeader>
        <IonToolbar data-tauri-drag-region>
          <ToolbarButtons side="left">
            <ToolbarBackButton />
            <ToolbarTitle numRightIcons={1}>Recent</ToolbarTitle>
          </ToolbarButtons>
          <ToolbarButtons side="right">
            <UserDropdown />
          </ToolbarButtons>
        </IonToolbar>
        {media.maxMd && (
          <IonToolbar>
            <ToolbarButtons side="left">{toggle}</ToolbarButtons>
          </IonToolbar>
        )}
      </IonHeader>
      <IonContent scrollY={false} fullscreen={media.maxMd}>
        {type === "posts" ? (
          <VirtualList
            key="posts"
            fullscreen
            scrollHost
            data={filteredPosts}
            header={[stickyHeader]}
            noItems={filteredPosts.length === 0}
            noItemsComponent={<NothingViewedMessage />}
            renderItem={({ item }) => (
              <Post apId={item.apId} accountUuid={item.accountUuid} />
            )}
            estimatedItemSize={475}
            stickyIndicies={[0]}
            placeholder={
              <ContentGutters className="px-0">
                <PostCardSkeleton />
                <></>
              </ContentGutters>
            }
          />
        ) : (
          <VirtualList
            key="communities"
            fullscreen
            scrollHost
            data={filteredCommunities}
            header={[stickyHeader]}
            noItems={filteredCommunities.length === 0}
            noItemsComponent={<NothingViewedMessage />}
            renderItem={({ item }) => <RecentCommunityRow community={item} />}
            estimatedItemSize={60}
            stickyIndicies={[0]}
          />
        )}
      </IonContent>
    </Page>
  );
}
