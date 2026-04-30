import * as React from "react";
import { IonApp, IonContent, IonPage, setupIonicReact } from "@ionic/react";
import { IonReactRouter } from "@ionic/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

setupIonicReact({ animated: false });

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

export function PerfProviders({ children }: { children: React.ReactNode }) {
  return (
    <IonApp>
      <IonReactRouter>
        <QueryClientProvider client={queryClient}>
          <IonPage>
            <IonContent>{children}</IonContent>
          </IonPage>
        </QueryClientProvider>
      </IonReactRouter>
    </IonApp>
  );
}
