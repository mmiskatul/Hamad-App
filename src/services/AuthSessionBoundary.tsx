import { useEffect } from 'react';
import { useRouter } from 'expo-router';

import { queryClient } from '@/shared/api/queryClient';
import { subscribeAuthSessionInvalidation } from '@/shared/auth';
import { clearAccountCaches } from './logout';

/** Redirects out of authenticated routes when the backend rejects the session. */
export default function AuthSessionBoundary(): null {
  const router = useRouter();

  useEffect(
    () =>
      subscribeAuthSessionInvalidation(() => {
        clearAccountCaches();
        queryClient.clear();
        router.replace('/login');
      }),
    [router],
  );

  return null;
}
