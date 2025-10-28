import { QueryClient } from "@tanstack/react-query";
import { MAX_CACHE_MS } from "../stores/config";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: MAX_CACHE_MS,
      refetchOnReconnect: true,
      refetchOnWindowFocus: false,
      networkMode: "online",
    },
  },
});
