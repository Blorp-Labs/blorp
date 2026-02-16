import { ContentGutters } from "@/src/components/gutters";
import { MarkdownRenderer } from "@/src/components/markdown/renderer";
import { UserDropdown } from "@/src/components/nav";
import {
  useCreatePrivateMessage,
  useMarkPriavteMessageRead,
  usePrivateMessages,
} from "@/src/lib/api";
import { decodeApId } from "@/src/lib/api/utils";
import { cn } from "@/src/lib/utils";
import { useParams } from "@/src/routing";
import { parseAccountInfo, useAuth } from "@/src/stores/auth";
import { IonContent, IonHeader, IonToolbar } from "@ionic/react";
import _ from "lodash";
import {
  useCallback,
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState,
} from "react";
import { VirtualizerHandle, Virtualizer } from "virtua";
import dayjs from "dayjs";
import localizedFormat from "dayjs/plugin/localizedFormat";
import { useProfilesStore } from "@/src/stores/profiles";
import { PersonAvatar } from "@/src/components/person/person-avatar";
import TextareaAutosize from "react-textarea-autosize";
import { Send } from "@/src/components/icons";
import { Button } from "@/src/components/ui/button";
import { useIsActiveRoute, useMedia } from "@/src/lib/hooks";
import { ToolbarTitle } from "@/src/components/toolbar/toolbar-title";
import { PageTitle } from "@/src/components/page-title";
import { Schemas } from "@/src/lib/api/adapters/api-blueprint";
import { ToolbarBackButton } from "@/src/components/toolbar/toolbar-back-button";
import { ToolbarButtons } from "@/src/components/toolbar/toolbar-buttons";
import { useScrollToTopEvents } from "@/src/components/virtual-list";
import { getPreferedTimeFormat } from "@/src/lib/format";
import { Page } from "@/src/components/page";

const EMPTY_ARR: never[] = [];

dayjs.extend(localizedFormat);

