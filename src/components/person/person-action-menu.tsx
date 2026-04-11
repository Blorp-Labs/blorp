import dayjs from "dayjs";
import localizedFormat from "dayjs/plugin/localizedFormat";
import { EllipsisActionMenu, SubAction } from "../adaptable/action-menu";
import { encodeApId } from "@/src/apis/utils";
import { Deferred } from "@/src/lib/deferred";
import { useIonAlert, useIonRouter } from "@ionic/react";
import { useRequireAuth } from "../auth-context";
import { useBlockPersonMutation } from "@/src/queries";
import {
  getAccountActorId,
  useAuth,
  useIsPersonBlocked,
} from "@/src/stores/auth";
import { useShareActions } from "@/src/components/adaptable/action-menu/hooks";
import { resolveRoute } from "../../routing/index";
import { Schemas } from "@/src/apis/api-blueprint";
import { useTagUserStore } from "@/src/stores/user-tags";
import { useTagUser } from "@/src/hooks/use-tag-user";
import { useLinkContext } from "@/src/hooks/navigation-hooks";

dayjs.extend(localizedFormat);

export function usePersonActions({
  person,
  personLabel = "user",
}: {
  person?: Schemas.Person;
  personLabel?: string;
}): SubAction[] {
  const tag = useTagUserStore((s) =>
    person ? s.userTags[person.handle] : undefined,
  );

  const [alrt] = useIonAlert();

  const router = useIonRouter();
  const myUserId = useAuth((s) => getAccountActorId(s.getSelectedAccount()));

  const requireAuth = useRequireAuth();

  const handle = person ? person.handle : undefined;

  const blockPerson = useBlockPersonMutation({
    apId: person?.apId,
  });

  const tagUser = useTagUser();

  const linkCtx = useLinkContext();
  const shareActions = useShareActions(
    personLabel,
    person
      ? {
          type: "person",
          apId: person.apId,
          handle: person.handle,
          route: resolveRoute(`${linkCtx.root}u/:userId`, {
            userId: encodeApId(person.apId),
          }),
        }
      : null,
  );

  const isBlocked = useIsPersonBlocked(person?.apId);

  return [
    ...(person && !isBlocked
      ? [
          {
            text: `Message ${personLabel}`,
            onClick: () =>
              router.push(
                resolveRoute("/messages/chat/:userId", {
                  userId: encodeApId(person?.apId),
                }),
              ),
          },
          {
            text: `Tag ${personLabel}`,
            onClick: async () => {
              tagUser(person.handle, tag);
            },
          },
          ...shareActions,
        ]
      : []),
    ...(person && person.apId !== myUserId
      ? [
          {
            text: `${isBlocked ? "Unblock" : "Block"} ${personLabel}`,
            onClick: async () => {
              try {
                await requireAuth();
                const deferred = new Deferred();
                alrt({
                  message: `${isBlocked ? "Unblock" : "Block"} ${handle ?? "person"}`,
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
    <EllipsisActionMenu
      header="User actions"
      align="end"
      actions={actions}
      aria-label="User actions"
    />
  );
}
