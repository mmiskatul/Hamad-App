import { QueryClient } from '@tanstack/react-query';

/*
 * App-wide TanStack Query client (project rule: server state → TanStack Query).
 * A single instance is created here and mounted once via QueryClientProvider in
 * the root layout, so every feature's queries/mutations share one cache.
 *
 * Defaults are intentionally conservative for a mobile app: one retry (mobile
 * networks blip), and a 30s staleTime so screens re-focusing don't refetch on
 * every navigation. Tune per-query where a screen needs different behaviour.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
    mutations: {
      retry: 0,
    },
  },
});

export default queryClient;
