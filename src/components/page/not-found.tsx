import { IonContent, IonHeader, IonToolbar, useIonRouter } from "@ionic/react";
import { ContentGutters } from "../gutters";
import { UserDropdown } from "../nav";
import { ToolbarBackButton } from "../toolbar/toolbar-back-button";
import { ToolbarTitle } from "../toolbar/toolbar-title";
import { ToolbarButtons } from "../toolbar/toolbar-buttons";
import { useResolveObject, useResolveObjectAcrossAccounts } from "../../api";
import { getAccountSite, parseAccountInfo, useAuth } from "../../stores/auth";
import { useMemo, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Button } from "../ui/button";
import { LuLoaderCircle } from "react-icons/lu";
import { IoPerson } from "react-icons/io5";
import { resolveRoute } from "../../routing";
import { encodeApId } from "../../api/utils";
import { Schemas } from "../../api-blueprint";
import { useRequireAuth } from "../auth-context";
import { apIdFromCommunitySlug } from "../../api/adapters/utils";
import { env } from "../../env";

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
  if (data.feed) {
    return resolveRoute("/home/f/:apId", {
      apId: encodeApId(data.feed.apId),
    });
  }
  return undefined;
}

function CrossInstanceResolver({
  apId,
  communitySlug,
}: {
  apId?: string;
  communitySlug?: string;
}) {
  const router = useIonRouter();
  const selectAccount = useAuth((s) => s.selectAccount);
  const addAccount = useAuth((s) => s.addAccount);
  const accounts = useAuth((s) => s.accounts);
  const requireAuth = useRequireAuth();
  const [expandSearch, setExpandSearch] = useState(false);
  const selectedInstance = useAuth(
    (s) => getAccountSite(s.getSelectedAccount())?.instance,
  );

  const resolvedApId = useMemo(
    () =>
      apId ??
      (communitySlug ? apIdFromCommunitySlug(communitySlug) : undefined),
    [apId, communitySlug],
  );

  const originHost = useMemo(() => {
    if (!resolvedApId) {
      return undefined;
    }
    try {
      return new URL(resolvedApId).host;
    } catch {
      return undefined;
    }
  }, [resolvedApId]);

  const objectFromSelectedInstance =
    originHost && selectedInstance?.includes(originHost);

  const crossAccountQuery = useResolveObjectAcrossAccounts(resolvedApId);
  const originQuery = useResolveObject(
    {
      q: resolvedApId,
      instance: originHost,
    },
    {
      enabled: expandSearch,
    },
  );

  const matches = crossAccountQuery.data ?? [];
  const isSearching = crossAccountQuery.isLoading;
  const hasMultipleAccounts = accounts.length > 1;

  const originUrl = useMemo(() => {
    if (!resolvedApId) {
      return undefined;
    }
    try {
      return new URL(resolvedApId).origin;
    } catch {
      return undefined;
    }
  }, [resolvedApId]);

  const originRedirectUrl = useMemo(() => {
    if (!originQuery.data) {
      return undefined;
    }
    return buildRedirectUrl(originQuery.data);
  }, [originQuery.data]);

  const handleSwitch = (accountUuid: string, result: Schemas.ResolveObject) => {
    const url = buildRedirectUrl(result);
    if (!url) {
      return;
    }
    selectAccount(accountUuid);
    router.push(url, "forward", "replace");
  };

  const handleAddGuest = () => {
    if (!originUrl || !originRedirectUrl) {
      return;
    }
    addAccount({ instance: originUrl });
    router.push(originRedirectUrl, "forward", "replace");
  };

  const handleLogin = async () => {
    if (!originUrl) {
      return;
    }
    addAccount({ instance: originUrl });
    try {
      await requireAuth({ addAccount: true });
      if (originRedirectUrl) {
        router.push(originRedirectUrl, "forward", "replace");
      }
    } catch {
      // User dismissed the login modal
    }
  };

  // Still searching across accounts
  if (isSearching && hasMultipleAccounts) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-4xl font-bold">Not found</h1>
        <div className="text-muted-foreground flex items-center gap-2">
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
        <h1 className="text-4xl font-bold">Not found</h1>
        <p className="text-muted-foreground">
          Not available on your current account, but found on:
        </p>
        <div className="flex flex-col gap-2">
          {matches.map((match) => {
            const { person, instance } = parseAccountInfo(match.account);
            const [name] = person?.slug.split("@") ?? [];
            return (
              <div
                key={match.account.uuid}
                className="flex items-center gap-3 rounded-lg border p-3"
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
                <div className="flex flex-1 flex-col text-sm">
                  <span>{name ?? "Guest"}</span>
                  <span className="text-muted-foreground">@{instance}</span>
                </div>
                <Button
                  size="sm"
                  onClick={() => handleSwitch(match.account.uuid, match.result)}
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

  if (
    !expandSearch &&
    !env.REACT_APP_LOCK_TO_DEFAULT_INSTANCE &&
    !objectFromSelectedInstance
  ) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-4xl font-bold">Not found</h1>
        <p className="text-muted-foreground">
          Not available on your {hasMultipleAccounts ? "accounts" : "account"}.
        </p>
        <Button variant="outline" onClick={() => setExpandSearch(true)}>
          Search {originHost}?
        </Button>
      </div>
    );
  }

  if (expandSearch && originQuery.isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-4xl font-bold">Not found</h1>
        <div className="text-muted-foreground flex items-center gap-2">
          <LuLoaderCircle className="animate-spin" />
          <span>Searching {originHost}...</span>
        </div>
      </div>
    );
  }

  if (expandSearch && originRedirectUrl && originUrl) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-4xl font-bold">Found</h1>
        <p className="text-muted-foreground">
          This content is available on {originHost}.
        </p>
        <div className="flex gap-2">
          <Button onClick={handleAddGuest} variant="secondary">
            Add {originHost} as guest
          </Button>
          <Button onClick={handleLogin}>Login to {originHost}</Button>
        </div>
      </div>
    );
  }

  // Nothing found anywhere
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-4xl font-bold">Not found</h1>
    </div>
  );
}

export function NotFoundPageContent({
  apId,
  communitySlug,
}: {
  apId?: string;
  communitySlug?: string;
}) {
  return (
    <>
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
          {apId || communitySlug ? (
            <CrossInstanceResolver apId={apId} communitySlug={communitySlug} />
          ) : (
            <h1 className="text-4xl font-bold">Not found</h1>
          )}
        </ContentGutters>
      </IonContent>
    </>
  );
}
