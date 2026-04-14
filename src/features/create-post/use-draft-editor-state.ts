import { useState } from "react";
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

export function useDraftIdUrlParam() {
  return useUrlSearchState("id", null, z.string().uuid().nullable());
}

export function useDraftFromUrl() {
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

  if (title || url || body || nsfw) {
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
  }

  return {
    draft,
    reset: () =>
      titleParam
        .remove()
        .and(urlParam.remove)
        .and(bodyParam.remove)
        .and(nsfwParam.remove),
  };
}

export function useDraftEditorState() {
  const [fallbackUuid, setFallbackUuid] = useState(uuid());

  const initDraft = useDraftFromUrl();
  const draftIdParam = useDraftIdUrlParam();

  const draftId = useCreatePostStore((s) => {
    if (!isEmptyDraft(initDraft.draft)) {
      return fallbackUuid;
    }

    if (_.isString(draftIdParam.value)) {
      return draftIdParam.value;
    }
    const [firstKey] = _.entries(s.drafts).sort(
      ([_a, a], [_b, b]) => b.createdAt - a.createdAt,
    );

    return firstKey?.[0] ?? fallbackUuid;
  });

  const draft =
    useCreatePostStore((s) => {
      return s.drafts[draftId];
    }) ?? initDraft.draft;

  const _patchDraft = useCreatePostStore((s) => s.updateDraft);
  const patchDraft = (key: string, patch: Partial<Draft>) => {
    _patchDraft(key, {
      ...initDraft.draft,
      ...patch,
    });
    initDraft.reset();
  };

  return {
    draftId,
    draft,
    patchDraft,
    reset: () => setFallbackUuid(uuid()),
  };
}
