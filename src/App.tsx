import { IonApp } from "@ionic/react";
import { setupIonicReact } from "@ionic/react";
import _ from "lodash";
import Router from "./routing/Router";
import { applyCapacitorFixes } from "./lib/capacitor";
import "remove-focus-outline";
import { InstanceFavicon } from "./components/instance-favicon";
import { runTauriSecurityFix } from "./lib/create-storage";
import { useNotificationCount } from "./lib/api";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { isDev, isTauri } from "./lib/device";
import { updateTauri } from "./lib/tauri";
import { ReactQueryDevtoolsPanel } from "@tanstack/react-query-devtools";
import { TanstackDevtools } from "@tanstack/react-devtools";
import { TanstackQueryProvider } from "./tanstack-query/index";
import { AuthProvider } from "./components/auth-context";
import { PostRemoveProvider } from "./components/posts/post-remove";
import { Toaster } from "./components/ui/sonner";

updateTauri();

runTauriSecurityFix();

applyCapacitorFixes();

setupIonicReact({
  mode: "ios",
  statusTap: false,
  swipeBackEnabled: true,
});

function RefreshNotificationCount() {
  const counts = useNotificationCount() ?? [];
  const count = _.sum(counts);
  if (isTauri()) {
    getCurrentWindow().setBadgeCount(count === 0 ? undefined : count);
  }
  return null;
}

export default function App() {
  return (
    <IonApp>
      <TanstackQueryProvider>
        <AuthProvider>
          <PostRemoveProvider>
            <RefreshNotificationCount />
            <InstanceFavicon />
            <Router />
            {isDev() && (
              <TanstackDevtools
                plugins={[
                  {
                    name: "Tanstack Query",
                    render: <ReactQueryDevtoolsPanel />,
                  },
                ]}
              />
            )}
          </PostRemoveProvider>
        </AuthProvider>
        <Toaster />
      </TanstackQueryProvider>
    </IonApp>
  );
}
