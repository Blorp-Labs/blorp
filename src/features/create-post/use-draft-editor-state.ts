import { v4 as uuid } from "uuid";
import _ from "lodash";
import z from "zod";
import {
  Draft,
  isEmptyDraft,
  newDraft,
  useCreatePostStore,
} from "../../stores/create-post";
import { useUrlSearchState } from "../../hooks";
import { useRecentCommunitiesStore } from "@/src/stores/recent-communities";
import { create } from "zustand";
import { useCallback } from "react";

const useFallbackUuid = create<{
  uuid: string;
  reset: () => void;
}>((set) => ({
  uuid: uuid(),
  reset: () => set({ uuid: uuid() }),
}));

export function useDraftIdUrlParam() {
  return useUrlSearchState("id", null, z.string().uuid().nullable());
}

export function useDraftFromUrl() {
  const mostRecentCommunity = useRecentCommunitiesStore(
    (s) => s.recentlyVisited[0],
  );

  const idUrlParam = useDraftIdUrlParam();
  const titleParam = useUrlSearchState("title", "", z.string());
  const urlParam = useUrlSearchState("url", "", z.string());
  const bodyParam = useUrlSearchState("body", "", z.string());
  const nsfwParam = useUrlSearchState(
    "nsfw",
    undefined,
    z
      .union([
        z.literal("1"),
        z.literal("0"),
        z.literal("true"),
        z.literal("false"),
      ])
      .optional(),
  );

  const title = titleParam.value;
  const url = urlParam.value;
  const body = bodyParam.value;
  const nsfw = nsfwParam.value;

  const draft = newDraft();

  if (_.isNil(idUrlParam.value) && (title || url || body || nsfw)) {
    if (title) {
      draft.title = title;
    }
    if (url) {
      draft.url = url;
      draft.type = "link";
    }
    if (body) {
      draft.body = body;
    }
    if (nsfw === "1" || nsfw === "true") {
      draft.nsfw = true;
    }
  } else {
    draft.communitySlug = mostRecentCommunity?.slug;
  }

  const removeTitle = titleParam.remove;
  return {
    draft,
    reset: useCallback(
      () =>
        removeTitle()
          .and(urlParam.remove)
          .and(bodyParam.remove)
          .and(nsfwParam.remove),
      [removeTitle, urlParam.remove, bodyParam.remove, nsfwParam.remove],
    ),
  };
}

export function useDraftEditorState() {
  const resetFallbackUuid = useFallbackUuid((s) => s.reset);
  const fallbackUuid = useFallbackUuid((s) => s.uuid);

  const initDraft = useDraftFromUrl();
  const draftIdParam = useDraftIdUrlParam();

  const draftId = useCreatePostStore((s) => {
    if (draftIdParam.value && _.isString(draftIdParam.value)) {
      return draftIdParam.value;
    }

    // TODO: do we need this?
    if (!isEmptyDraft(initDraft.draft)) {
      return fallbackUuid;
    }

    const [firstKey] = _.entries(s.drafts).sort(
      ([_a, a], [_b, b]) => b.createdAt - a.createdAt,
    );

    return firstKey?.[0] ?? fallbackUuid;
  });

  const draftFromStore = useCreatePostStore((s) => {
    return s.drafts[draftId];
  });
  const draft = draftFromStore ?? initDraft.draft;

  const _patchDraft = useCreatePostStore((s) => s.updateDraft);
  const patchDraft = (key: string, patch: Partial<Draft>) => {
    const patchKeys = _.keys(patch);
    if (
      patchKeys.length === 1 &&
      patchKeys[0] === "body" &&
      !draft.body &&
      !patch.body
    ) {
      // THIS IS A HACK
      // This ignored the empty body our markdown render fires on init load
      return;
    }
    _patchDraft(key, {
      ...draft,
      ...patch,
    });
    initDraft.reset();
  };

  const resetInitDraft = initDraft.reset;

  return {
    draftId,
    draft,
    isInitState: !draftFromStore,
    patchDraft,
    reset: useCallback(() => {
      resetInitDraft().and(draftIdParam.remove);
      resetFallbackUuid();
    }, [resetInitDraft, draftIdParam.remove, resetFallbackUuid]),
  };
}
