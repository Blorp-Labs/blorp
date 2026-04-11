import { SmallScreenSidebar } from "@/src/components/communities/community-sidebar";
import { useMemo } from "react";
import { useCommunityQuery } from "../queries";
import {
  IonContent,
  IonHeader,
  IonRefresher,
  IonRefresherContent,
  IonToolbar,
} from "@ionic/react";
import { Link, useParams } from "@/src/routing/index";
import { useUpdateRecentCommunity } from "../hooks/use-update-recent-communities";

import { UserDropdown } from "../components/nav";
import { PageTitle } from "../components/page-title";
import { useLinkContext } from "@/src/hooks/navigation-hooks";
import { ContentGutters } from "../components/gutters";
import { ToolbarBackButton } from "../components/toolbar/toolbar-back-button";
import { ToolbarTitle } from "../components/toolbar/toolbar-title";
import { useMedia } from "../hooks";
import { Search } from "../components/icons";
import { ToolbarButtons } from "../components/toolbar/toolbar-buttons";
import { useCommunityFromStore } from "../stores/communities";
import { Page } from "../components/page";

export default function CommunityFeed() {
  const media = useMedia();

  const linkCtx = useLinkContext();
  const { communityHandle: communityHandleEncoded } = useParams(
    `${linkCtx.root}c/:communityHandle/sidebar`,
  );
  const communityHandle = useMemo(
    () => decodeURIComponent(communityHandleEncoded),
    [communityHandleEncoded],
  );

  const communityQuery = useCommunityQuery({
    name: communityHandle,
  });
  const community = useCommunityFromStore(communityHandle)?.communityView;

  useUpdateRecentCommunity(community);

  return (
    <Page
      notFound={communityQuery.isError && !community}
      notFoundCommunityHandle={communityHandle}
    >
      <PageTitle>{communityHandle}</PageTitle>
      <IonHeader>
        <IonToolbar
          data-tauri-drag-region
          style={
            media.maxMd
              ? {
                  "--border-color": "var(--color-background)",
                }
              : undefined
          }
        >
          <ToolbarButtons side="left">
            <ToolbarBackButton />
            <ToolbarTitle size="sm" numRightIcons={2}>
              {communityHandle}
            </ToolbarTitle>
          </ToolbarButtons>
          <ToolbarButtons side="right">
            <Link
              to={`${linkCtx.root}c/:communityHandle/s`}
              params={{
                communityHandle,
              }}
              className="text-2xl contents md:hidden"
            >
              <Search className="scale-110 text-muted-foreground" />
            </Link>
            <UserDropdown />
          </ToolbarButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
        <IonRefresher
          slot="fixed"
          onIonRefresh={(e) =>
            communityQuery.refetch().finally(() => e.detail.complete())
          }
        >
          <IonRefresherContent />
        </IonRefresher>
        <ContentGutters className="px-0">
          <SmallScreenSidebar
            communityHandle={communityHandle}
            actorId={community?.apId}
            expanded
          />
          <></>
        </ContentGutters>
      </IonContent>
    </Page>
  );
}
