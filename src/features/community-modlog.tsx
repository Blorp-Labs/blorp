import { useMemo } from "react";
import { useModlog, useCommunity } from "../lib/api";
import { IonContent, IonHeader, IonToolbar } from "@ionic/react";
import { useParams } from "@/src/routing/index";
import { useLinkContext } from "../routing/link-context";
import { UserDropdown } from "../components/nav";
import { ToolbarBackButton } from "../components/toolbar/toolbar-back-button";
import { ToolbarTitle } from "../components/toolbar/toolbar-title";
import { ToolbarButtons } from "../components/toolbar/toolbar-buttons";
import { Page } from "../components/page";
import { VirtualList } from "../components/virtual-list";
import { usePagination } from "../lib/hooks/use-pagination";
import { ModlogRow } from "../components/modlog/modlog-row";
import { Schemas } from "../lib/api/adapters/api-blueprint";
import { ContentGutters } from "../components/gutters";
import { Skeleton } from "../components/ui/skeleton";

function ModlogRowSkeleton() {
  return (
    <ContentGutters noMobilePadding>
      <div className="flex flex-row items-stretch gap-2 px-3 py-2 border-b border-border text-sm min-h-14">
        <Skeleton className="w-20" />
        <Skeleton className="w-28" />
        <Skeleton className="flex-1" />
      </div>
    </ContentGutters>
  );
}

export default function CommunityModlog() {
  const linkCtx = useLinkContext();
  const { communityName: communityNameEncoded } = useParams(
    `${linkCtx.root}c/:communityName/modlog`,
  );
  const communityName = useMemo(
    () => decodeURIComponent(communityNameEncoded),
    [communityNameEncoded],
  );

  const communityQuery = useCommunity({ name: communityName });

  const modlogQuery = useModlog({ communitySlug: communityName });

  const { flatData, onEndReached, paginationControls } = usePagination({
    pages: modlogQuery.data?.pages,
    getItems: (p) => p.items,
    fetchNextPage: modlogQuery.fetchNextPage,
    hasNextPage: modlogQuery.hasNextPage ?? false,
    isFetchingNextPage: modlogQuery.isFetchingNextPage,
    mode: "infinite",
  });

  return (
    <Page
      notFound={communityQuery.isError}
      notFoundCommunitySlug={communityName}
    >
      <IonHeader>
        <IonToolbar>
          <ToolbarButtons side="left">
            <ToolbarBackButton />
            <ToolbarTitle numRightIcons={1} size="sm">
              {`Modlog — ${communityName}`}
            </ToolbarTitle>
          </ToolbarButtons>
          <ToolbarButtons side="right">
            <UserDropdown />
          </ToolbarButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent scrollY={false}>
        <VirtualList<Schemas.ModlogItem>
          data={flatData}
          estimatedItemSize={56}
          scrollHost
          fullscreen
          onEndReached={onEndReached}
          paginationControls={paginationControls}
          placeholder={
            modlogQuery.isFetching ? <ModlogRowSkeleton /> : undefined
          }
          noItems={flatData.length === 0 && !modlogQuery.isFetching}
          noItemsComponent={
            <ContentGutters>
              <p className="text-muted-foreground text-center py-8">
                No modlog entries found.
              </p>
              <></>
            </ContentGutters>
          }
          renderItem={({ item }) => (
            <ContentGutters noMobilePadding>
              <ModlogRow item={item} />
            </ContentGutters>
          )}
        />
      </IonContent>
    </Page>
  );
}
