import { ContentGutters } from "@/src/components/gutters";
import { parseInt } from "lodash";
import { IonContent, IonHeader, IonToolbar, useIonAlert } from "@ionic/react";
import { useMemo } from "react";
import { UserDropdown } from "@/src/components/nav";
import { PageTitle } from "@/src/components/page-title";
import { useParams } from "@/src/routing";
import { getAccountSite, parseAccountInfo, useAuth } from "@/src/stores/auth";
import { Page } from "../../components/page";
import { PersonCard } from "@/src/components/person/person-card";
import { CommunityCard } from "@/src/components/communities/community-card";
import { ToolbarBackButton } from "@/src/components/toolbar/toolbar-back-button";
import { ToolbarTitle } from "@/src/components/toolbar/toolbar-title";
import { ToolbarButtons } from "@/src/components/toolbar/toolbar-buttons";
import { useProfileFromStore } from "@/src/stores/profiles";
import { useCommunityFromStore } from "@/src/stores/communities";
import { VirtualList } from "@/src/components/virtual-list";
import {
  useBlockPerson,
  useBlockCommunity,
  useBlockInstance,
} from "@/src/lib/api";
import { Button } from "@/src/components/ui/button";
import { PersonBadge } from "@/src/components/person/person-badge";
import { X } from "@/src/components/icons";

type ListItem =
  | { kind: "header"; label: string }
  | { kind: "person"; apId: string }
  | { kind: "community"; slug: string }
  | { kind: "instance"; domain: string; id: number };

function BlockedPersonItem({
  apId,
  account,
  alrt,
  blockPerson,
}: {
  apId: string;
  account: Parameters<typeof useProfileFromStore>[1];
  alrt: ReturnType<typeof useIonAlert>[0];
  blockPerson: ReturnType<typeof useBlockPerson>;
}) {
  const person = useProfileFromStore(apId, account);
  if (!person) {
    return null;
  }
  return (
    <ContentGutters className="py-0.5">
      <div className="flex items-center gap-2">
        <PersonCard
          actorId={person.apId}
          account={account}
          size="sm"
          disableLink
          disableHover
        />
        <PersonBadge person={person} size="sm" />
        <div className="flex-1" />
        <Button
          variant="ghost"
          size="icon"
          onClick={() =>
            alrt({
              message: `Unblock ${person.slug}`,
              buttons: [
                { text: "Cancel", role: "cancel" },
                {
                  text: "OK",
                  role: "confirm",
                  handler: () =>
                    blockPerson.mutate({
                      personId: person.id,
                      block: false,
                    }),
                },
              ],
            })
          }
        >
          <span className="sr-only">Unblock</span>
          <X />
        </Button>
      </div>
    </ContentGutters>
  );
}

function BlockedCommunityItem({
  slug,
  account,
  alrt,
  blockCommunity,
}: {
  slug: string;
  account: Parameters<typeof useCommunityFromStore>[1];
  alrt: ReturnType<typeof useIonAlert>[0];
  blockCommunity: ReturnType<typeof useBlockCommunity>;
}) {
  const community = useCommunityFromStore(slug, account);
  if (!community) {
    return null;
  }
  return (
    <ContentGutters className="py-0.5">
      <div className="flex items-center gap-2">
        <div className="flex-1 min-w-0">
          <CommunityCard
            size="sm"
            communitySlug={community.communityView.slug}
            disableLink
            account={account}
          />
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() =>
            alrt({
              message: `Unblock ${community.communityView.slug}`,
              buttons: [
                { text: "Cancel", role: "cancel" },
                {
                  text: "OK",
                  role: "confirm",
                  handler: () =>
                    blockCommunity.mutate({
                      communityId: community.communityView.id,
                      block: false,
                    }),
                },
              ],
            })
          }
        >
          <span className="sr-only">Unblock</span>
          <X />
        </Button>
      </div>
    </ContentGutters>
  );
}

export default function SettingsPage() {
  const { index: indexStr } = useParams("/settings/manage-blocks/:index");
  const index = parseInt(indexStr);

  const account = useAuth((s) => s.accounts[index]);

  const site = account ? getAccountSite(account) : null;

  const blockedPersonApIds = site?.personBlocks ?? [];
  const blockedCommunitySlugIds = site?.communityBlocks ?? [];
  const instanceBlocks = site?.instanceBlocks ?? [];

  const listData = useMemo(() => {
    const items: ListItem[] = [];
    if (blockedPersonApIds.length > 0) {
      items.push(
        { kind: "header", label: "BLOCKED USERS" },
        ...blockedPersonApIds.map(
          (apId): ListItem => ({ kind: "person", apId }),
        ),
      );
    }
    if (blockedCommunitySlugIds.length > 0) {
      items.push(
        { kind: "header", label: "BLOCKED COMMUNITIES" },
        ...blockedCommunitySlugIds.map(
          (slug): ListItem => ({ kind: "community", slug }),
        ),
      );
    }
    if (instanceBlocks.length > 0) {
      items.push(
        { kind: "header", label: "BLOCKED INSTANCES" },
        ...instanceBlocks.map(
          (item): ListItem => ({
            kind: "instance",
            domain: item.domain,
            id: item.id,
          }),
        ),
      );
    }
    return items;
  }, [blockedPersonApIds, blockedCommunitySlugIds, instanceBlocks]);

  const { person } = account
    ? parseAccountInfo(account)
    : { person: undefined };
  const slug = person?.slug;

  const [alrt] = useIonAlert();

  const blockPerson = useBlockPerson({ account });
  const blockCommunity = useBlockCommunity({ account });
  const blockInstance = useBlockInstance({ account });

  return (
    <Page notFound={!account}>
      <PageTitle>{slug ?? "Person"}</PageTitle>
      <IonHeader>
        <IonToolbar data-tauri-drag-region>
          <ToolbarButtons side="left">
            <ToolbarBackButton />
            <ToolbarTitle size="sm" numRightIcons={1}>
              {slug ?? "Person"}
            </ToolbarTitle>
          </ToolbarButtons>
          <ToolbarButtons side="right">
            <UserDropdown />
          </ToolbarButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent scrollY={false} fullscreen={true}>
        <VirtualList
          scrollHost
          data={listData}
          estimatedItemSize={53}
          renderItem={({ item }) => {
            if (item.kind === "header") {
              return (
                <ContentGutters className="pt-5 pb-2">
                  <h2 className="text-xs font-medium text-muted-foreground">
                    {item.label}
                  </h2>
                </ContentGutters>
              );
            }
            if (item.kind === "person") {
              return (
                <BlockedPersonItem
                  apId={item.apId}
                  account={account}
                  alrt={alrt}
                  blockPerson={blockPerson}
                />
              );
            }
            if (item.kind === "community") {
              return (
                <BlockedCommunityItem
                  slug={item.slug}
                  account={account}
                  alrt={alrt}
                  blockCommunity={blockCommunity}
                />
              );
            }
            return (
              <ContentGutters className="py-0.5">
                <div className="flex items-center gap-2">
                  <span className="flex-1 text-sm">{item.domain}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      alrt({
                        message: `Unblock ${item.domain}`,
                        buttons: [
                          { text: "Cancel", role: "cancel" },
                          {
                            text: "OK",
                            role: "confirm",
                            handler: () =>
                              blockInstance.mutate({
                                instanceId: item.id,
                                block: false,
                              }),
                          },
                        ],
                      })
                    }
                  >
                    <span className="sr-only">Unblock</span>
                    <X />
                  </Button>
                </div>
              </ContentGutters>
            );
          }}
        />
      </IonContent>
    </Page>
  );
}
