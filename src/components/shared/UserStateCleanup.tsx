'use client';

import { useEffect, useRef } from 'react';
import { useSession } from '@/lib/auth-client';
import { clearHireLoopBrowserState, clearLegacyHireLoopState } from '@/lib/user-storage';

export default function UserStateCleanup() {
  const { data: session, isPending } = useSession();
  const previousUserId = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    if (isPending) return;
    const userId = session?.user.id || null;
    if (previousUserId.current === undefined) {
      previousUserId.current = userId;
      if (userId) clearLegacyHireLoopState();
      else clearHireLoopBrowserState();
      return;
    }
    if (previousUserId.current !== userId) {
      clearHireLoopBrowserState();
      previousUserId.current = userId;
    }
  }, [isPending, session?.user.id]);

  return null;
}
