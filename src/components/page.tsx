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
import { NotFoundPageContent } from "../features/not-found";
import { ErrorBoundary } from "react-error-boundary";
import { useCreatePostStore } from "@/src/stores/create-post";
import { resolveRoute } from "@/src/routing";
import { v4 as uuid } from "uuid";
import { env } from "@/src/env";

const BLORP_COMMUNITY = "blorp@lemmy.zip";

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

  const err = error instanceof Error ? error : undefined;
  const errorMessage = err?.message ?? String(error);
  const stack = err?.stack ?? "";
  const host = window.location.host;

  const issueUrl = `https://github.com/Blorp-Labs/blorp/issues/new?${new URLSearchParams(
    {
      labels: "bug",
      template: "bug_report.md",
      title: "[Crash] Page rendering error",
      body: `**Host:** ${host}\n**Path:** ${pathname}\n**Commit:** ${env.REACT_APP_COMMIT_SHA}\n\n**Error:** ${errorMessage}\n\n**Stack:**\n\`\`\`\n${stack}\n\`\`\``,
    },
  )}`;

  const reportViaCommunity = () => {
    const draftId = uuid();
    updateDraft(draftId, {
      type: "text",
      communitySlug: BLORP_COMMUNITY,
      title: `[Crash] Page rendering error`,
      body: `**Host:** ${host}\n**Path:** ${pathname}\n**Commit:** ${env.REACT_APP_COMMIT_SHA}\n\n**Error:** ${errorMessage}\n\n**Stack:**\n\`\`\`\n${stack}\n\`\`\``,
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
          <div className="flex-1 py-8 flex flex-col gap-4 items-start">
            <p>An unexpected error occurred on this page.</p>
            <div className="flex flex-wrap gap-3">
              <Button onClick={resetErrorBoundary}>Try again</Button>
              <Button onClick={reportViaCommunity}>Report via Blorp</Button>
              <Button variant="link" asChild>
                <a href={issueUrl} target="_blank" rel="noopener noreferrer">
                  Report on GitHub
                </a>
              </Button>
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
  const needsLogin = requireLogin && !isLoggedIn;
  return (
    <DefaultIonPage ref={ref} {...props}>
      {needsLogin ? (
        <LoginRequiredPageContent />
      ) : notFound ? (
        <NotFoundPageContent
          apId={notFoundApId}
          communitySlug={notFoundCommunitySlug}
        />
      ) : (
        <ErrorBoundary FallbackComponent={PageErrorFallback}>
          {children}
        </ErrorBoundary>
      )}
    </DefaultIonPage>
  );
}
