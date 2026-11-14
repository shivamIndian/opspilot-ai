import { create } from 'zustand';
import type { SafeUser, AuthResponseData } from '@/types/auth';
import { authService } from '@/services/authService';
import { setAuthHandlers } from '@/services/api';
import { useOrganizationStore } from './useOrganizationStore';
import { queryClient } from '@/app/query-client';

interface AuthState {
  user: SafeUser | null;
  accessToken: string | null;
  csrfToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setAuth: (data: AuthResponseData) => void;
  setUser: (user: SafeUser) => void;
  clearAuth: () => void;
  initAuth: () => Promise<void>;
  logout: () => Promise<void>;
  logoutAll: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => {
  // Hook up interceptor callbacks
  setAuthHandlers({
    getAccessToken: () => get().accessToken,
    getCsrfToken: () => get().csrfToken,
    onAuthFailure: () => {
      if (typeof localStorage !== 'undefined') {
        try {
          localStorage.removeItem('opspilot_csrf_token');
        } catch {}
      }
      set({
        user: null,
        accessToken: null,
        csrfToken: null,
        isAuthenticated: false,
        isLoading: false,
      });
    },
    onAuthRefreshSuccess: (data: AuthResponseData) => {
      if (data.csrfToken && typeof localStorage !== 'undefined') {
        try {
          localStorage.setItem('opspilot_csrf_token', data.csrfToken);
        } catch {}
      }
      set({
        accessToken: data.accessToken,
        csrfToken: data.csrfToken,
        isAuthenticated: true,
      });
    },
  });

  return {
    user: null,
    accessToken: null,
    csrfToken: null,
    isAuthenticated: false,
    isLoading: true, // starts loading while initializing

    setAuth: (data: AuthResponseData) => {
      if (data.csrfToken && typeof localStorage !== 'undefined') {
        try {
          localStorage.setItem('opspilot_csrf_token', data.csrfToken);
        } catch {}
      }
      set({
        user: data.user || get().user,
        accessToken: data.accessToken,
        csrfToken: data.csrfToken,
        isAuthenticated: true,
        isLoading: false,
      });
    },

    setUser: (user: SafeUser) => {
      set({ user });
    },

    clearAuth: () => {
      if (typeof localStorage !== 'undefined') {
        try {
          localStorage.removeItem('opspilot_csrf_token');
        } catch {}
      }
      set({
        user: null,
        accessToken: null,
        csrfToken: null,
        isAuthenticated: false,
        isLoading: false,
      });
      try {
        useOrganizationStore.getState().clearStore();
        queryClient.clear();
      } catch {
        // Safe fallback in isolated test environments
      }
    },

    initAuth: async () => {
      set({ isLoading: true });
      try {
        const cachedCsrf =
          get().csrfToken ||
          (typeof localStorage !== 'undefined'
            ? localStorage.getItem('opspilot_csrf_token')
            : null);
        // Attempt silent refresh using HttpOnly cookie + CSRF synchronizer token
        const refreshData = await authService.refresh(cachedCsrf);
        if (refreshData.csrfToken && typeof localStorage !== 'undefined') {
          try {
            localStorage.setItem('opspilot_csrf_token', refreshData.csrfToken);
          } catch {}
        }
        set({
          accessToken: refreshData.accessToken,
          csrfToken: refreshData.csrfToken,
          isAuthenticated: true,
        });

        // Fetch current profile with fresh access token
        const meRes = await authService.getMe();
        set({
          user: meRes.user,
          isLoading: false,
        });
      } catch {
        // No valid session cookie found -> safe unauthenticated state
        if (typeof localStorage !== 'undefined') {
          try {
            localStorage.removeItem('opspilot_csrf_token');
          } catch {}
        }
        set({
          user: null,
          accessToken: null,
          csrfToken: null,
          isAuthenticated: false,
          isLoading: false,
        });
      }
    },

    logout: async () => {
      try {
        await authService.logout();
      } finally {
        get().clearAuth();
      }
    },

    logoutAll: async () => {
      try {
        await authService.logoutAll();
      } finally {
        get().clearAuth();
      }
    },
  };
});
