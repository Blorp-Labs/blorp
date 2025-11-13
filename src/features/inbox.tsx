import { Link } from "@/src/routing/index";
import { VirtualList } from "@/src/components/virtual-list";
import { ContentGutters } from "@/src/components/gutters";
import { MarkdownRenderer } from "../components/markdown/renderer";
import { RelativeTime } from "@/src/components/relative-time";
import {
  useMarkAllRead,
  useMarkPersonMentionRead,
  useMarkReplyRead,
  useNotificationCount,
  usePersonMentions,
  useReplies,
} from "@/src/lib/api/index";
import { IonContent, IonHeader, IonPage, IonToolbar } from "@ionic/react";
import { MenuButton, UserDropdown } from "../components/nav";
import { PageTitle } from "../components/page-title";
import { cn } from "../lib/utils";
import { useMemo } from "react";
import _ from "lodash";
import { ToggleGroup, ToggleGroupItem } from "../components/ui/toggle-group";
import { useMedia } from "../lib/hooks";
import { useInboxStore } from "../stores/inbox";
import { Skeleton } from "../components/ui/skeleton";
import { ActionMenu } from "../components/adaptable/action-menu";
import { IoEllipsisHorizontal } from "react-icons/io5";
import { PersonAvatar } from "../components/person/person-avatar";
import { BadgeIcon } from "../components/badge-count";
import { DoubleCheck, Message, Person } from "../components/icons";
import { ToolbarTitle } from "../components/toolbar/toolbar-title";
import { useAuth } from "../stores/auth";
import LoginRequired from "./login-required";
import { Schemas } from "../lib/api/adapters/api-blueprint";
import { ToolbarButtons } from "../components/toolbar/toolbar-buttons";
import { Button } from "../components/ui/button";

const NO_ITEMS = "NO_ITEMS";
type Item =
  | typeof NO_ITEMS
  | { id: string; reply: Schemas.Reply }
  | {
      id: string;
      mention: Schemas.Mention;
    };

function Placeholder() {
  return (
    <ContentGutters>
      <div className="flex-1 flex mt-2.5 gap-3">
        <Skeleton className="h-8 w-8 rounded-full" />
        <div className="flex-1 flex flex-col gap-2">
          <Skeleton className="h-12" />
          <Skeleton className="h-5.5" />
          <Skeleton className="h-6 w-12 self-end" />
          <Skeleton className="h-px mt-0.5" />
        </div>
      </div>
      <></>
    </ContentGutters>
  );
}

function Mention({
  mention,
  noBorder = false,
}: {
  mention: Schemas.Mention;
  noBorder?: boolean;
}) {
  const markRead = useMarkPersonMentionRead();
  const path = mention.path.split(".");
  const parent = path.at(-2);
  const newPath = [parent !== "0" ? parent : undefined, mention.commentId]
    .filter(Boolean)
    .join(".");
  return (
    <ContentGutters className="px-0">
      <div className={cn("flex-1 max-md:px-3.5", !noBorder && "border-b")}>
        <div className="flex my-2.5 gap-3 items-start">
          <BadgeIcon
            icon={<Person className="h-full w-full text-muted-foreground" />}
          >
            <PersonAvatar actorId={mention.creatorApId} size="sm" />
          </BadgeIcon>
          <div
            className={cn(
              "flex-1 text-sm leading-6 block overflow-x-hidden",
              !mention.read && "border-l-3 border-l-brand pl-2",
            )}
          >
            <Link
              to={`/inbox/c/:communityName/posts/:post/comments/:comment`}
              params={{
                communityName: mention.communitySlug,
                post: encodeURIComponent(mention.postApId),
                comment: newPath,
              }}
              onClickCapture={() => {
                markRead.mutate({
                  id: mention.id,
                  read: true,
                });
              }}
            >
              <div className="flex flex-row flex-wrap">
                {mention.read ? null : <div />}
                <span>
                  <span className="font-bold">{mention.creatorSlug}</span>
                  <span> mentioned you in the post </span>
                  <span className="font-bold">{mention.postName}</span>
                </span>
              </div>
              <MarkdownRenderer
                markdown={mention.body}
                className="pb-2"
                disableLinks
              />
            </Link>
            <div className="flex flex-row justify-end gap-2 text-muted-foreground">
              <RelativeTime time={mention.createdAt} />
              <ActionMenu
                align="end"
                actions={[
                  {
                    text: mention.read ? "Mark unread" : "Mark read",
                    onClick: () =>
                      markRead.mutate({
                        id: mention.id,
                        read: !mention.read,
                      }),
                  },
                ]}
                trigger={<IoEllipsisHorizontal />}
              />
            </div>
          </div>
        </div>
      </div>
      <></>
    </ContentGutters>
  );
}

