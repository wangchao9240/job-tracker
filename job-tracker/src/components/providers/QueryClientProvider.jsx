"use client";

import { QueryClient, QueryClientProvider as TanstackQueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

/**
 * QueryClient provider for React Query
 * Provides caching, retries, and background refetch for server state
 */
export function QueryClientProvider({ children }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60 * 5, // 5 minutes
            cacheTime: 1000 * 60 * 10, // 10 minutes
            retry: 1,
            refetchOnWindowFocus: false,
          },
          mutations: {
            retry: 0,
          },
        },
      })
  );

  return <TanstackQueryClientProvider client={queryClient}>{children}</TanstackQueryClientProvider>;
}
