import * as React from "react";
import { IonApp, IonContent, IonPage } from "@ionic/react";
import { IonReactRouter } from "@ionic/react-router";
import type { Preview } from "@storybook/react-vite";
import { QueryClientProvider } from "@tanstack/react-query";
import { setupIonicReact } from "@ionic/react";
import { queryClient } from "../src/tanstack-query/query-client";
import "../src/styles/index.css";

setupIonicReact();

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
  decorators: (Story) => (
    <IonApp>
      <IonReactRouter>
        <QueryClientProvider client={queryClient}>
          <IonPage>
            <IonContent>
              <Story />
            </IonContent>
          </IonPage>
        </QueryClientProvider>
      </IonReactRouter>
    </IonApp>
  ),
};

export default preview;
