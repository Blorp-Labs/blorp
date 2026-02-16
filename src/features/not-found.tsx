import {
  IonContent,
  IonHeader,
  IonPage,
  IonToolbar,
  useIonRouter,
} from "@ionic/react";
import { ContentGutters } from "../components/gutters";
import { UserDropdown } from "../components/nav";
import { ToolbarBackButton } from "../components/toolbar/toolbar-back-button";
import { ToolbarTitle } from "../components/toolbar/toolbar-title";
import { ToolbarButtons } from "../components/toolbar/toolbar-buttons";
import {
  useResolveObjectAcrossAccounts,
  useResolveObjectOnOriginInstance,
} from "../lib/api";
import { parseAccountInfo, useAuth } from "../stores/auth";
import { useMemo, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { Button } from "../components/ui/button";
import { LuLoaderCircle } from "react-icons/lu";
import { IoPerson } from "react-icons/io5";
import { resolveRoute } from "../routing";
import { encodeApId } from "../lib/api/utils";
import { Schemas } from "../lib/api/adapters/api-blueprint";

function buildRedirectUrl(data: Schemas.ResolveObject): string | undefined {
  if (data.post) {
    return resolveRoute("/home/c/:communityName/posts/:post", {
      post: encodeApId(data.post.apId),
      communityName: data.post.communitySlug,
    });
  }
  if (data.community) {
    return resolveRoute("/home/c/:communityName", {
      communityName: data.community.slug,
    });
  }
  if (data.user) {
    return resolveRoute("/home/u/:userId", {
      userId: encodeApId(data.user.apId),
    });
  }
  if (data.comment) {
    return resolveRoute(
      "/home/c/:communityName/posts/:post/comments/:comment",
      {
        communityName: "_",
        post: "_",
        comment: encodeApId(data.comment.apId),
      },
    );
  }
  return undefined;
}

function CrossInstanceResolver({ apId }: { apId: string }) {
  const router = useIonRouter();
  const setAccountIndex = useAuth((s) => s.setAccountIndex);
  const addAccount = useAuth((s) => s.addAccount);
  const accounts = useAuth((s) => s.accounts);
  const [originConfirmed, setOriginConfirmed] = useState(false);

  const crossAccountQuery = useResolveObjectAcrossAccounts(apId);
  const originQuery = useResolveObjectOnOriginInstance(apId, originConfirmed);

  const matches = crossAccountQuery.data ?? [];
  const isSearching = crossAccountQuery.isLoading;
  const hasMultipleAccounts = accounts.length > 1;

  const originHost = useMemo(() => {
    try {
      return new URL(apId).host;
    } catch {
      return undefined;
    }
  }, [apId]);

  const originUrl = useMemo(() => {
    try {
      return new URL(apId).origin;
    } catch {
      return undefined;
    }
  }, [apId]);

  const originRedirectUrl = useMemo(() => {
    if (!originQuery.data) return undefined;
    return buildRedirectUrl(originQuery.data);
  }, [originQuery.data]);

  const handleSwitch = (
    accountIndex: number,
    result: Schemas.ResolveObject,
  ) => {
    const url = buildRedirectUrl(result);
    if (!url) return;
    setAccountIndex(accountIndex);
    router.push(url, "forward", "replace");
  };

  const handleAddGuest = () => {
    if (!originUrl || !originRedirectUrl) return;
    addAccount({ instance: originUrl });
    router.push(originRedirectUrl, "forward", "replace");
  };

  // Still searching across accounts
  if (isSearching && hasMultipleAccounts) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="font-bold text-4xl">Not found</h1>
        <div className="flex items-center gap-2 text-muted-foreground">
          <LuLoaderCircle className="animate-spin" />
          <span>Searching your accounts...</span>
        </div>
      </div>
    );
  }

  // Found on other accounts
  if (matches.length > 0) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="font-bold text-4xl">Not found</h1>
        <p className="text-muted-foreground">
          Not available on your current account, but found on:
        </p>
        <div className="flex flex-col gap-2">
          {matches.map((match) => {
            const { person, instance } = parseAccountInfo(match.account);
            const [name] = person?.slug.split("@") ?? [];
            return (
              <div
                key={match.accountIndex}
                className="flex items-center gap-3 p-3 rounded-lg border"
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage src={person?.avatar ?? undefined} />
                  <AvatarFallback>
                    {person ? (
                      person.slug?.substring(0, 1).toUpperCase()
                    ) : (
                      <IoPerson />
                    )}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col text-sm flex-1">
                  <span>{name ?? "Guest"}</span>
                  <span className="text-muted-foreground">@{instance}</span>
                </div>
                <Button
                  size="sm"
                  onClick={() => handleSwitch(match.accountIndex, match.result)}
                  variant="secondary"
                >
                  Switch
                </Button>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // No matches on other accounts — offer origin instance search
  const showOriginSearch = originHost && !originQuery.alreadyOnOrigin;

  if (showOriginSearch && !originConfirmed) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="font-bold text-4xl">Not found</h1>
        <p className="text-muted-foreground">
          Not available on your {hasMultipleAccounts ? "accounts" : "account"}.
        </p>
        <Button variant="outline" onClick={() => setOriginConfirmed(true)}>
          Search {originHost}?
        </Button>
      </div>
    );
  }

  if (showOriginSearch && originConfirmed && originQuery.isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="font-bold text-4xl">Not found</h1>
        <div className="flex items-center gap-2 text-muted-foreground">
          <LuLoaderCircle className="animate-spin" />
          <span>Searching {originHost}...</span>
        </div>
      </div>
    );
  }

  if (showOriginSearch && originConfirmed && originRedirectUrl && originUrl) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="font-bold text-4xl">Found</h1>
        <p className="text-muted-foreground">
          This content is available on {originHost}.
        </p>
        <Button onClick={handleAddGuest} variant="secondary">
          Add {originHost} as guest
        </Button>
      </div>
    );
  }

  // Nothing found anywhere
  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-bold text-4xl">Not found</h1>
    </div>
  );
}

export function NotFound({ apId }: { apId?: string }) {
  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <ToolbarButtons side="left">
            <ToolbarBackButton />
            <ToolbarTitle numRightIcons={1}>Not found</ToolbarTitle>
          </ToolbarButtons>
          <ToolbarButtons side="right">
            <UserDropdown />
          </ToolbarButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent>
        <ContentGutters className="py-6">
          {apId ? (
            <CrossInstanceResolver apId={apId} />
          ) : (
            <h1 className="font-bold text-4xl">Not found</h1>
          )}
        </ContentGutters>
      </IonContent>
    </IonPage>
  );
}

export default NotFound;
