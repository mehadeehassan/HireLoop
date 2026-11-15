import { cache } from 'react';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { timeSessionLookup } from '@/lib/request-performance';

export const getDashboardSession = cache(async () => {
  const requestHeaders = await headers();
  const session = await timeSessionLookup(
    'getDashboardSession',
    () => auth.api.getSession({ headers: requestHeaders }),
  );
  return session;
});
