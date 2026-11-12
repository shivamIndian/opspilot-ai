import { useAuthStore } from '@/store/useAuthStore';

export const useAuth = () => {
  const user = useAuthStore(state => state.user);
  const accessToken = useAuthStore(state => state.accessToken);
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  const isLoading = useAuthStore(state => state.isLoading);
  const setAuth = useAuthStore(state => state.setAuth);
  const clearAuth = useAuthStore(state => state.clearAuth);
  const initAuth = useAuthStore(state => state.initAuth);
  const logout = useAuthStore(state => state.logout);
  const logoutAll = useAuthStore(state => state.logoutAll);

  return {
    user,
    accessToken,
    isAuthenticated,
    isLoading,
    setAuth,
    clearAuth,
    initAuth,
    logout,
    logoutAll,
  };
};
