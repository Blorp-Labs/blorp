import { cn } from "../lib/utils";
import { ErrorBoundary } from "react-error-boundary";
import { useAuth, parseAccountInfo } from "@/src/stores/auth";
import { useCreatePostStore } from "@/src/stores/create-post";
import { resolveRoute } from "@/src/routing";
import { v4 as uuid } from "uuid";
import { useIonRouter } from "@ionic/react";
import { usePathname } from "@/src/hooks/use-pathname";
import { Button } from "./ui/button";
import {
  BLORP_COMMUNITY,
  buildErrorReport,
  buildIssueUrl,
} from "@/src/lib/error-reporting";
import { useRequireAuth } from "./auth-context";

function SidebarErrorFallback({
  error,
  resetErrorBoundary,
}: {
  error: unknown;
  resetErrorBoundary: () => void;
}) {
  const pathname = usePathname();
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
  const issueUrl = buildIssueUrl("[Crash] Sidebar rendering error", body);

  const reportViaCommunity = async () => {
    try {
      await requireAuth();
    } catch {
      return;
    }
    const draftId = uuid();
    updateDraft(draftId, {
      type: "text",
      communityHandle: BLORP_COMMUNITY,
      title: "[Crash] Sidebar rendering error",
      body,
    });
    router.push(resolveRoute("/create_post", `?id=${draftId}`));
  };

  return (
    <div className="p-4 text-sm flex flex-col gap-5 bg-destructive/20 rounded-lg">
      <p className="font-medium text-destructive text-lg">
        An unexpected error occurred.
      </p>
      <div className="flex flex-col gap-2">
        <Button size="sm" variant="ghost" onClick={resetErrorBoundary}>
          Try again
        </Button>
        <Button
          size="sm"
          variant={isLoggedIn ? "destructive" : "link"}
          onClick={reportViaCommunity}
        >
          Report in App
        </Button>
        <Button size="sm" variant={isLoggedIn ? "link" : "destructive"} asChild>
          <a href={issueUrl} target="_blank" rel="noopener noreferrer">
            Report on GitHub
          </a>
        </Button>
      </div>
    </div>
  );
}

export function Sidebar({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary FallbackComponent={SidebarErrorFallback}>
      <div className="flex flex-col py-4 dark:py-0 absolute inset-x-0 max-h-[calc(100vh-60px)]">
        {children}
      </div>
    </ErrorBoundary>
  );
}

export function SidebarContent({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className="overflow-y-auto md:pr-[6px] md:-mr-[14px]">
      <div
        className={cn(
          "bg-secondary/60 dark:bg-transparent rounded-xl",
          className,
        )}
      >
        {children}
      </div>
    </div>
  );
}
