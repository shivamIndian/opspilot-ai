import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10 * 1000, // 10 seconds
      gcTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false,
      retry: (failureCount, error: any) => {
        // Do not retry 401, 403, 404 client errors
        const status = error?.response?.status;
        if (status === 401 || status === 403 || status === 404) {
          return false;
        }
        return failureCount < 2;
      },
    },
  },
});

/**
 * Invalidate and clear organization-specific queries upon organization switch or logout.
 */
export const invalidateOrganizationQueries = async (organizationId?: string): Promise<void> => {
  if (organizationId) {
    await queryClient.invalidateQueries({ queryKey: [organizationId] });
    queryClient.removeQueries({ queryKey: [organizationId] });
  } else {
    // Clear all server state queries upon sign-out
    queryClient.clear();
  }
};
