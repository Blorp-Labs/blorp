import { QueryClient } from "@tanstack/react-query";
import { MAX_CACHE_MS } from "../stores/config";
import { Errors } from "../apis/api-blueprint";

export function compareErrors(err: Error, key: keyof typeof Errors) {
  const target = Errors[key].message;
  return err.name === target || err.message === target;
}

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
