import { ContentGutters } from "@/src/components/gutters";
import { MenuButton, UserDropdown } from "@/src/components/nav";
import { PageTitle } from "@/src/components/page-title";
import { PersonAvatar } from "@/src/components/person/person-avatar";
import { RelativeTime } from "@/src/components/relative-time";
import { ToolbarTitle } from "@/src/components/toolbar/toolbar-title";
import { Separator } from "@/src/components/ui/separator";
import { VirtualList } from "@/src/components/virtual-list";
import { usePrivateMessages } from "@/src/lib/api";
import { encodeApId } from "@/src/lib/api/utils";
import { cn, isNotNil } from "@/src/lib/utils";
import { Link } from "@/src/routing";
import { parseAccountInfo, useAuth } from "@/src/stores/auth";
import { IonContent, IonHeader, IonPage, IonToolbar } from "@ionic/react";
import _ from "lodash";
import { useMemo } from "react";
import LoginRequired from "../login-required";
import { ToolbarButtons } from "@/src/components/toolbar/toolbar-buttons";
import { removeMd } from "@/src/components/markdown/remove-md";
import { Skeleton } from "@/src/components/ui/skeleton";
import { Schemas } from "@/src/lib/api/adapters/api-blueprint";

const NO_ITEMS = "NO_ITEMS";
const EMPTY_ARR: never[] = [];

function ChatItemSkeleton() {
  return (
    <ContentGutters className="max-md:px-0">
      <div className="flex-1">
        <div className="flex gap-3 my-4 max-md:px-3.5">
          <Skeleton className="h-8 w-8 rounded-full" />
          <div className="flex flex-col flex-1 gap-2">
            <Skeleton className="h-5" />
            <Skeleton className="h-10" />
          </div>
        </div>
        <Separator />
      </div>
      <></>
    </ContentGutters>
  );
}

type ChatItem = Schemas.PrivateMessage & {
  hasUnread: boolean;
};

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
        } satisfies ChatItem;
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
          <ToolbarButtons side="left">
            <MenuButton />
            <ToolbarTitle numRightIcons={1}>Chats</ToolbarTitle>
          </ToolbarButtons>
          <ToolbarButtons side="right">
            <UserDropdown />
          </ToolbarButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent scrollY={false}>
        <VirtualList<ChatItem | typeof NO_ITEMS>
          scrollHost
          refresh={chats.refetch}
          estimatedItemSize={50}
          data={
            chats.chats.length === 0 && !chats.isRefetching && !chats.isPending
              ? [NO_ITEMS]
              : (chats.chats ?? EMPTY_ARR)
          }
          placeholder={<ChatItemSkeleton />}
          renderItem={({ item }) => {
            if (item === NO_ITEMS) {
              return (
                <ContentGutters>
                  <div className="flex-1 italic text-muted-foreground p-6 text-center">
                    <span>Nothing to see here</span>
                  </div>
                  <></>
                </ContentGutters>
              );
            }

            return (
              <Link
                to="/messages/chat/:userId"
                params={{ userId: encodeApId(getOtherPerson(item).apId) }}
              >
                <ContentGutters className="px-0">
                  <div className="overflow-hidden">
                    <div
                      className={cn(
                        "flex gap-3 my-4 max-md:px-3.5",
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
            );
          }}
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