function Reply({
  replyView,
  noBorder = false,
}: {
  replyView: Schemas.Reply;
  noBorder?: boolean;
}) {
  const markRead = useMarkReplyRead();
  const path = replyView.path.split(".");
  const parent = path.at(-2);
  const newPath = [parent !== "0" ? parent : undefined, replyView.commentId]
    .filter(Boolean)
    .join(".");
  const hasParent = parent && parent !== "0";
  return (
    <ContentGutters className="px-0">
      <div className={cn("flex-1 max-md:px-3.5", !noBorder && "border-b")}>
        <div className="flex my-2.5 gap-3 items-start">
          <BadgeIcon
            icon={<Message className="h-full w-full text-muted-foreground" />}
          >
            <PersonAvatar actorId={replyView.creatorApId} size="sm" />
          </BadgeIcon>
          <div
            className={cn(
              "flex-1 text-sm leading-6 block overflow-x-hidden",
              !replyView.read && "border-l-3 border-l-brand pl-2",
            )}
          >
            <Link
              to={`/inbox/c/:communityName/posts/:post/comments/:comment`}
              params={{
                communityName: replyView.communitySlug,
                post: encodeURIComponent(replyView.postApId),
                comment: newPath,
              }}
              onClickCapture={() => {
                markRead.mutate({
                  id: replyView.id,
                  read: true,
                });
              }}
            >
              <div className="flex flex-row flex-wrap">
                {replyView.read ? null : <div />}
                <span>
                  <span className="font-bold">{replyView.creatorSlug}</span>
                  <span>
                    {" "}
                    replied to your {hasParent ? "comment" : "post"} in{" "}
                  </span>
                  <span className="font-bold">{replyView.postName}</span>
                </span>
              </div>
              <MarkdownRenderer
                markdown={replyView.body}
                className="pb-2"
                disableLinks
              />
            </Link>
            <div className="flex flex-row justify-end gap-2 text-muted-foreground">
              <RelativeTime time={replyView.createdAt} />
              <ActionMenu
                align="end"
                actions={[
                  {
                    text: replyView.read ? "Mark unread" : "Mark read",
                    onClick: () =>
                      markRead.mutate({
                        id: replyView.id,
                        read: !replyView.read,
                      }),
                  },
                ]}
                trigger={<IoEllipsisHorizontal />}
              />
            </div>
          </div>
        </div>
      </div>
      <></>
    </ContentGutters>
  );
}

