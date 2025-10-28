import { useCreatePostStore } from "@/src/stores/create-post";
import { useIonAlert, useIonRouter } from "@ionic/react";
import { v4 as uuid } from "uuid";
import _ from "lodash";
import { Deferred } from "@/src/lib/deferred";
import { useAuth } from "@/src/stores/auth";
import { useCommunity } from "@/src/lib/api";
import { useCommunityFromStore } from "@/src/stores/communities";
import { resolveRoute } from "@/src/routing";

export function useCommunityCreatePost({
  communityName,
}: {
  communityName?: string;
}) {
  const [alrt] = useIonAlert();

  const router = useIonRouter();
  const drafts = useCreatePostStore((s) => s.drafts);
  const updateDraft = useCreatePostStore((s) => s.updateDraft);

  useCommunity({
    name: communityName,
  });
  const community = useCommunityFromStore(communityName)?.communityView;

  return async () => {
    if (!community) {
      return;
    }
    let createPostId = _.entries(drafts).find(
      ([_id, { communitySlug }]) => communitySlug === community.slug,
    )?.[0];

    if (createPostId) {
      try {
        const deferred = new Deferred();
        alrt({
          message: `You have a draft post saved for ${communityName}. Would you like to continue where you left off?`,
          buttons: [
            {
              text: "New post",
              role: "cancel",
              handler: () => deferred.reject(),
            },
            {
              text: "Continue",
              role: "confirm",
              handler: () => deferred.resolve(),
            },
          ],
        });
        await deferred.promise;
      } catch {
        createPostId = uuid();
      }
    }
    createPostId ??= uuid();

    updateDraft(createPostId, {
      communitySlug: community.slug,
    });
    router.push(resolveRoute("/create_post", `?id=${createPostId}`));
  };
}

export function CommunityCreatePost({
  communityName,
  renderButton,
}: {
  communityName?: string;
  renderButton: (props: { onClick: () => void }) => void;
}) {
  const isLoggedIn = useAuth((s) => s.isLoggedIn());

  const createPost = useCommunityCreatePost({ communityName });

  if (!isLoggedIn || !communityName) {
    return null;
  }

  return <>{renderButton({ onClick: createPost })}</>;
}
