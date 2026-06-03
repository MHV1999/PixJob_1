'use client';

import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { initAuthStore, useAuthStore } from '@/stores/auth.store';

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps): ReactNode {
  useEffect(() => {
    // Wire apiClient token getter
    initAuthStore();

    // If we have a persisted session, refresh the access token silently
    const { isAuthenticated, refreshToken } = useAuthStore.getState();
    if (isAuthenticated) {
      void refreshToken();
    }
  }, []);

  return <>{children}</>;
}
