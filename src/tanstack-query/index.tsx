import {
  PersistedClient,
  Persister,
  PersistQueryClientProvider,
} from "@tanstack/react-query-persist-client";
import _ from "lodash";
import { createDb } from "@/src/lib/create-storage";
import pRetry from "p-retry";
import { broadcastQueryClient } from "@tanstack/query-broadcast-client-experimental";
import { MAX_CACHE_MS } from "@/src/stores/config";
import { queryClient } from "./query-client";

// List the last reason for bumping the key:
// Caching creator profiles when fetching comments
const REACT_QUERY_CACHE_VERSON = 10;

function pruneInfinitePages(client: PersistedClient): PersistedClient {
  const cacheState = client.clientState;
  return {
    ...client,
    clientState: {
      ...cacheState,
      queries: cacheState.queries.map((q: any) => {
        const data = q.state.data;
        if (
          data &&
          typeof data === "object" &&
          Array.isArray(data.pages) &&
          Array.isArray(data.pageParams)
        ) {
          return {
            ...q,
            state: {
              ...q.state,
              data: {
                pages: data.pages.slice(0, 3),
                pageParams: data.pageParams.slice(0, 3),
              },
            },
          };
        }
        return q;
      }),
    },
  };
}

const db = createDb("react-query");
const persister: Persister = {
  persistClient: async (client) => {
    await db.setItem(
      "react-query-cache",
      JSON.stringify(pruneInfinitePages(client)),
    );
  },
  restoreClient: async () => {
    const cache = await pRetry(() => db.getItem("react-query-cache"), {
      retries: 3,
    });
    return cache ? JSON.parse(cache) : undefined;
  },
  removeClient: async () => {
    await db.removeItem("react-query-cache");
  },
};

// Enable multi-tab synchronization
broadcastQueryClient({
  queryClient,
  broadcastChannel: "react-query-sync",
});

export function TanstackQueryProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        maxAge: MAX_CACHE_MS,
        buster: String(REACT_QUERY_CACHE_VERSON),
      }}
    >
      {children}
    </PersistQueryClientProvider>
  );
}
