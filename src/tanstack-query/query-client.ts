import { QueryClient } from "@tanstack/react-query";
import { MAX_CACHE_MS } from "../stores/config";
import { compareErrors } from "../lib/api/adapters/api-blueprint";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: MAX_CACHE_MS,
      refetchOnReconnect: true,
      refetchOnWindowFocus: false,
      networkMode: "online",
      retry: (count, err) => {
        if (err instanceof Error && compareErrors(err, "OBJECT_NOT_FOUND")) {
          return false;
        }
        return count <= 3;
      },
    },
  },
});
