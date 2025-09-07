import { SmallScreenSidebar } from "@/src/components/communities/community-sidebar";
import { useEffect, useMemo } from "react";
import { useCommunity } from "../lib/api";
import _ from "lodash";
import { IonContent, IonHeader, IonPage, IonToolbar } from "@ionic/react";
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

  const community = useCommunity({
    name: communityName,
  });

  const updateRecent = useRecentCommunitiesStore((s) => s.update);

  useEffect(() => {
    if (community.data) {
      updateRecent(community.data.community);
    }
  }, [community.data, updateRecent]);

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
      <IonContent>
        <ContentGutters className="px-0">
          <SmallScreenSidebar
            communityName={communityName}
            actorId={community.data?.community.apId}
            expanded
          />
          <></>
        </ContentGutters>
      </IonContent>
    </IonPage>
  );
}
