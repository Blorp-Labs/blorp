import { useRef } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router";

const getQueryClient = () =>
  new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

export function PerfProviders({ children }: { children: React.ReactNode }) {
  const queryClient = useRef(getQueryClient()).current;
  return (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  );
}
