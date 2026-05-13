import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
} from "react";
import { AsyncBatcher } from "@tanstack/pacer";
import _ from "lodash";
import { useAuth } from "@/src/stores/auth";
import { usePostsStore, usePostFromStore } from "@/src/stores/posts";
import { useSettingsStore } from "@/src/stores/settings";
import { apiClient } from "@/src/apis/client";

type Item = {
  accountUuid: string;
  postId: number;
  apId: string;
};

const BATCH_MAX_SIZE = 10;
const BATCH_WAIT_MS = 3000;

type Ctx = AsyncBatcher<Item>;

const MarkReadOnScrollContext = createContext<Ctx | null>(null);

async function flushBatch(items: Item[]) {
  const groups = _.groupBy(items, (i) => i.accountUuid);
  const auth = useAuth.getState();
  const { patchPost } = usePostsStore.getState();

  await Promise.all(
    Object.entries(groups).map(async ([uuid, group]) => {
      const account = auth.accounts.find((a) => a.uuid === uuid);
      if (!account || !account.jwt) {
        return;
      }
      const prefix = auth.getCachePrefixer(account);
      try {
        const api = await apiClient({
          instance: account.instance,
          jwt: account.jwt,
        });
        await api.markPostRead({
          postIds: group.map((i) => i.postId),
          read: true,
        });
        for (const item of group) {
          patchPost(item.apId, prefix, {
            optimisticRead: undefined,
            read: true,
          });
        }
      } catch (err) {
        console.warn("markPostRead batch failed", err);
        for (const item of group) {
          patchPost(item.apId, prefix, { optimisticRead: undefined });
        }
      }
    }),
  );
}

export function MarkReadOnScrollProvider({
  children,
}: {
  children: ReactNode;
}) {
  const batcher = useMemo(
    () =>
      new AsyncBatcher<Item>(flushBatch, {
        maxSize: BATCH_MAX_SIZE,
        wait: BATCH_WAIT_MS,
        onError: (err) => {
          console.warn("mark-read batcher error", err);
        },
      }),
    [],
  );

  return (
    <MarkReadOnScrollContext.Provider value={batcher}>
      {children}
    </MarkReadOnScrollContext.Provider>
  );
}

export function useMarkReadOnView(apId: string | undefined) {
  const batcher = useContext(MarkReadOnScrollContext);
  const enabled = useSettingsStore((s) => s.markReadOnScroll);
  const post = usePostFromStore(apId);
  const accountUuid = useAuth((s) => s.getSelectedAccount().uuid);
  const isLoggedIn = useAuth((s) => !!s.getSelectedAccount().jwt);

  const postId = post?.id;
  const isUnread = !!post && !post.read && !post.optimisticRead;
  const patchPost = usePostsStore((s) => s.patchPost);
  const getPrefixer = useAuth((s) => s.getCachePrefixer);

  useEffect(() => {
    if (
      !apId ||
      !enabled ||
      !batcher ||
      !isLoggedIn ||
      !isUnread ||
      postId === undefined
    ) {
      return;
    }
    patchPost(apId, getPrefixer(), { optimisticRead: true });
    batcher.addItem({ accountUuid, postId, apId });
  }, [
    enabled,
    batcher,
    isLoggedIn,
    isUnread,
    postId,
    apId,
    accountUuid,
    patchPost,
    getPrefixer,
  ]);
}
