import dayjs from "dayjs";
import localizedFormat from "dayjs/plugin/localizedFormat";
import { ActionMenu, ActionMenuProps } from "../adaptable/action-menu";
import { IoEllipsisHorizontal } from "react-icons/io5";
import { encodeApId } from "@/src/lib/api/utils";
import { openUrl } from "@/src/lib/linking";
import { Deferred } from "@/src/lib/deferred";
import { useIonAlert, useIonRouter } from "@ionic/react";
import { useRequireAuth } from "../auth-context";
import { useConfirmationAlert } from "@/src/lib/hooks/index";
import { useBlockInstance, useBlockPerson } from "@/src/lib/api";
import {
  getAccountActorId,
  useAuth,
  useIsInstanceBlocked,
  useIsPersonBlocked,
} from "@/src/stores/auth";
import { useShareActions } from "@/src/lib/share";
import { resolveRoute } from "../../routing/index";
import { Schemas } from "@/src/lib/api/adapters/api-blueprint";
import { useTagUser, useTagUserStore } from "@/src/stores/user-tags";

dayjs.extend(localizedFormat);

export function usePersonActions({
  person,
}: {
  person?: Schemas.Person;
}): ActionMenuProps["actions"] {
  const tag = useTagUserStore((s) =>
    person ? s.userTags[person.slug] : undefined,
  );

  const [alrt] = useIonAlert();

  const router = useIonRouter();
  const myUserId = useAuth((s) => getAccountActorId(s.getSelectedAccount()));

  const requireAuth = useRequireAuth();

  const slug = person ? person.slug : undefined;

  const blockPerson = useBlockPerson({
    apId: person?.apId,
  });

  const tagUser = useTagUser();

  const shareActions = useShareActions(
    "person",
    person
      ? {
          type: "person",
          apId: person.apId,
          slug: person.slug,
          route: resolveRoute("/messages/chat/:userId", {
            userId: encodeApId(person.apId),
          }),
        }
      : null,
  );

  const isBlocked = useIsPersonBlocked(person?.apId);
  const isInstanceBlocked = useIsInstanceBlocked(person?.instanceId);
  const blockInstance = useBlockInstance();
  const getConfirmation = useConfirmationAlert();

  return [
    ...(person && !isBlocked
      ? [
          {
            text: "Message user",
            onClick: () =>
              router.push(
                resolveRoute("/messages/chat/:userId", {
                  userId: encodeApId(person?.apId),
                }),
              ),
          },
          ...shareActions,
          {
            text: "Tag user",
            onClick: async () => {
              tagUser(person.slug, tag);
            },
          },
          {
            text: "View user source",
            onClick: async () => {
              try {
                openUrl(person.apId);
              } catch {
                // TODO: handle error
              }
            },
          },
        ]
      : []),
    ...(person && person.apId !== myUserId && person.instanceId
      ? [
          {
            text: isInstanceBlocked ? "Unblock instance" : "Block instance",
            onClick: async () => {
              try {
                await requireAuth();
                const domain = new URL(person.apId).hostname;
                await getConfirmation({
                  message: `${isInstanceBlocked ? "Unblock" : "Block"} ${domain}`,
                });
                blockInstance.mutate({
                  instanceId: person.instanceId!,
                  block: !isInstanceBlocked,
                });
              } catch {}
            },
            danger: true,
          },
        ]
      : []),
    ...(person && person.apId !== myUserId
      ? [
          {
            text: isBlocked ? "Unblock user" : "Block user",
            onClick: async () => {
              try {
                await requireAuth();
                const deferred = new Deferred();
                alrt({
                  message: `${isBlocked ? "Unblock" : "Block"} ${slug ?? "person"}`,
                  buttons: [
                    {
                      text: "Cancel",
                      role: "cancel",
                      handler: () => deferred.reject(),
                    },
                    {
                      text: "OK",
                      role: "confirm",
                      handler: () => deferred.resolve(),
                    },
                  ],
                });
                await deferred.promise;
                blockPerson.mutate({
                  personId: person?.id,
                  block: !isBlocked,
                });
              } catch {}
            },
            danger: true,
          },
        ]
      : []),
  ];
}

export function PersonActionMenu({ person }: { person?: Schemas.Person }) {
  const actions = usePersonActions({ person });
  return (
    <ActionMenu
      header="User actions"
      align="end"
      actions={actions}
      trigger={
        <IoEllipsisHorizontal className="text-muted-foreground mt-0.5" />
      }
    />
  );
}
