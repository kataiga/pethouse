import { QueryClient } from '@tanstack/react-query';

/** The app is online only: no persistence, one retry, short freshness. */
export function createQueryClient (): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: 1,
        staleTime: 30_000,
      },
    },
  });
}
