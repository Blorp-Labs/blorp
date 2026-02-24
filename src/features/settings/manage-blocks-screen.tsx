import { ContentGutters } from "@/src/components/gutters";
import _, { parseInt } from "lodash";
import { IonContent, IonHeader, IonToolbar, useIonAlert } from "@ionic/react";
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
import { useProfilesStore } from "@/src/stores/profiles";
import { useShallow } from "zustand/shallow";
import { useCommunitiesStore } from "@/src/stores/communities";
import { VirtualList } from "@/src/components/virtual-list";
import { useBlockPerson, useBlockCommunity } from "@/src/lib/api";
import { Button } from "@/src/components/ui/button";
import { PersonBadge } from "@/src/components/person/person-badge";
import { X } from "@/src/components/icons";

export default function SettingsPage() {
  const { index: indexStr } = useParams("/settings/manage-blocks/:index");
  const index = parseInt(indexStr);

  const account = useAuth((s) => s.accounts[index]);

  const site = account ? getAccountSite(account) : null;

  const cachePrefixer = useAuth((s) => s.getCachePrefixer);
  const blockedPersons = useProfilesStore(
    useShallow((s) =>
      _.compact(
        site?.personBlocks?.map(
          (p) => s.profiles[cachePrefixer(account)(p)]?.data,
        ),
      ),
    ),
  );
  const blockedCommunities = useCommunitiesStore(
    useShallow((s) =>
      _.compact(
        site?.communityBlocks?.map(
          (p) => s.communities[cachePrefixer(account)(p)]?.data.communityView,
        ),
      ),
    ),
  );

  const { person } = account
    ? parseAccountInfo(account)
    : { person: undefined };
  const slug = person?.slug;

  const [alrt] = useIonAlert();

  const blockPerson = useBlockPerson({ account });
  const blockCommunity = useBlockCommunity({ account });

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
          data={[
            "BLOCKED USERS",
            ...blockedPersons,
            "BLOCKED COMMUNITIES",
            ...blockedCommunities,
          ]}
          estimatedItemSize={53}
          renderItem={({ item }) => {
            if (_.isString(item)) {
              return (
                <ContentGutters className="pt-5 pb-2">
                  <h2 className="text-xs font-medium text-muted-foreground">
                    {item}
                  </h2>
                </ContentGutters>
              );
            }

            if ("avatar" in item) {
              return (
                <ContentGutters className="py-0.5">
                  <div className="flex items-center gap-2">
                    <PersonCard
                      actorId={item.apId}
                      account={account}
                      size="sm"
                      disableLink
                      disableHover
                    />
                    <PersonBadge person={item} size="sm" />
                    <div className="flex-1" />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        alrt({
                          message: `Unblock ${item.slug}`,
                          buttons: [
                            { text: "Cancel", role: "cancel" },
                            {
                              text: "OK",
                              role: "confirm",
                              handler: () =>
                                blockPerson.mutate({
                                  personId: item.id,
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

            return (
              <ContentGutters className="py-0.5">
                <div className="flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <CommunityCard
                      size="sm"
                      communitySlug={item.slug}
                      disableLink
                      account={account}
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      alrt({
                        message: `Unblock ${item.slug}`,
                        buttons: [
                          { text: "Cancel", role: "cancel" },
                          {
                            text: "OK",
                            role: "confirm",
                            handler: () =>
                              blockCommunity.mutate({
                                communityId: item.id,
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