export default function Messages() {
  const media = useMedia();

  const { mutateAsync: markMessageRead } = useMarkPriavteMessageRead();
  const otherActorId = decodeApId(useParams("/messages/chat/:userId").userId);

  const getCachePrefixer = useAuth((s) => s.getCachePrefixer);
  const person = useProfilesStore(
    (s) => s.profiles[getCachePrefixer()(otherActorId)]?.data,
  );
  const [signal, setSignal] = useState(0);
  const chat = usePrivateMessages({});

  const data = useMemo(() => {
    let prevDate: dayjs.Dayjs;

    return chat.data?.pages
      .flatMap((p) => p.privateMessages)
      .reverse()
      .filter(
        (pm) =>
          pm.recipientApId === otherActorId || pm.creatorApId === otherActorId,
      )
      .map((pm) => {
        const newDate = dayjs(pm.createdAt);

        let topOfDay = false;
        if (!newDate.isSame(prevDate, "date")) {
          topOfDay = true;
          prevDate = newDate;
        }
        prevDate ??= newDate;

        return {
          topOfDay,
          ...pm,
        };
      });
  }, [chat.data, otherActorId]);

  const account = useAuth((s) => s.getSelectedAccount());
  const { person: me } = parseAccountInfo(account);

  useEffect(() => {
    const fn = async () => {
      if (data && me) {
        for (const pm of data) {
          if (!pm.read && pm.creatorId !== me?.id) {
            await markMessageRead({
              id: pm.id,
              read: true,
            });
          }
        }
      }
    };
    fn();
  }, [data, me, markMessageRead]);

  const ref = useRef<VirtualizerHandle>(null);

  const scrollToBottom = useEffectEvent((smooth = true) => {
    const vList = ref.current;
    if (vList && data) {
      vList.scrollToIndex(data.length, { align: "end", smooth, offset: 100 });
    }
  });

  useEffect(() => {
    requestAnimationFrame(() => {
      scrollToBottom(false);
    });
  }, [chat.isPending, signal]);

  const active = useIsActiveRoute();
  useScrollToTopEvents({
    scrollToTop: useCallback(() => {
      const vList = ref.current;
      if (vList) {
        vList.scrollToIndex(0, { align: "start", smooth: true });
      }
    }, []),
    focused: active,
  });

  return (
    <Page requireLogin>
      <PageTitle>{person ? person.slug : null}</PageTitle>
      <IonHeader>
        <IonToolbar>
          <ToolbarButtons side="left">
            <ToolbarBackButton />
            <ToolbarTitle size="sm" numRightIcons={1}>
              {(person ? person.slug : null) ?? "Loading..."}
            </ToolbarTitle>
          </ToolbarButtons>
          <ToolbarButtons side="right">
            <UserDropdown />
          </ToolbarButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent scrollY={false}>
        <div className="h-full flex flex-col">
          <div
            className="flex-1 flex flex-col overflow-y-auto ion-content-scroll-host pt-5"
            style={{
              scrollbarGutter: media.xxl ? "stable" : undefined,
            }}
          >
            <Virtualizer
              key={signal}
              shift
              ref={ref}
              onScroll={() => {
                const vList = ref.current;
                if (vList) {
                  const startIndex = vList.findItemIndex(vList.scrollOffset);
                  if (
                    startIndex === 0 &&
                    !chat.isFetchingNextPage &&
                    chat.hasNextPage
                  ) {
                    chat.fetchNextPage();
                  }
                }
              }}
              data={data ?? EMPTY_ARR}
            >
              {(item) => {
                const isMe = item.creatorId === me?.id;
                return (
                  <ContentGutters key={item.id}>
                    <div className="flex-row pb-4 w-full">
                      {item.topOfDay && (
                        <span className="block pb-4 text-center text-xs text-muted-foreground">
                          {dayjs(item.createdAt).format("ll")}
                        </span>
                      )}
                      <div className="flex gap-2">
                        {!isMe && (
                          <PersonAvatar actorId={item.creatorApId} size="sm" />
                        )}
                        <div
                          className={cn(
                            "flex flex-col p-2.5 rounded-xl max-w-2/3",
                            isMe
                              ? "bg-violet-600 ml-auto"
                              : "rounded-tl-none bg-secondary",
                          )}
                        >
                          <MarkdownRenderer
                            className={cn(
                              isMe &&
                                "text-white [&_*]:text-white! [&_a]:underline",
                            )}
                            markdown={item.body}
                          />
                          <span
                            className={cn(
                              "self-end text-xs text-secondary-foreground/50 mt-1",
                              isMe && "text-white/85",
                            )}
                          >
                            {dayjs(item.createdAt).format(
                              getPreferedTimeFormat(),
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  </ContentGutters>
                );
              }}
            </Virtualizer>
            <div className="grow" />
          </div>
          {person && (
            <ComposeMessage
              recipient={person}
              onSubmit={() => {
                if (data) {
                  setSignal((s) => s + 1);
                }
              }}
            />
          )}
        </div>
      </IonContent>
    </Page>
  );
}

function ComposeMessage({
  recipient,
  onSubmit,
}: {
  recipient: Schemas.Person;
  onSubmit: () => void;
}) {
  const createPrivateMessage = useCreatePrivateMessage(recipient);
  const [body, setBody] = useState("");
  return (
    <ContentGutters>
      <form
        className="my-1 flex items-center gap-2 border rounded-2xl pr-1 focus-within:ring"
        onSubmit={(e) => {
          e.preventDefault();
          if (body.trim().length > 0) {
            createPrivateMessage.mutateAsync({
              body: body,
              recipientId: recipient.id,
            });
            onSubmit();
            setBody("");
          }
        }}
      >
        <TextareaAutosize
          placeholder="Message"
          className="pl-3 py-1 flex-1 outline-none resize-none min-h-8"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxRows={6}
        />
        <Button
          size="icon"
          variant={body.length === 0 ? "secondary" : "default"}
          className="-rotate-90 h-6.5 w-6.5"
        >
          <Send />
        </Button>
      </form>
    </ContentGutters>
  );
}
