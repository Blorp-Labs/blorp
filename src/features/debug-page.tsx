import { IonContent, IonHeader, IonToolbar } from "@ionic/react";
import { Page } from "../components/page";
import { ContentGutters } from "../components/gutters";
import { ToolbarButtons } from "../components/toolbar/toolbar-buttons";
import { ToolbarTitle } from "../components/toolbar/toolbar-title";
import { MenuButton, UserDropdown } from "../components/nav";
import { Account } from "../stores/auth";
import { useApiClients } from "../lib/api";
import { useEffect, useState } from "react";
import { ApiBlueprint } from "../lib/api/adapters/api-blueprint";
import { cn } from "../lib/utils";

function Instance({
  account,
  api,
}: {
  account: Account;
  api: Promise<ApiBlueprint<any>>;
}) {
  const [isReachable, setIsReachable] = useState<boolean | null>(null);
  const [site, setSite] = useState<boolean | null>(null);

  useEffect(() => {
    api
      .then((api) => {
        setIsReachable(true);
        api
          .getSite()
          .then(() => {
            setSite(true);
          })
          .catch(() => {
            setSite(false);
          });
      })
      .catch(() => setIsReachable(false));
  }, [api]);

  return (
    <div
      className={cn(
        "border p-3 rounded-md grid grid-cols-2 gap-2",
        (isReachable === false || site === false) && "text-destructive",
        isReachable === true && site === true && "text-green-600",
        (isReachable === null || site === null) && "animate-pulse",
      )}
    >
      <span className="col-span-2 text-foreground">{account.instance}</span>
      <span className="text-muted-foreground">Rechable: </span>
      <span className="text-end">
        {isReachable === null ? "loading" : isReachable ? "success" : "error"}
      </span>
      <span className="text-muted-foreground">Site fetch:</span>
      <span className="text-end">
        {site === null ? "loading" : site ? "success" : "error"}
      </span>
    </div>
  );
}

export default function DebugPage() {
  const { apis } = useApiClients();

  return (
    <Page>
      <IonHeader>
        <IonToolbar>
          <ToolbarButtons side="left">
            <MenuButton />
            <ToolbarTitle numRightIcons={1}>Debug</ToolbarTitle>
          </ToolbarButtons>
          <ToolbarButtons side="right">
            <UserDropdown />
          </ToolbarButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <ContentGutters className="py-4">
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
            {apis.map(({ account, api }) => (
              <Instance key={account.uuid} account={account} api={api} />
            ))}
          </div>
        </ContentGutters>
      </IonContent>
    </Page>
  );
}
