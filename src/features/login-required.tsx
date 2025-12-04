import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
} from "@ionic/react";
import { Button } from "../components/ui/button";
import { useRequireAuth } from "../components/auth-context";
import { ContentGutters } from "../components/gutters";

/**
 * @deprecated don't use
 */
export default function LoginRequired() {
  const requireAuth = useRequireAuth();
  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Login required</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <ContentGutters>
          <div className="flex-1 py-8 flex flex-col gap-4 items-start">
            <h1>Login is required to continue</h1>
            <Button onClick={() => requireAuth()}>Login</Button>
          </div>
        </ContentGutters>
      </IonContent>
    </IonPage>
  );
}
