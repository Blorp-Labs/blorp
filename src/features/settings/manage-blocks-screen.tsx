import { ContentGutters } from "@/src/components/gutters";
import _, { parseInt } from "lodash";
import { IonContent, IonHeader, IonPage, IonToolbar } from "@ionic/react";
import { UserDropdown } from "@/src/components/nav";
import { PageTitle } from "@/src/components/page-title";
import { useParams } from "@/src/routing";
import { getAccountSite, parseAccountInfo, useAuth } from "@/src/stores/auth";
import NotFound from "../not-found";
import { PersonCard } from "@/src/components/person/person-card";
import { CommunityCard } from "@/src/components/communities/community-card";
import { SectionItem, Section } from "./shared-components";
import { useBlockCommunity, useBlockPerson } from "@/src/lib/api";
import { useConfirmationAlert } from "@/src/lib/hooks/index";
import { ToolbarBackButton } from "@/src/components/toolbar/toolbar-back-button";
import { ToolbarTitle } from "@/src/components/toolbar/toolbar-title";
import { ToolbarButtons } from "@/src/components/toolbar/toolbar-buttons";
import { useProfilesStore } from "@/src/stores/profiles";
import { useShallow } from "zustand/shallow";
import { useCommunitiesStore } from "@/src/stores/communities";

export default function SettingsPage() {
  const getConfirmation = useConfirmationAlert();

  const { index: indexStr } = useParams("/settings/manage-blocks/:index");
  const index = parseInt(indexStr);

  const account = useAuth((s) => s.accounts[index]);

  const blockCommunity = useBlockCommunity({ account });
  const blockPerson = useBlockPerson({ account });

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
        site?.personBlocks?.map(
          (p) => s.communities[cachePrefixer(account)(p)]?.data.communityView,
        ),
      ),
    ),
  );

  if (!account) {
    return <NotFound />;
  }

  const { person } = parseAccountInfo(account);
  const slug = person?.slug;

  return (
    <IonPage>
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
      <IonContent fullscreen={true}>
        <ContentGutters className="pt-4 max-md:px-3.5">
          <div className="flex flex-col gap-8">
            <Section title="BLOCKED USERS">
              {blockedPersons?.map((p) => {
                return (
                  <SectionItem
                    key={p.apId}
                    onClick={() =>
                      getConfirmation({
                        message: `Unblock ${p.slug}`,
                      }).then(() =>
                        blockPerson.mutate({
                          personId: p.id,
                          block: false,
                        }),
                      )
                    }
                  >
                    <PersonCard
                      actorId={p.apId}
                      account={account}
                      size="sm"
                      disableLink
                    />
                  </SectionItem>
                );
              })}
            </Section>

            <Section title="BLOCKED COMMUNITIES">
              {blockedCommunities?.map((c) => {
                return (
                  <SectionItem
                    key={c.apId}
                    onClick={() =>
                      getConfirmation({
                        message: `Unblock ${c.slug}`,
                      }).then(() =>
                        blockCommunity.mutate({
                          communityId: c.id,
                          block: false,
                        }),
                      )
                    }
                  >
                    <CommunityCard
                      size="sm"
                      communitySlug={c.slug}
                      disableLink
                      account={account}
                    />
                  </SectionItem>
                );
              })}
            </Section>
          </div>
        </ContentGutters>
      </IonContent>
    </IonPage>
  );
}
