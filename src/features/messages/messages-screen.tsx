import { ContentGutters } from "@/src/components/gutters";
import { MenuButton, UserDropdown } from "@/src/components/nav";
import { PageTitle } from "@/src/components/page-title";
import { PersonAvatar } from "@/src/components/person/person-avatar";
import { RelativeTime } from "@/src/components/relative-time";
import { ToolbarTitle } from "@/src/components/toolbar/toolbar-title";
import { Separator } from "@/src/components/ui/separator";
import { VirtualList } from "@/src/components/virtual-list";
import { usePrivateMessages } from "@/src/lib/lemmy";
import { encodeApId } from "@/src/lib/lemmy/utils";
import { cn, isNotNil } from "@/src/lib/utils";
import { Link } from "@/src/routing";
import { parseAccountInfo, useAuth } from "@/src/stores/auth";
import {
  IonButtons,
  IonContent,
  IonHeader,
  IonPage,
  IonToolbar,
} from "@ionic/react";
import _ from "lodash";
import { useMemo } from "react";
import removeMd from "remove-markdown";
import LoginRequired from "../login-required";

const EMPTY_ARR: never[] = [];

function useChats() {
  const query = usePrivateMessages({});
  const account = useAuth((s) => s.getSelectedAccount());
  const { person: me } = parseAccountInfo(account);

  const chats = useMemo(() => {
    const messages = query.data?.pages.flatMap((p) => p.privateMessages);
    const byRecipient = _.groupBy(messages, (m) => m.creatorId + m.recipientId);
    const onePerRecipient = _.values(byRecipient)
      .map((item) => {
        const hasUnread = item.some((i) => i.creatorId !== me?.id && !i.read);
        return {
          ...item[0]!,
          hasUnread,
        };
      })
      .filter(isNotNil);
    onePerRecipient.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return onePerRecipient;
  }, [query.data, me?.id]);

  return {
    ...query,
    chats,
  };
}

export default function Messages() {
  const chats = useChats();
  const account = useAuth((s) => s.getSelectedAccount());
  const { person: me } = parseAccountInfo(account);

  const getOtherPerson = (item: (typeof chats.chats)[number]) => {
    return item.creatorApId === me?.apId
      ? {
          apId: item.recipientApId,
          slug: item.recipientSlug,
        }
      : {
          apId: item.creatorApId,
          slug: item.creatorSlug,
        };
  };

  const isLoggedIn = useAuth((s) => s.isLoggedIn());

  if (!isLoggedIn) {
    return <LoginRequired />;
  }

  return (
    <IonPage>
      <PageTitle>Chats</PageTitle>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start" className="gap-2">
            <MenuButton />
            <ToolbarTitle>Chats</ToolbarTitle>
          </IonButtons>
          <IonButtons slot="end">
            <UserDropdown />
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <VirtualList
          refresh={chats.refetch}
          estimatedItemSize={50}
          data={chats.chats ?? EMPTY_ARR}
          renderItem={({ item }) => (
            <Link
              to="/messages/chat/:userId"
              params={{ userId: encodeApId(getOtherPerson(item).apId) }}
            >
              <ContentGutters className="px-0">
                <div className="overflow-hidden">
                  <div
                    className={cn(
                      "flex gap-3 my-4 max-md:px-2.5",
                      item.hasUnread &&
                        "border-l-3 border-l-brand md:pl-2.5 max-md:ml-2.5",
                    )}
                  >
                    <PersonAvatar
                      actorId={getOtherPerson(item).apId}
                      size="sm"
                    />
                    <div className="flex flex-col gap-2 flex-1">
                      <div className="flex justify-between text-sm flex-1">
                        <span className="font-medium">
                          {getOtherPerson(item).slug}
                        </span>
                        <RelativeTime
                          time={item.createdAt}
                          className="text-muted-foreground"
                        />
                      </div>
                      <span className="text-muted-foreground text-sm line-clamp-2">
                        {removeMd(item.body)}
                      </span>
                    </div>
                  </div>
                  <Separator />
                </div>
                <></>
              </ContentGutters>
            </Link>
          )}
          onEndReached={() => {
            /* console.log({ ...chats }); */
            if (
              !chats.isFetching &&
              !chats.isFetchingNextPage &&
              chats.hasNextPage
            ) {
              chats.fetchNextPage();
            }
          }}
        />
      </IonContent>
    </IonPage>
  );
}
