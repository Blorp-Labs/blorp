import { IonApp } from "@ionic/react";
import { setupIonicReact } from "@ionic/react";
import _ from "lodash";
import { useEffect } from "react";
import Router from "./Router";
import { useTheme } from "./hooks/use-theme";
import { useSettingsStore } from "./stores/settings";
import { applyCapacitorFixes } from "./lib/capacitor";
import "remove-focus-outline";
import { InstanceFavicon } from "./components/instance-favicon";
import { runTauriSecurityFix } from "./lib/create-storage";
import { useNotificationCount } from "./queries";
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
  const counts = useNotificationCount() ?? {};
  const count = _.sum(_.values(counts));
  if (isTauri()) {
    getCurrentWindow().setBadgeCount(count === 0 ? undefined : count);
  }
  return null;
}

function DarkModeEffect() {
  const theme = useTheme();
  useEffect(() => {
    document.documentElement.setAttribute("data-dark-mode", theme);
  }, [theme]);
  return null;
}

function ThemeEffect() {
  const lightTheme = useSettingsStore((s) => s.lightTheme);
  const darkTheme = useSettingsStore((s) => s.darkTheme);
  useEffect(() => {
    const el = document.documentElement;
    if (lightTheme === "default-light") {
      el.removeAttribute("data-light-theme");
    } else {
      el.setAttribute("data-light-theme", lightTheme);
    }
    if (darkTheme === "default-dark") {
      el.removeAttribute("data-dark-theme");
    } else {
      el.setAttribute("data-dark-theme", darkTheme);
    }
  }, [lightTheme, darkTheme]);
  return null;
}

export default function App() {
  return (
    <IonApp>
      <DarkModeEffect />
      <ThemeEffect />
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
