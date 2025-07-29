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
import {
  IonButtons,
  IonContent,
  IonHeader,
  IonPage,
  IonToolbar,
} from "@ionic/react";
import _ from "lodash";
import { useEffect, useMemo, useRef, useState } from "react";
import { VList, VListHandle } from "virtua";
import dayjs from "dayjs";
import updateLocale from "dayjs/plugin/updateLocale";
import { useProfilesStore } from "@/src/stores/profiles";
import { PersonAvatar } from "@/src/components/person/person-avatar";
import TextareaAutosize from "react-textarea-autosize";
import { Send } from "@/src/components/icons";
import { Button } from "@/src/components/ui/button";
import { useMedia } from "@/src/lib/hooks";
import { ToolbarTitle } from "@/src/components/toolbar/toolbar-title";
import { PageTitle } from "@/src/components/page-title";
import LoginRequired from "../login-required";
import { Schemas } from "@/src/lib/api/adapters/api-blueprint";
import { ToolbarBackButton } from "@/src/components/toolbar/toolbar-back-button";

dayjs.extend(updateLocale);

export default function Messages() {
  const media = useMedia();

  const markMessageRead = useMarkPriavteMessageRead();
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
            await markMessageRead.mutateAsync({
              id: pm.id,
              read: true,
            });
          }
        }
      }
    };
    fn();
  }, [data, me]);

  const ref = useRef<VListHandle>(null);
  useEffect(() => {
    if (data) {
      ref.current?.scrollToIndex(data.length);
    }
  }, [chat.isPending, signal]);

  const isLoggedIn = useAuth((s) => s.isLoggedIn());

  if (!isLoggedIn) {
    return <LoginRequired />;
  }

  return (
    <IonPage>
      <PageTitle>{person ? person.slug : null}</PageTitle>
      <IonHeader>
        <IonToolbar>
          <IonButtons className="gap-2">
            <ToolbarBackButton />
            <ToolbarTitle size="sm">
              {(person ? person.slug : null) ?? "Loading..."}
            </ToolbarTitle>
          </IonButtons>
          <IonButtons slot="end">
            <UserDropdown />
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent scrollY={false}>
        <div className="h-full flex flex-col">
          <VList
            key={signal}
            className="pt-5 ion-content-scroll-host"
            style={{
              scrollbarGutter: media.xxl ? "stable" : undefined,
            }}
            shift
            ref={ref}
            onScroll={() => {
              if (ref.current?.findStartIndex() === 0) {
                if (!chat.isFetchingNextPage && chat.hasNextPage) {
                  chat.fetchNextPage();
                }
              }
            }}
          >
            {data?.map((item) => {
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
                      <MarkdownRenderer
                        markdown={item.body}
                        className={cn(
                          "p-2.5 rounded-xl max-w-2/3",
                          isMe
                            ? "bg-brand-secondary text-white ml-auto [&_*]:text-white! [&_a]:underline"
                            : "rounded-tl-none bg-secondary",
                        )}
                      />
                    </div>
                  </div>
                </ContentGutters>
              );
            })}
          </VList>
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
    </IonPage>
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
