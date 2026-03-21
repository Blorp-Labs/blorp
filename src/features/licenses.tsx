import { ContentGutters } from "@/src/components/gutters";
import { MarkdownRenderer } from "../components/markdown/renderer";
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  useIonRouter,
} from "@ionic/react";
import { PageTitle } from "../components/page-title";
import MD from "@/THIRD-PARTY-NOTICES.md?raw";
import { Page } from "../components/page";

export default function Privacy() {
  const router = useIonRouter();
  // The contents of this page is absolutly massive.
  // So to prevent issues we remove it when this isn't
  // the active page.
  const isActiveRoute = router.routeInfo.pathname.startsWith("/licenses");
  return (
    <Page>
      <PageTitle>Licenses</PageTitle>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Open Source Licenses</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <ContentGutters>
          {isActiveRoute && (
            <MarkdownRenderer markdown={MD} className="flex-1 py-8" />
          )}
        </ContentGutters>
      </IonContent>
    </Page>
  );
}
