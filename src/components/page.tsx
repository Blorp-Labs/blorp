import { useAuth } from "@/src/stores/auth";
import {
  IonPage as DefaultIonPage,
  IonContent,
  IonHeader,
  IonToolbar,
  useIonRouter,
} from "@ionic/react";
import { useRequireAuth } from "./auth-context";
import { ContentGutters } from "./gutters";
import { Button } from "./ui/button";
import { MenuButton, UserDropdown } from "./nav";
import { ToolbarButtons } from "./toolbar/toolbar-buttons";
import { ToolbarTitle } from "./toolbar/toolbar-title";
import { ToolbarBackButton } from "./toolbar/toolbar-back-button";
import { usePathname } from "../routing/hooks";
import { STACK_ROOT_PATHS } from "../routing/routes";

function LoginRequiredPageContent() {
  const requireAuth = useRequireAuth();
  const pathname = usePathname();
  const isRoot = STACK_ROOT_PATHS.includes(pathname);
  return (
    <>
      <IonHeader>
        <IonToolbar data-tauri-drag-region>
          <ToolbarButtons side="left">
            {isRoot ? <MenuButton /> : <ToolbarBackButton />}
            <ToolbarTitle numRightIcons={1}>Login required</ToolbarTitle>
          </ToolbarButtons>
          <ToolbarButtons side="right">
            <UserDropdown />
          </ToolbarButtons>
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
    </>
  );
}

export function Page({
  children,
  requireLogin,
  ...props
}: {
  className?: string;
  children: React.ReactNode;
  requireLogin?: boolean;
}) {
  const isLoggedIn = useAuth((s) => s.isLoggedIn());
  const needsLogin = requireLogin && !isLoggedIn;
  return (
    <DefaultIonPage {...props}>
      {needsLogin ? <LoginRequiredPageContent /> : children}
    </DefaultIonPage>
  );
}
