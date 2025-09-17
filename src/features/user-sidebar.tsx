import { SmallScreenSidebar } from "@/src/components/person/person-sidebar";
import { usePersonDetails } from "../lib/api";
import _ from "lodash";
import {
  IonContent,
  IonHeader,
  IonPage,
  IonRefresher,
  IonRefresherContent,
  IonToolbar,
} from "@ionic/react";
import { useParams } from "@/src/routing/index";
import { UserDropdown } from "../components/nav";
import { PageTitle } from "../components/page-title";
import { useLinkContext } from "../routing/link-context";
import { ContentGutters } from "../components/gutters";
import { ToolbarBackButton } from "../components/toolbar/toolbar-back-button";
import { ToolbarTitle } from "../components/toolbar/toolbar-title";
import { useMedia } from "../lib/hooks";
import { ToolbarButtons } from "../components/toolbar/toolbar-buttons";
import { decodeApId } from "../lib/api/utils";
import { useAuth } from "../stores/auth";
import { useProfilesStore } from "../stores/profiles";

export default function PersonSidebar() {
  const media = useMedia();

  const linkCtx = useLinkContext();
  const { userId } = useParams(`${linkCtx.root}u/:userId/sidebar`);

  const userSlug = userId ? decodeApId(userId) : undefined;

  const personQuery = usePersonDetails({ actorId: userSlug });
  const apId = personQuery.data?.apId;

  const getCachePrefixer = useAuth((s) => s.getCachePrefixer);
  const person = useProfilesStore((s) =>
    apId ? s.profiles[getCachePrefixer()(apId)]?.data : undefined,
  );

  return (
    <IonPage>
      <PageTitle>{person?.slug ?? "Person"}</PageTitle>
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
              {person?.slug ?? "Person"}
            </ToolbarTitle>
          </ToolbarButtons>
          <ToolbarButtons side="right">
            <UserDropdown />
          </ToolbarButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
        <IonRefresher
          slot="fixed"
          onIonRefresh={(e) =>
            personQuery.refetch().finally(() => e.detail.complete())
          }
        >
          <IonRefresherContent />
        </IonRefresher>
        <ContentGutters className="px-0">
          <SmallScreenSidebar person={person} expanded />
          <></>
        </ContentGutters>
      </IonContent>
    </IonPage>
  );
}
