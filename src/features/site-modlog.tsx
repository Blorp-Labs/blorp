import { useModlog } from "../lib/api";
import { IonContent, IonHeader, IonToolbar } from "@ionic/react";
import { UserDropdown } from "../components/nav";
import { ToolbarBackButton } from "../components/toolbar/toolbar-back-button";
import { ToolbarTitle } from "../components/toolbar/toolbar-title";
import { ToolbarButtons } from "../components/toolbar/toolbar-buttons";
import { VirtualList } from "../components/virtual-list";
import { usePagination } from "../hooks/use-pagination";
import { ModlogRow, ModlogRowSkeleton } from "../components/modlog/modlog-row";
import { Schemas } from "../lib/api/adapters/api-blueprint";
import { ContentGutters } from "../components/gutters";
import { useAuth } from "../stores/auth";
import { Page } from "../components/page";

export default function SiteModlog() {
  const instance = useAuth((s) => s.getSelectedAccount().instance);
  let instanceHost = "";
  try {
    const url = new URL(instance);
    instanceHost = url.host;
  } catch {}

  const modlogQuery = useModlog({});

  const { flatData, onEndReached, paginationControls } = usePagination({
    pages: modlogQuery.data?.pages,
    getItems: (p) => p.items,
    fetchNextPage: modlogQuery.fetchNextPage,
    hasNextPage: modlogQuery.hasNextPage ?? false,
    isFetchingNextPage: modlogQuery.isFetchingNextPage,
    mode: "infinite",
  });

  return (
    <Page>
      <IonHeader>
        <IonToolbar>
          <ToolbarButtons side="left">
            <ToolbarBackButton />
            <ToolbarTitle numRightIcons={1} size="sm">
              {instanceHost ? `Modlog — ${instanceHost}` : `Modlog`}
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
