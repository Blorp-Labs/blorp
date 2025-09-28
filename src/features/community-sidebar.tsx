import { SmallScreenSidebar } from "@/src/components/communities/community-sidebar";
import { useEffect, useMemo } from "react";
import { useCommunity } from "../lib/api";
import _ from "lodash";
import {
  IonContent,
  IonHeader,
  IonPage,
  IonRefresher,
  IonRefresherContent,
  IonToolbar,
} from "@ionic/react";
import { Link, useParams } from "@/src/routing/index";
import { useRecentCommunitiesStore } from "../stores/recent-communities";

import { UserDropdown } from "../components/nav";
import { PageTitle } from "../components/page-title";
import { useLinkContext } from "../routing/link-context";
import { ContentGutters } from "../components/gutters";
import { ToolbarBackButton } from "../components/toolbar/toolbar-back-button";
import { ToolbarTitle } from "../components/toolbar/toolbar-title";
import { useMedia } from "../lib/hooks";
import { Search } from "../components/icons";
import { ToolbarButtons } from "../components/toolbar/toolbar-buttons";
import { useCommunityFromStore } from "../stores/communities";

export default function CommunityFeed() {
  const media = useMedia();

  const linkCtx = useLinkContext();
  const { communityName: communityNameEncoded } = useParams(
    `${linkCtx.root}c/:communityName/sidebar`,
  );
  const communityName = useMemo(
    () => decodeURIComponent(communityNameEncoded),
    [communityNameEncoded],
  );

  const communityQuery = useCommunity({
    name: communityName,
  });
  const community = useCommunityFromStore(communityName)?.communityView;

  const updateRecent = useRecentCommunitiesStore((s) => s.update);

  useEffect(() => {
    if (community) {
      updateRecent(community);
    }
  }, [community, updateRecent]);

  return (
    <IonPage>
      <PageTitle>{communityName}</PageTitle>
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
              {communityName}
            </ToolbarTitle>
          </ToolbarButtons>
          <ToolbarButtons side="right">
            <Link
              to={`${linkCtx.root}c/:communityName/s`}
              params={{
                communityName,
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
            communityName={communityName}
            actorId={community?.apId}
            expanded
          />
          <></>
        </ContentGutters>
      </IonContent>
    </IonPage>
  );
}
