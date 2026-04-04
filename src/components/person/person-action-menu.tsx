import dayjs from "dayjs";
import localizedFormat from "dayjs/plugin/localizedFormat";
import { EllipsisActionMenu, SubAction } from "../adaptable/action-menu";
import { encodeApId } from "@/src/api/utils";
import { Deferred } from "@/src/lib/deferred";
import { useIonAlert, useIonRouter } from "@ionic/react";
import { useRequireAuth } from "../auth-context";
import { useBlockPerson } from "@/src/api";
import {
  getAccountActorId,
  useAuth,
  useIsPersonBlocked,
} from "@/src/stores/auth";
import { useShareActions } from "@/src/hooks/share";
import { resolveRoute } from "../../routing/index";
import { Schemas } from "@/src/api/adapters/api-blueprint";
import { useTagUser, useTagUserStore } from "@/src/stores/user-tags";
import { useLinkContext } from "@/src/routing/link-context";

dayjs.extend(localizedFormat);

export function usePersonActions({
  person,
  personLabel = "user",
}: {
  person?: Schemas.Person;
  personLabel?: string;
}): SubAction[] {
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

  const linkCtx = useLinkContext();
  const shareActions = useShareActions(
    personLabel,
    person
      ? {
          type: "person",
          apId: person.apId,
          slug: person.slug,
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
              tagUser(person.slug, tag);
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
    <EllipsisActionMenu
      header="User actions"
      align="end"
      actions={actions}
      aria-label="User actions"
    />
  );
}
