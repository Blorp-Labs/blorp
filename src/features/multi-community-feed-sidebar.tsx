import { SmallScreenSidebar } from "@/src/components/multi-community-feeds/multi-community-feed-sidebar";
import { useMemo } from "react";
import {
  IonContent,
  IonHeader,
  IonRefresher,
  IonRefresherContent,
  IonToolbar,
} from "@ionic/react";
import { Link, useParams } from "@/src/routing/index";
import { useSoftware } from "@/src/queries/index";
import { supportsFeeds } from "@/src/apis/support";
import { Page } from "@/src/components/page";

import { UserDropdown } from "../components/nav";
import { PageTitle } from "../components/page-title";
import { useLinkContext } from "@/src/hooks/navigation-hooks";
import { ContentGutters } from "../components/gutters";
import { ToolbarBackButton } from "../components/toolbar/toolbar-back-button";
import { ToolbarTitle } from "../components/toolbar/toolbar-title";
import { useMedia } from "../hooks";
import { Search } from "../components/icons";
import { ToolbarButtons } from "../components/toolbar/toolbar-buttons";
import { decodeApId } from "../apis/utils";

export default function MultiCommunitySidebar() {
  const media = useMedia();

  const linkCtx = useLinkContext();
  const { apId: encodedApId } = useParams(`${linkCtx.root}f/:apId/sidebar`);
  const apId = useMemo(() => decodeApId(encodedApId), [encodedApId]);

  const software = useSoftware();

  return (
    <Page
      notFound={software.software !== undefined && !supportsFeeds(software)}
      notFoundApId={apId}
    >
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
              to={`${linkCtx.root}c/:communityHandle/s`}
              params={{
                communityHandle: apId,
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
    </Page>
  );
}
