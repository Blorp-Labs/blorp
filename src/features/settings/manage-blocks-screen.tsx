import { ContentGutters } from "@/src/components/gutters";
import _, { parseInt } from "lodash";
import { IonContent, IonHeader, IonToolbar } from "@ionic/react";
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
                  <PersonCard
                    actorId={item.apId}
                    account={account}
                    size="sm"
                    disableLink
                    disableHover
                  />
                </ContentGutters>
              );
            }

            return (
              <ContentGutters className="py-0.5">
                <CommunityCard
                  size="sm"
                  communitySlug={item.slug}
                  disableLink
                  account={account}
                />
              </ContentGutters>
            );
          }}
        />

        {/* <ContentGutters className="pt-4 max-md:px-3.5"> */}
        {/*   <div className="flex flex-col gap-8"> */}
        {/*     <Section title="BLOCKED USERS"> */}
        {/*       {blockedPersons?.map((p) => { */}
        {/*         return ( */}
        {/*           <SectionItem */}
        {/*             key={p.apId} */}
        {/*             onClick={() => */}
        {/*               getConfirmation({ */}
        {/*                 message: `Unblock ${p.slug}`, */}
        {/*               }).then(() => */}
        {/*                 blockPerson.mutate({ */}
        {/*                   personId: p.id, */}
        {/*                   block: false, */}
        {/*                 }), */}
        {/*               ) */}
        {/*             } */}
        {/*           > */}
        {/*             <PersonCard */}
        {/*               actorId={p.apId} */}
        {/*               account={account} */}
        {/*               size="sm" */}
        {/*               disableLink */}
        {/*             /> */}
        {/*           </SectionItem> */}
        {/*         ); */}
        {/*       })} */}
        {/*     </Section> */}
        {/**/}
        {/*     <Section title="BLOCKED COMMUNITIES"> */}
        {/*       {blockedCommunities?.map((c) => { */}
        {/*         return ( */}
        {/*           <SectionItem */}
        {/*             key={c.apId} */}
        {/*             onClick={() => */}
        {/*               getConfirmation({ */}
        {/*                 message: `Unblock ${c.slug}`, */}
        {/*               }).then(() => */}
        {/*                 blockCommunity.mutate({ */}
        {/*                   communityId: c.id, */}
        {/*                   block: false, */}
        {/*                 }), */}
        {/*               ) */}
        {/*             } */}
        {/*           > */}
        {/*             <CommunityCard */}
        {/*               size="sm" */}
        {/*               communitySlug={c.slug} */}
        {/*               disableLink */}
        {/*               account={account} */}
        {/*             /> */}
        {/*           </SectionItem> */}
        {/*         ); */}
        {/*       })} */}
        {/*     </Section> */}
        {/*   </div> */}
        {/* </ContentGutters> */}
      </IonContent>
    </Page>
  );
}
