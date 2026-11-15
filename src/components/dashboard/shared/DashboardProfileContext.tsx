'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { DashboardRole } from './DashboardTypes';

export type DashboardProfile = {
  name: string;
  recruiterName: string;
  plan: string;
  image: string;
};

type DashboardProfileContextValue = {
  profile: DashboardProfile | null;
};

const DashboardProfileContext = createContext<DashboardProfileContextValue | null>(null);

export function DashboardProfileProvider({
  role,
  children,
}: {
  role: DashboardRole;
  children: ReactNode;
}) {
  const [profile, setProfile] = useState<DashboardProfile | null>(null);
  const controllerRef = useRef<AbortController | null>(null);

  const loadProfile = useCallback(async (): Promise<DashboardProfile | null> => {
    if (role !== 'recruiter' && role !== 'seeker') return null;
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;

    try {
      const response = await fetch(
        role === 'recruiter' ? '/api/recruiter/profile' : '/api/seeker/profile',
        { cache: 'no-store', signal: controller.signal },
      );
      if (!response.ok) throw new Error(`Could not load ${role} profile`);
      const value: unknown = await response.json();
      const data = typeof value === 'object' && value !== null
        ? value as Record<string, unknown>
        : {};
      if (controller.signal.aborted) return null;
      return {
        name: typeof data.name === 'string' ? data.name : '',
        recruiterName: typeof data.recruiterName === 'string' ? data.recruiterName : '',
        plan: typeof data.plan === 'string' ? data.plan : 'Starter',
        image: typeof data.image === 'string' ? data.image : '',
      };
    } catch (error) {
      if (controller.signal.aborted) return null;
      console.error(`Could not load ${role} dashboard profile`, error);
      return null;
    }
  }, [role]);

  useEffect(() => {
    if (role !== 'recruiter' && role !== 'seeker') return;
    const updateEvent = role === 'recruiter' ? 'recruiter-profile-updated' : 'seeker-profile-updated';
    const handleProfileUpdate = () => {
      void loadProfile().then((nextProfile) => {
        if (nextProfile) setProfile(nextProfile);
      });
    };
    handleProfileUpdate();
    window.addEventListener(updateEvent, handleProfileUpdate);
    return () => {
      window.removeEventListener(updateEvent, handleProfileUpdate);
      controllerRef.current?.abort();
      controllerRef.current = null;
    };
  }, [loadProfile, role]);

  const value = useMemo(() => ({ profile }), [profile]);
  return <DashboardProfileContext.Provider value={value}>{children}</DashboardProfileContext.Provider>;
}

export function useDashboardProfile() {
  return useContext(DashboardProfileContext)?.profile ?? null;
}
