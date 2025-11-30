import { SmallScreenSidebar } from "@/src/components/feeds/feed-sidebar";
import { useMemo } from "react";
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

import { UserDropdown } from "../components/nav";
import { PageTitle } from "../components/page-title";
import { useLinkContext } from "../routing/link-context";
import { ContentGutters } from "../components/gutters";
import { ToolbarBackButton } from "../components/toolbar/toolbar-back-button";
import { ToolbarTitle } from "../components/toolbar/toolbar-title";
import { useMedia } from "../lib/hooks";
import { Search } from "../components/icons";
import { ToolbarButtons } from "../components/toolbar/toolbar-buttons";
import { useFeedFromStore } from "../stores/feeds";

export default function CommunityFeed() {
  const media = useMedia();

  const linkCtx = useLinkContext();
  const { apId: encodedApId } = useParams(`${linkCtx.root}f/:apId/sidebar`);
  const apId = useMemo(() => decodeURIComponent(encodedApId), [encodedApId]);

  // const communityQuery = useCommunity({
  //   name: apId,
  // });
  const feed = useFeedFromStore(apId);

  return (
    <IonPage>
      <PageTitle>{apId}</PageTitle>
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
              {apId}
            </ToolbarTitle>
          </ToolbarButtons>
          <ToolbarButtons side="right">
            <Link
              to={`${linkCtx.root}c/:communityName/s`}
              params={{
                communityName: apId,
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
          onIonRefresh={(e) => {
            e.detail.complete();
          }}
        >
          <IonRefresherContent />
        </IonRefresher>
        <ContentGutters className="px-0">
          <SmallScreenSidebar apId={apId} expanded />
          <></>
        </ContentGutters>
      </IonContent>
    </IonPage>
  );
}
