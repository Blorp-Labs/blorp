import { parseAccountInfo, useAuth } from "@/src/stores/auth";
import {
  IonPage as DefaultIonPage,
  IonContent,
  IonHeader,
  IonToolbar,
  useIonRouter,
} from "@ionic/react";
import { useRequireAuth } from "../auth-context";
import { ContentGutters } from "../gutters";
import { Button } from "../ui/button";
import { MenuButton, UserDropdown } from "../nav";
import { ToolbarButtons } from "../toolbar/toolbar-buttons";
import { ToolbarTitle } from "../toolbar/toolbar-title";
import { ToolbarBackButton } from "../toolbar/toolbar-back-button";
import { usePathname } from "../../routing/hooks";
import { STACK_ROOT_PATHS } from "../../routing/routes";
import { NotFoundPageContent } from "./not-found";
import { ErrorBoundary } from "react-error-boundary";
import { useCreatePostStore } from "@/src/stores/create-post";
import { resolveRoute } from "@/src/routing";
import { v4 as uuid } from "uuid";
import {
  BLORP_COMMUNITY,
  buildErrorReport,
  buildIssueUrl,
} from "@/src/lib/error-reporting";
import { useSettingsStore } from "@/src/stores/settings";
import { useIsContentWarningActive } from "@/src/lib/nsfw";
import { ContentWarningPageContent } from "./content-warning";

function PageErrorFallback({
  error,
  resetErrorBoundary,
}: {
  error: unknown;
  resetErrorBoundary: () => void;
}) {
  const pathname = usePathname();
  const isRoot = STACK_ROOT_PATHS.includes(pathname);
  const router = useIonRouter();
  const updateDraft = useCreatePostStore((s) => s.updateDraft);
  const requireAuth = useRequireAuth();

  const isLoggedIn = useAuth((s) => s.isLoggedIn());
  const instance = useAuth(
    (s) => parseAccountInfo(s.getSelectedAccount()).instance,
  );
  const host = window.location.host;

  const body = buildErrorReport(
    { Host: host, Path: pathname, "User Instance": instance },
    error,
  );

  const issueUrl = buildIssueUrl("[Crash] Page rendering error", body);

  const reportViaCommunity = async () => {
    try {
      await requireAuth();
    } catch {
      return;
    }
    const draftId = uuid();
    updateDraft(draftId, {
      type: "text",
      communitySlug: BLORP_COMMUNITY,
      title: `[Crash] Page rendering error`,
      body,
    });
    router.push(resolveRoute("/create_post", `?id=${draftId}`));
  };

  return (
    <>
      <IonHeader>
        <IonToolbar data-tauri-drag-region>
          <ToolbarButtons side="left">
            {isRoot ? <MenuButton /> : <ToolbarBackButton />}
            <ToolbarTitle numRightIcons={1}>Something went wrong</ToolbarTitle>
          </ToolbarButtons>
          <ToolbarButtons side="right">
            <UserDropdown />
          </ToolbarButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <ContentGutters>
          <div className="flex-1 py-4">
            <div className="p-4 text-sm flex flex-col gap-5 bg-destructive/20 rounded-lg">
              <p className="font-medium text-destructive text-lg">
                An unexpected error occurred on this page.
              </p>
              <div className="flex flex-wrap items-center justify-end gap-2">
                <Button size="sm" variant="ghost" onClick={resetErrorBoundary}>
                  Try again
                </Button>
                <div className="flex-1" />
                <Button
                  size="sm"
                  variant={isLoggedIn ? "destructive" : "link"}
                  onClick={reportViaCommunity}
                >
                  Report in App
                </Button>
                <Button
                  size="sm"
                  variant={isLoggedIn ? "link" : "destructive"}
                  asChild
                >
                  <a href={issueUrl} target="_blank" rel="noopener noreferrer">
                    Report on GitHub
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </ContentGutters>
      </IonContent>
    </>
  );
}

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
  notFound,
  notFoundApId,
  notFoundCommunitySlug,
  ref,
  ...props
}: {
  className?: string;
  children?: React.ReactNode;
  requireLogin?: boolean;
  notFound?: boolean;
  notFoundApId?: string;
  notFoundCommunitySlug?: string;
  ref?: React.Ref<HTMLElement | undefined | null>;
}) {
  const isLoggedIn = useAuth((s) => s.isLoggedIn());
  const contentWarningAccepted = useSettingsStore(
    (s) => s.contentWarningAccepted,
  );
  const contentWarningActive = useIsContentWarningActive();
  const needsLogin = requireLogin && !isLoggedIn;
  const needsContentWarning =
    !isLoggedIn && contentWarningActive && !contentWarningAccepted;
  return (
    <DefaultIonPage ref={ref} {...props}>
      <ErrorBoundary FallbackComponent={PageErrorFallback}>
        {needsLogin ? (
          <LoginRequiredPageContent />
        ) : needsContentWarning ? (
          <ContentWarningPageContent />
        ) : notFound ? (
          <NotFoundPageContent
            apId={notFoundApId}
            communitySlug={notFoundCommunitySlug}
          />
        ) : (
          children
        )}
      </ErrorBoundary>
    </DefaultIonPage>
  );
}
