import { IonContent, IonHeader, IonToolbar } from "@ionic/react";
import { Page } from "../components/page";
import { ContentGutters } from "../components/gutters";
import { ToolbarButtons } from "../components/toolbar/toolbar-buttons";
import { ToolbarTitle } from "../components/toolbar/toolbar-title";
import { MenuButton, UserDropdown } from "../components/nav";
import { useInstances } from "../lib/api";
import { useEffect, useEffectEvent, useMemo, useState } from "react";
import { cn } from "../lib/utils";
import { apiClient } from "../lib/api/adapters/client";
import { Avatar, AvatarImage } from "../components/ui/avatar";
import { Button } from "../components/ui/button";
import _ from "lodash";

function getSortValue(status: string) {
  switch (status) {
    case "success":
      return 2;
    case "error":
      return 1;
    default:
      return 0;
  }
}

function Instance({
  host,
  icon,
  onSuccess,
  onError,
}: {
  host: string;
  icon?: string;
  onSuccess: () => void;
  onError: () => void;
}) {
  const [isReachable, setIsReachable] = useState<boolean | null>(null);
  const [site, setSite] = useState<boolean | null>(null);

  const onSuccessEvent = useEffectEvent(onSuccess);
  const onErrorEvent = useEffectEvent(onError);

  useEffect(() => {
    try {
      apiClient({ instance: host })
        .then((api) => {
          setIsReachable(true);
          api
            .getSite()
            .then(() => {
              setSite(true);
              onSuccessEvent();
            })
            .catch(() => {
              setSite(false);
              onErrorEvent();
            });
        })
        .catch(() => {
          setIsReachable(false);
          setSite(false);
          onErrorEvent();
        });
    } catch {}
  }, [host]);

  return (
    <div
      className={cn(
        "border p-3 rounded-md grid grid-cols-2 gap-2",
        (isReachable === false || site === false) && "text-destructive",
        isReachable === true && site === true && "text-green-600",
        (isReachable === null || site === null) && "animate-pulse",
      )}
    >
      <div className="col-span-2 text-foreground flex flex-row items-center gap-2">
        {icon && (
          <Avatar className="h-6 w-6">
            <AvatarImage src={icon} className="object-cover" />
          </Avatar>
        )}
        <span>{host}</span>
      </div>
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
  const instances = useInstances();
  const [run, setRun] = useState(false);
  const [status, setStatus] = useState<Record<string, "success" | "error">>({});
  const data = useMemo(() => {
    if (!instances.data) {
      return [];
    }
    return _.sortBy(instances.data, "host").map((instance) => {
      return {
        instance,
        status: status[instance.host] ?? "pending",
      };
    });
  }, [instances.data, status]);
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
          {!run ? (
            <div>
              <p className="mb-2">
                Clicking run will run a quick test to check access to{" "}
                {instances.data?.length} Lemmy and PieFed instances.
              </p>
              <Button variant="outline" onClick={() => setRun(true)}>
                Run Test
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {_.entries(_.groupBy(data, "status"))
                .sort(([a], [b]) => getSortValue(a) - getSortValue(b))
                .map(([key, value]) => (
                  <div key={key}>
                    <span className="block mb-2">{_.capitalize(key)}</span>
                    <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                      {value.map(({ instance }) => (
                        <Instance
                          key={instance.host}
                          host={instance.host}
                          icon={instance.icon}
                          onSuccess={() =>
                            setStatus((prev) => ({
                              ...prev,
                              [instance.host]: "success" as const,
                            }))
                          }
                          onError={() =>
                            setStatus((prev) => ({
                              ...prev,
                              [instance.host]: "error" as const,
                            }))
                          }
                        />
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </ContentGutters>
      </IonContent>
    </Page>
  );
}