export default function Inbox() {
  const media = useMedia();

  const type = useInboxStore((s) => s.inboxType);
  const setType = useInboxStore((s) => s.setInboxType);

  const replies = useReplies({
    unreadOnly: type === "unread",
  });
  const mentions = usePersonMentions({
    unreadOnly: type === "unread",
  });
  const isRefetching = replies.isRefetching || mentions.isRefetching;
  const isPending = replies.isPending || mentions.isPending;

  // This updates in the background,
  // but calling it here ensures the
  // count is updated when the user visits
  // the inbox page.
  useNotificationCount();

  const markAllRead = useMarkAllRead();

  const data = useMemo(() => {
    const data: (
      | { id: string; reply: Schemas.Reply }
      | { id: string; mention: Schemas.Mention }
    )[] = [];

    if (
      replies.data &&
      (type === "replies" || type === "all" || type === "unread")
    ) {
      data.push(
        ...replies.data.pages
          .flatMap((p) => p.replies)
          .map((reply) => ({
            reply,
            id: `r${reply.id}`,
          })),
      );
    }

    if (
      mentions.data &&
      (type === "mentions" || type === "all" || type === "unread")
    ) {
      data.push(
        ...(mentions.data?.pages
          .flatMap((p) => p.mentions)
          .map((mention) => ({
            mention,
            id: `m${mention.id}`,
          })) ?? []),
      );
    }

    data.sort((a, b) => {
      const aPublished = "reply" in a ? a.reply.createdAt : a.mention.createdAt;
      const bPublished = "reply" in b ? b.reply.createdAt : b.mention.createdAt;
      return bPublished.localeCompare(aPublished);
    });

    return _.uniqBy(data, "id");
  }, [type, replies.data, mentions.data]);

  const isLoggedIn = useAuth((s) => s.isLoggedIn());

  if (!isLoggedIn) {
    return <LoginRequired />;
  }

  return (
    <IonPage>
      <PageTitle>Inbox</PageTitle>
      <IonHeader>
        <IonToolbar data-tauri-drag-region>
          <ToolbarButtons side="left">
            <MenuButton />
            <ToolbarTitle numRightIcons={1}>Inbox</ToolbarTitle>
          </ToolbarButtons>
          <ToolbarButtons side="right">
            <UserDropdown />
          </ToolbarButtons>
        </IonToolbar>
        {media.maxMd && (
          <IonToolbar>
            <ToolbarButtons side="left">
              <ToggleGroup
                type="single"
                variant="outline"
                size="sm"
                value={type}
                onValueChange={(val) =>
                  val &&
                  setType(val as "all" | "unread" | "mentions" | "replies")
                }
              >
                <ToggleGroupItem value="all">All</ToggleGroupItem>
                <ToggleGroupItem value="unread">Unread</ToggleGroupItem>
                <ToggleGroupItem value="replies">Replies</ToggleGroupItem>
                <ToggleGroupItem value="mentions">Mentions</ToggleGroupItem>
              </ToggleGroup>
            </ToolbarButtons>
          </IonToolbar>
        )}
      </IonHeader>
      <IonContent scrollY={false}>
        <VirtualList<Item>
          key={type}
          header={[
            <ContentGutters className="max-md:hidden" key="type-select-header">
              <div className="py-1.5 flex flex-row justify-between bg-background border-b-[.5px]">
                <ToggleGroup
                  type="single"
                  variant="outline"
                  size="sm"
                  value={type}
                  onValueChange={(val) =>
                    val &&
                    setType(val as "all" | "unread" | "mentions" | "replies")
                  }
                >
                  <ToggleGroupItem value="all">All</ToggleGroupItem>
                  <ToggleGroupItem value="unread">Unread</ToggleGroupItem>
                  <ToggleGroupItem value="replies">Replies</ToggleGroupItem>
                  <ToggleGroupItem value="mentions">Mentions</ToggleGroupItem>
                </ToggleGroup>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => markAllRead.mutate()}
                >
                  <DoubleCheck />
                </Button>
              </div>
              <></>
            </ContentGutters>,
          ]}
          stickyIndicies={[0]}
          data={
            data.length === 0 && !isRefetching && !isPending ? [NO_ITEMS] : data
          }
          renderItem={({ item }) => {
            if (item === NO_ITEMS) {
              return (
                <ContentGutters>
                  <div className="flex-1 italic text-muted-foreground p-6 text-center">
                    <span>No {type !== "all" ? type : "notifications"}</span>
                  </div>
                  <></>
                </ContentGutters>
              );
            }

            if ("reply" in item) {
              const reply = item.reply;
              return <Reply replyView={reply} />;
            }

            if ("mention" in item) {
              const mention = item.mention;
              return <Mention mention={mention} />;
            }

            return null;
          }}
          onEndReached={() => {
            if (
              !replies.isFetchingNextPage &&
              replies.hasNextPage &&
              (type === "all" || type === "replies")
            ) {
              replies.fetchNextPage();
            }
            if (
              !mentions.isFetchingNextPage &&
              mentions.hasNextPage &&
              (type === "all" || type === "mentions")
            ) {
              mentions.fetchNextPage();
            }
          }}
          estimatedItemSize={375}
          scrollHost
          refresh={replies.refetch}
          placeholder={<Placeholder />}
        />
      </IonContent>
    </IonPage>
  );
}
