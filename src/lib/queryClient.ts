import { QueryClient } from '@tanstack/react-query';

/**
 * Single shared QueryClient instance.
 * Exported so the auth layer can clear the cache when the signed-in user
 * changes, preventing cross-account data leaks via stale cached queries.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: 'always',
      retry: 1,
    },
  },
});