'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { UserDto } from '@/lib/auth-api';
import { authApi } from '@/lib/auth-api';
import { setTokenGetter } from '@/lib/api-client';

interface AuthState {
  user: UserDto | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // Actions
  setAuth: (user: UserDto, accessToken: string) => void;
  clearAuth: () => void;
  refreshToken: () => Promise<void>;
  logout: () => Promise<void>;
  fetchMe: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isLoading: false,

      setAuth: (user, accessToken) => {
        set({ user, accessToken, isAuthenticated: true });
      },

      clearAuth: () => {
        set({ user: null, accessToken: null, isAuthenticated: false });
      },

      refreshToken: async () => {
        try {
          const { accessToken } = await authApi.refresh();
          set({ accessToken });
        } catch {
          get().clearAuth();
        }
      },

      logout: async () => {
        const { accessToken } = get();
        if (accessToken) {
          try {
            await authApi.logout(accessToken);
          } catch {
            // ignore — still clear local state
          }
        }
        get().clearAuth();
      },

      fetchMe: async () => {
        set({ isLoading: true });
        try {
          const user = await authApi.me();
          set({ user, isAuthenticated: true, isLoading: false });
        } catch {
          get().clearAuth();
          set({ isLoading: false });
        }
      },
    }),
    {
      name: 'pixjob-auth',
      storage: createJSONStorage(() => sessionStorage),
      // Only persist user info — access token lives in memory only for security
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
    },
  ),
);

// Wire the token getter into apiClient (called once at app boot in the provider)
export function initAuthStore(): void {
  setTokenGetter(() => useAuthStore.getState().accessToken);
}
